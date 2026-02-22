/**
 * Validator Agent - Validates generated quiz questions for quality and accuracy.
 * Accumulates valid questions across retries and calculates the deficit for the
 * question generator to fill on the next pass.
 */

import { ChatOpenAI } from "@langchain/openai";
import { QuizGenerationState, Question, ValidationResult } from "../../types/quiz.types";
import { createLogger } from '../../utils/logger';
import { OVER_GENERATE_COUNT } from './quiz.constants';

const logger = createLogger('QUESTION-VALIDATOR');

export class ValidatorAgent {
    private llm: ChatOpenAI;

    constructor() {
        this.llm = new ChatOpenAI({
            model: "gpt-4o-mini",
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
                const needsRegeneration = deficit > 0 && state.retryCount < 2;
                return {
                    validationResults: [],
                    needsRegeneration,
                    retryCount: needsRegeneration ? state.retryCount + 1 : state.retryCount,
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

            if (!contextText) {
                logger.warn('No contextText available — skipping LLM validation, assuming all questions valid');
                const previousValid: Question[] = state.metadata?.validQuestions ?? [];
                const allValid = [...previousValid, ...state.questions];
                return {
                    questions: allValid,
                    validationResults: state.questions.map(q => ({
                        questionId: q.id,
                        isValid: true,
                        issues: ['Validation skipped: no source context available'],
                    })),
                    needsRegeneration: false,
                    metadata: {
                        ...state.metadata,
                        validationTime: Date.now() - startTime,
                        validQuestions: allValid,
                        deficit: 0,
                    },
                };
            }

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
            difficulty: q.difficulty,
        })), null, 2);

        return `You are a quiz quality validator for a knowledge evaluation platform. Validate the following quiz questions against the source material.

Source Material:
${contextText.substring(0, 6000)}

Questions to Validate:
${questionsJson}

For each question, check ALL of the following:
1. CLARITY: Is the question clear, unambiguous, and grammatically correct?
2. FACTUAL ACCURACY: Is the correct answer (at correctIndex) actually correct based on the source material?
3. DISTRACTOR QUALITY: Are wrong answers plausible misconceptions rather than obviously incorrect? Fail if any distractor is self-evidently impossible or trivially distinguishable from the correct answer.
4. TRUE/FALSE VALIDITY: For true_false — is the statement definitively and unambiguously true or false based on the source? Mark invalid if nuanced, context-dependent, or debatable.
5. MULTIPLE CHOICE FORMAT: For multiple_choice — are there exactly 4 distinct options with no duplicates?
6. COGNITIVE DEPTH: Is this question above the trivial recall level? Mark invalid if the question is directly answered by reading a single sentence from the source with no reasoning required. Examples of invalid trivial questions: "What is the definition of X?", "What is X?", "Which of the following defines X?". Questions requiring scenario interpretation, application, or multi-step reasoning are valid.
7. DIFFICULTY LABEL ACCURACY: Does the "difficulty" field match the cognitive level of the question? "recall" = direct fact lookup, "understand" = explain/describe, "apply" = use in a new situation, "analyze" = compare/contrast/cause-effect. Mark invalid if clearly mislabeled (e.g., a scenario-based application question labeled "recall").

A question is INVALID if it fails any one of these seven checks.

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
    "issues": ["Check 6 failed: Question is trivial recall — answerable by reading one sentence without reasoning", "Check 3 failed: Option B is self-evidently impossible"]
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
