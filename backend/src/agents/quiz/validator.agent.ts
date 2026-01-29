/**
 * Validator Agent - Validates generated quiz questions for quality and accuracy
 */

import { ChatOpenAI } from "@langchain/openai";
import { QuizGenerationState, Question, ValidationResult } from "../../types/quiz.types";
import { createLogger } from '../../utils/logger';

const logger = createLogger('QUESTION-VALIDATOR');

export class ValidatorAgent {
    private llm: ChatOpenAI;

    constructor() {
        this.llm = new ChatOpenAI({
            modelName: "gpt-4o-mini",
            temperature: 0.1, // Very deterministic for validation
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Validate generated questions
     */
    async execute(state: QuizGenerationState): Promise<Partial<QuizGenerationState>> {
        const startTime = Date.now();
        logger.info(`Validating ${state.questions.length} questions...`);

        try {
            if (state.questions.length === 0) {
                logger.warn('No questions to validate');
                return {
                    validationResults: [],
                    needsRegeneration: true,
                    metadata: {
                        ...state.metadata,
                        validationTime: Date.now() - startTime
                    }
                };
            }

            // Get chunk text for fact-checking
            const chunks = (state.metadata as any).chunks || [];
            const contextText = chunks
                .slice(0, 10)
                .map((c: any) => c.chunkText)
                .join('\n\n');

            const prompt = this.buildPrompt(state.questions, contextText);
            
            const response = await this.llm.invoke(prompt);
            const content = response.content.toString();

            // Parse validation results
            const validationResults = this.parseValidationResults(content, state.questions);
            
            // Filter out invalid questions
            const validQuestions = state.questions.filter(q => {
                const result = validationResults.find(r => r.questionId === q.id);
                return result?.isValid !== false;
            });

            // Determine if we need regeneration
            const invalidCount = state.questions.length - validQuestions.length;
            const needsRegeneration = validQuestions.length < state.numQuestions && 
                                       state.retryCount < 2;

            const elapsed = Date.now() - startTime;
            logger.info(`Validation complete in ${elapsed}ms: ${validQuestions.length}/${state.questions.length} valid`);

            if (invalidCount > 0) {
                logger.warn(`Filtered out ${invalidCount} invalid questions`);
            }

            return {
                questions: validQuestions,
                validationResults,
                needsRegeneration,
                retryCount: needsRegeneration ? state.retryCount + 1 : state.retryCount,
                metadata: {
                    ...state.metadata,
                    validationTime: elapsed,
                    invalidCount
                }
            };

        } catch (error: any) {
            logger.error(`Error validating questions: ${error.message}`);
            // On validation error, keep all questions but mark for potential review
            return {
                validationResults: state.questions.map(q => ({
                    questionId: q.id,
                    isValid: true, // Assume valid if validation fails
                    issues: ['Validation skipped due to error']
                })),
                needsRegeneration: false,
                metadata: {
                    ...state.metadata,
                    validationError: error.message
                }
            };
        }
    }

    private buildPrompt(questions: Question[], contextText: string): string {
        const questionsJson = JSON.stringify(questions.map((q, i) => ({
            index: i,
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex
        })), null, 2);

        return `You are a quiz quality validator. Validate the following quiz questions against the source material.

Source Material:
${contextText.substring(0, 6000)}

Questions to Validate:
${questionsJson}

For each question, check:
1. Is the question clear and grammatically correct?
2. Is the correct answer (at correctIndex) actually correct based on the source?
3. Are the wrong answers (distractors) clearly incorrect?
4. For true_false: Is the statement definitively true or false (not ambiguous)?
5. For multiple_choice: Are there exactly 4 distinct options?

Output EXACTLY in this JSON format:
[
  {
    "id": "question-id-here",
    "isValid": true,
    "issues": []
  },
  {
    "id": "question-id-here",
    "isValid": false,
    "issues": ["The correct answer is actually incorrect", "Option B and C are too similar"]
  }
]

Output ONLY the JSON array:`;
    }

    private parseValidationResults(response: string, questions: Question[]): ValidationResult[] {
        try {
            // Extract JSON from response
            let jsonStr = response;
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);
            
            if (!Array.isArray(parsed)) {
                // Return all as valid if parsing fails
                return questions.map(q => ({
                    questionId: q.id,
                    isValid: true,
                    issues: []
                }));
            }

            // Map parsed results to ValidationResult type
            return parsed.map((item: any) => ({
                questionId: item.id || '',
                isValid: item.isValid !== false,
                issues: Array.isArray(item.issues) ? item.issues : [],
                suggestions: item.suggestions
            }));

        } catch (error: any) {
            logger.error(`Failed to parse validation JSON: ${error.message}`);
            // Return all as valid on parse error
            return questions.map(q => ({
                questionId: q.id,
                isValid: true,
                issues: ['Validation parsing failed']
            }));
        }
    }
}

// Export function for LangGraph node
export async function validatorAgent(state: QuizGenerationState): Promise<Partial<QuizGenerationState>> {
    const agent = new ValidatorAgent();
    return await agent.execute(state);
}
