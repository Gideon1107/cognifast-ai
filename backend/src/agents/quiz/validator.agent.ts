/**
 * Validator Agent - Validates generated quiz questions for quality and accuracy.
 * Accumulates valid questions across retries and calculates the deficit for the
 * question generator to fill on the next pass.
 */

import { ChatOpenAI } from "@langchain/openai";
import { QuizGenerationState, Question, ValidationResult } from "../../types/quiz.types";
import { createLogger } from '../../utils/logger';

const logger = createLogger('QUESTION-VALIDATOR');

/** Over-generate buffer (must match question-generator) */
const OVER_GENERATE_COUNT = 3;

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
                const previousValid: Question[] = state.metadata?.validQuestions ?? [];
                const target = state.numQuestions + OVER_GENERATE_COUNT;
                const deficit = Math.max(0, target - previousValid.length);
                return {
                    validationResults: [],
                    needsRegeneration: deficit > 0 && state.retryCount < 2,
                    retryCount: state.retryCount + 1,
                    metadata: {
                        ...state.metadata,
                        validationTime: Date.now() - startTime,
                        validQuestions: previousValid,
                        deficit,
                    },
                };
            }

            // Use the pre-built contextText (same context the generator saw)
            const contextText = state.metadata?.contextText || '';

            const prompt = this.buildPrompt(state.questions, contextText);

            const response = await this.llm.invoke(prompt);
            const content = response.content.toString();

            // Parse validation results
            const validationResults = this.parseValidationResults(content, state.questions);

            // Separate valid and invalid questions from this batch
            const validBatch = state.questions.filter(q => {
                const result = validationResults.find(r => r.questionId === q.id);
                return result?.isValid !== false;
            });
            const invalidCount = state.questions.length - validBatch.length;

            // Accumulate valid questions across retries
            const previousValid: Question[] = state.metadata?.validQuestions ?? [];
            const allValid = [...previousValid, ...validBatch];

            // How many more do we need? (target = numQuestions + over-generate buffer)
            const target = state.numQuestions + OVER_GENERATE_COUNT;
            const deficit = Math.max(0, target - allValid.length);

            const needsRegeneration = deficit > 0 && state.retryCount < 2;

            const elapsed = Date.now() - startTime;
            logger.info(
                `Validation complete in ${elapsed}ms: ${validBatch.length}/${state.questions.length} valid this batch, ` +
                `${allValid.length} total accumulated, deficit=${deficit}`
            );

            if (invalidCount > 0) {
                logger.warn(`Filtered out ${invalidCount} invalid questions`);
            }

            return {
                // On retry the generator will produce new questions into state.questions;
                // valid ones from THIS batch are stashed in metadata.validQuestions.
                questions: needsRegeneration ? [] : allValid,
                validationResults,
                needsRegeneration,
                retryCount: needsRegeneration ? state.retryCount + 1 : state.retryCount,
                metadata: {
                    ...state.metadata,
                    validationTime: elapsed,
                    invalidCount,
                    validQuestions: allValid,
                    deficit,
                },
            };
        } catch (error: any) {
            logger.error(`Error validating questions: ${error.message}`);
            // On validation error, keep all questions but mark for potential review
            const previousValid: Question[] = state.metadata?.validQuestions ?? [];
            const allValid = [...previousValid, ...state.questions];
            return {
                questions: allValid,
                validationResults: state.questions.map(q => ({
                    questionId: q.id,
                    isValid: true, // Assume valid if validation fails
                    issues: ['Validation skipped due to error'],
                })),
                needsRegeneration: false,
                metadata: {
                    ...state.metadata,
                    validationError: error.message,
                    validQuestions: allValid,
                    deficit: 0,
                },
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
            correctIndex: q.correctIndex,
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
            let jsonStr = response;
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);

            if (!Array.isArray(parsed)) {
                return questions.map(q => ({
                    questionId: q.id,
                    isValid: true,
                    issues: [],
                }));
            }

            return parsed.map((item: any) => ({
                questionId: item.id || '',
                isValid: item.isValid !== false,
                issues: Array.isArray(item.issues) ? item.issues : [],
                suggestions: item.suggestions,
            }));
        } catch (error: any) {
            logger.error(`Failed to parse validation JSON: ${error.message}`);
            return questions.map(q => ({
                questionId: q.id,
                isValid: true,
                issues: ['Validation parsing failed'],
            }));
        }
    }
}

// Export function for LangGraph node
export async function validatorAgent(state: QuizGenerationState): Promise<Partial<QuizGenerationState>> {
    const agent = new ValidatorAgent();
    return await agent.execute(state);
}
