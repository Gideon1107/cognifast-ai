import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { QuizGenerationState, Question, ValidationResult } from '../types/quiz.types';
import { conceptExtractorAgent } from '../agents/quiz/concept-extractor.agent';
import { questionGeneratorAgent } from '../agents/quiz/question-generator.agent';
import { validatorAgent } from '../agents/quiz/validator.agent';
import { createLogger } from '../utils/logger';

const logger = createLogger('QUIZ-GRAPH');

/**
 * Quiz Generation StateGraph
 * 
 * Flow:
 * START → ConceptExtractor → QuestionGenerator → Validator → END (or retry Generator)
 * 
 * Nodes:
 * - conceptExtractor: Extracts key concepts from document chunks
 * - questionGenerator: Creates quiz questions from concepts
 * - validator: Validates questions for quality and accuracy
 * 
 * Edges:
 * - ConceptExtractor → QuestionGenerator (always)
 * - QuestionGenerator → Validator (always)
 * - Validator → QuestionGenerator (if needsRegeneration and retries < max)
 * - Validator → END (if valid or max retries reached)
 */

// Define the state annotation
const QuizStateAnnotation = Annotation.Root({
    conversationId: Annotation<string>,
    sourceIds: Annotation<string[]>,
    numQuestions: Annotation<number>,
    concepts: Annotation<string[]>,
    questions: Annotation<Question[]>,
    validationResults: Annotation<ValidationResult[]>,
    needsRegeneration: Annotation<boolean>,
    retryCount: Annotation<number>,
    metadata: Annotation<Record<string, any>>
});

// Define the graph
const quizGraphBuilder = new StateGraph(QuizStateAnnotation);

// Add nodes
quizGraphBuilder.addNode('conceptExtractor' as any, conceptExtractorAgent as any);
quizGraphBuilder.addNode('questionGenerator' as any, questionGeneratorAgent as any);
quizGraphBuilder.addNode('validator' as any, validatorAgent as any);

// Set entry point: START → ConceptExtractor
quizGraphBuilder.addEdge(START, 'conceptExtractor' as any);

// ConceptExtractor → QuestionGenerator
quizGraphBuilder.addEdge('conceptExtractor' as any, 'questionGenerator' as any);

// QuestionGenerator → Validator
quizGraphBuilder.addEdge('questionGenerator' as any, 'validator' as any);

// Validator → END or QuestionGenerator (retry)
quizGraphBuilder.addConditionalEdges(
    'validator' as any,
    (state: any) => {
        const MAX_RETRIES = 2;
        
        if (state.needsRegeneration && state.retryCount < MAX_RETRIES) {
            logger.info(`Regenerating questions (attempt ${state.retryCount + 1}/${MAX_RETRIES})`);
            return 'questionGenerator';
        }
        
        if (state.questions.length === 0) {
            logger.warn('No valid questions generated after all attempts');
        } else {
            logger.info(`Quiz generation complete: ${state.questions.length} questions`);
        }
        
        return END;
    }
);

// Compile the graph
export const quizGenerationGraph = quizGraphBuilder.compile();

/**
 * Execute the quiz generation graph
 * 
 * @param initialState - The initial generation state with chunks in metadata
 * @returns The final state with generated questions
 */
export async function executeQuizGenerationGraph(
    initialState: QuizGenerationState
): Promise<QuizGenerationState> {
    try {
        logger.info('Quiz Generation Graph Started');
        logger.info(`Conversation ID: ${initialState.conversationId}`);
        logger.info(`Source IDs: [${initialState.sourceIds.join(', ')}]`);
        logger.info(`Requested questions: ${initialState.numQuestions}`);
        
        const startTime = Date.now();
        
        // Execute the graph
        const result = await quizGenerationGraph.invoke(initialState);
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        // Update metadata
        const finalResult = {
            ...result,
            metadata: {
                ...result.metadata,
                startTime,
                endTime,
                executionTime
            }
        };
        
        logger.info(`Quiz Generation completed in ${executionTime}ms`);
        logger.info(`Generated ${finalResult.questions?.length || 0} questions`);
        
        return finalResult as QuizGenerationState;
        
    } catch (error: any) {
        logger.error(`Error executing quiz generation graph: ${error.message}`);
        throw new Error(`Quiz generation failed: ${error.message}`);
    }
}
