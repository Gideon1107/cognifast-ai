/**
 * Question Generator Agent - Extracts concepts AND generates quiz questions
 * On retry it only generates replacement questions for the deficit.
 */

import { ChatOpenAI } from "@langchain/openai";
import { QuizGenerationState, Question, QuestionType } from "../../types/quiz.types";
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../utils/logger';
import { OVER_GENERATE_COUNT } from './quiz.constants';

const logger = createLogger('QUESTION-GENERATOR');

export class QuestionGeneratorAgent {
    private llm: ChatOpenAI;

    constructor() {
        this.llm = new ChatOpenAI({
            model: "gpt-4o",
            temperature: 0.7, // Some creativity for variety
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Generate questions (and extract concepts on first run).
     * On retry, only generates replacement questions for the deficit.
     */
    async execute(state: QuizGenerationState): Promise<Partial<QuizGenerationState>> {
        const startTime = Date.now();
        const isRetry = state.retryCount > 0;
        const contextText = state.metadata?.contextText || '';

        if (!contextText) {
            logger.warn('No contextText in state metadata');
            return {
                questions: [],
                concepts: [],
                metadata: {
                    ...state.metadata,
                    questionGenerationTime: Date.now() - startTime,
                },
            };
        }

        try {
            if (isRetry) {
                // --- RETRY: generate only the deficit ---
                const deficit = state.metadata?.deficit ?? state.numQuestions;
                const coveredConcepts = (state.metadata?.validQuestions ?? []).map(q => q.concept);
                const toGenerate = deficit + OVER_GENERATE_COUNT;

                logger.info(`Retry ${state.retryCount}: generating ${toGenerate} replacement questions (deficit=${deficit})`);

                const prompt = this.buildRetryPrompt(
                    state.concepts,
                    coveredConcepts,
                    toGenerate,
                    contextText,
                );
                const response = await this.llm.invoke(prompt);
                const content = response.content.toString();
                const questions = this.parseQuestions(content, state.concepts);

                const elapsed = Date.now() - startTime;
                logger.info(`Retry generated ${questions.length} questions in ${elapsed}ms`);

                return {
                    questions,
                    metadata: {
                        ...state.metadata,
                        questionGenerationTime: elapsed,
                    },
                };
            }

            // --- FIRST RUN: extract concepts + generate questions in one call ---
            const toGenerate = state.numQuestions + OVER_GENERATE_COUNT;
            logger.info(`Generating ${toGenerate} questions (with concept extraction) from ${state.metadata.totalChunks} chunks...`);

            const prompt = this.buildCombinedPrompt(toGenerate, state.numQuestions, contextText);
            const response = await this.llm.invoke(prompt);
            const content = response.content.toString();

            // Parse combined response
            const { concepts, questions } = this.parseCombinedResponse(content);

            const elapsed = Date.now() - startTime;
            logger.info(`Extracted ${concepts.length} concepts and generated ${questions.length} questions in ${elapsed}ms`);

            return {
                concepts,
                questions,
                metadata: {
                    ...state.metadata,
                    questionGenerationTime: elapsed,
                },
            };
        } catch (error: any) {
            logger.error(`Error generating questions: ${error.message}`);
            return {
                questions: [],
                metadata: {
                    ...state.metadata,
                    error: error.message,
                },
            };
        }
    }

    // ---------------------------------------------------------------
    // Prompts
    // ---------------------------------------------------------------

    /**
     * extract concepts THEN generate questions in one call.
     */
    private buildCombinedPrompt(numQuestions: number, requestedQuestions: number, contextText: string): string {
        const numConcepts = Math.min(requestedQuestions * 2, 30);

        // Tentative counts using enforced minimums
        let recallCount      = Math.max(1, Math.floor(numQuestions * 0.20));
        let understandCount  = Math.max(1, Math.floor(numQuestions * 0.20));
        let applyCount       = Math.max(2, Math.floor(numQuestions * 0.30));
        let analyzeCount     = Math.max(1, Math.floor(numQuestions * 0.30));
        const integrationCount = Math.max(1, Math.floor(numQuestions * 0.15));

        // Enforce that the four Bloom buckets sum exactly to numQuestions
        let total = recallCount + understandCount + applyCount + analyzeCount;

        // Shed excess by decrementing above-minimum buckets in priority order
        while (total > numQuestions) {
            if      (applyCount > 2)      { applyCount--;      total--; }
            else if (analyzeCount > 1)    { analyzeCount--;    total--; }
            else if (understandCount > 1) { understandCount--; total--; }
            else if (recallCount > 1)     { recallCount--;     total--; }
            else break; // all at enforced minimums; fall through to second pass
        }

        // Second pass: enforced minimums sum > numQuestions (numQuestions < 5).
        // Relax buckets to 0, shedding lower Bloom levels first to preserve higher-order thinking.
        while (total > numQuestions) {
            if      (recallCount > 0)     { recallCount--;     total--; }
            else if (understandCount > 0) { understandCount--; total--; }
            else if (analyzeCount > 0)    { analyzeCount--;    total--; }
            else if (applyCount > 0)      { applyCount--;      total--; }
            else break;
        }

        // Absorb any shortfall into applyCount
        while (total < numQuestions) { applyCount++; total++; }

        return `You are an expert educator and psychometrician. Perform TWO tasks from the source material below.

SOURCE MATERIAL:
${contextText}

─── TASK 1: CONCEPT EXTRACTION ───
Extract the ${numConcepts} most important, quiz-worthy concepts.
- Each concept must be specific and testable, not vague or abstract.
- Each concept: a short name + brief description.

─── TASK 2: QUESTION GENERATION ───
Generate exactly ${numQuestions} high-quality quiz questions using Bloom's Taxonomy cognitive levels.

BLOOM'S TAXONOMY DISTRIBUTION — follow this exactly:
- L1 Recall (≤20%):     ${recallCount} question(s) — definitions and basic facts only. Permitted sparingly.
- L2 Understand (~20%): ${understandCount} question(s) — explain mechanisms, describe why something works.
- L3 Apply (~30%):      ${applyCount} question(s) — use knowledge in a new situation, solve a problem, predict an outcome.
- L4 Analyze (~30%):    ${analyzeCount} question(s) — compare/contrast, cause-and-effect, evaluate claims, explain relationships.

WHAT EACH LEVEL LOOKS LIKE:
L1 Recall: "Which of the following is the definition of X?" — Use sparingly.
L2 Understand: "Which of the following correctly describes how X works?" or "A student claims X causes Y. Which explanation best supports this?"
L3 Apply: "A researcher observes [scenario]. Which of the following best explains the result?" or "If [variable] were doubled, what would happen to [outcome]?"
L4 Analyze: "Which of the following correctly explains WHY X leads to Y?" or "What is the most significant difference between X and Y in how they affect [outcome]?"

PROHIBITED QUESTION PATTERNS — never generate these:
- "What is the definition of X?"
- "What is X?"
- "Which of the following defines X?"
- "True or False: X is defined as Y."
- Any question answerable by reading a single sentence from the source without reasoning.
More than ${recallCount} recall-level questions is a hard failure.

DISTRACTOR RULES — wrong answers must be sophisticated:
- Distractors must be plausible misconceptions, not obviously absurd.
- Each distractor must represent a real error a learner could make: a confusion between related concepts, an incorrect application of a correct principle, or a reversal of cause and effect.
- Never use "all of the above" or "none of the above."
- Never make one option dramatically shorter or longer than the others.
- Never use an option that is self-evidently impossible or logically absurd.

INTEGRATION: At least ${integrationCount} question(s) must require integrating knowledge from two or more concepts. These are typically L3 or L4.

ADDITIONAL RULES:
1. QUESTION VARIETY: Mix question stems — "which of the following...", "a researcher observes...", "if X is true, what follows...", "what is the most likely explanation for..."
2. ONE CONCEPT PER QUESTION (integration questions may touch two).
3. EQUATIONS AND FORMULAS: Include questions that require reasoning about equations where present. Use LaTeX: $CO_2$, $H_2O$, $\\frac{a}{b}$, $\\rightarrow$.
4. FORMAT: Prefer multiple_choice (4 options). Use true_false ONLY for statements that are definitively and unambiguously true or false.
5. LaTeX: Use $...$ for all formulas and chemical notation. DO NOT wrap in markdown code blocks.

OUTPUT FORMAT — output ONLY valid JSON with this exact structure:
{
  "concepts": [
    "Concept Name: Brief description",
    "Concept Name: Brief description"
  ],
  "questions": [
    {
      "type": "multiple_choice",
      "question": "A researcher observes that [scenario]. Which of the following best explains this result?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 2,
      "concept": "Concept Name",
      "difficulty": "apply"
    },
    {
      "type": "true_false",
      "question": "A statement that is definitively and unambiguously true or false.",
      "options": ["True", "False"],
      "correctIndex": 0,
      "concept": "Concept Name",
      "difficulty": "recall"
    }
  ]
}

IMPORTANT:
- correctIndex is 0-based. Vary it — do not cluster correct answers at index 0 or 1.
- For true_false, options must be exactly ["True", "False"].
- difficulty must be one of: "recall", "understand", "apply", "analyze".
- For reaction equations: never use the exact reverse as a wrong option.
- Output ONLY the JSON object. No other text or markdown fences.

Generate now:`;
    }

    /**
     * Retry prompt: generate only deficit replacement questions, avoiding covered concepts.
     */
    private buildRetryPrompt(
        allConcepts: string[],
        coveredConcepts: string[],
        numQuestions: number,
        contextText: string,
    ): string {
        const coveredSet = new Set(coveredConcepts.map(c => c.toLowerCase()));
        const uncoveredConcepts = allConcepts.filter(c => !coveredSet.has(c.toLowerCase()));

        // Use uncovered concepts if available, otherwise reuse all
        const conceptsToUse = uncoveredConcepts.length > 0 ? uncoveredConcepts : allConcepts;
        const conceptList = conceptsToUse.map((c, i) => `${i + 1}. ${c}`).join('\n');

        return `You are an expert quiz creator. Generate exactly ${numQuestions} REPLACEMENT quiz questions from the concepts and source material below. Do not repeat previously generated questions.

Concepts to cover (prioritise uncovered ones):
${conceptList}

Source Material:
${contextText}

BLOOM'S TAXONOMY — replacement questions must maintain cognitive depth:
- At most 1 recall-level (L1) question regardless of total count.
- Aim for L2 (understand), L3 (apply), and L4 (analyze).
- L3 Apply: "A researcher observes [scenario]. Which of the following best explains this?" or "If X were doubled, what would happen to Y?"
- L4 Analyze: "Which of the following correctly explains why X leads to Y?" or "What is the most significant difference between X and Y?"

PROHIBITED: Do not generate "What is X?" or "Which defines X?" style questions.

DISTRACTOR RULES:
- Distractors must be plausible misconceptions a learner could genuinely hold.
- Never use absurd or obviously impossible options.

ADDITIONAL RULES:
1. Mix question stems for variety.
2. ONE primary concept per question.
3. LaTeX: $...$ for formulas and chemical elements.
4. Prefer multiple_choice (4 options). Use true_false only for unambiguous factual claims.

Output EXACTLY in this JSON format (valid JSON array):
[
  {
    "type": "multiple_choice",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 2,
    "concept": "Concept Name",
    "difficulty": "apply"
  }
]

IMPORTANT:
- correctIndex is 0-based. Vary it across questions.
- difficulty must be one of: "recall", "understand", "apply", "analyze".
- Output ONLY the JSON array. No other text.

Generate ${numQuestions} questions now:`;
    }

    // ---------------------------------------------------------------
    // Parsers
    // ---------------------------------------------------------------

    /**
     * Parse the combined concepts + questions JSON response.
     */
    private parseCombinedResponse(response: string): { concepts: string[]; questions: Question[] } {
        try {
            let jsonStr = response;
            // Try to extract JSON object
            const objMatch = response.match(/\{[\s\S]*\}/);
            if (objMatch) {
                jsonStr = objMatch[0];
            }

            const parsed = JSON.parse(jsonStr);

            // Parse concepts
            const concepts: string[] = [];
            if (Array.isArray(parsed.concepts)) {
                for (const c of parsed.concepts) {
                    const name = typeof c === 'string' ? c.split(':')[0].trim() : '';
                    if (name && name.length > 2) concepts.push(name);
                }
            }

            // Parse questions
            const questions = Array.isArray(parsed.questions)
                ? this.parseQuestions(JSON.stringify(parsed.questions), concepts)
                : [];

            return { concepts, questions };
        } catch (error: any) {
            logger.error(`Failed to parse combined response: ${error.message}`);
            logger.debug(`Response was: ${response.substring(0, 500)}...`);

            // Fallback: try to parse as just an array of questions
            const questions = this.parseQuestions(response, []);
            return { concepts: [], questions };
        }
    }

    /**
     * Parse a JSON array of questions (used for both first-run and retry).
     */
    private parseQuestions(response: string, concepts: string[]): Question[] {
        /**
         * Fix LaTeX when the LLM drops backslashes (e.g. ightarrow -> \rightarrow)
         */
        const fixLatexBackslashes = (text: string): string => {
            if (!text || typeof text !== 'string') return text;
            return text
                .replace(/ightarrow/g, '\\rightarrow')
                .replace(/eftarrow/g, '\\leftarrow')
                .replace(/(?<![a-zA-Z])ext\s*\{/g, '\\text{')
                .replace(/(?<![a-zA-Z])rac\s*\{/g, '\\frac{')
                .replace(/(?<![a-zA-Z])frac\s*\{/g, '\\frac{');
        };

        /**
         * Shuffle array and return new array plus the new index of the item at correctOldIndex
         */
        const shuffleOptions = <T>(arr: T[], correctOldIndex: number): { shuffled: T[]; newCorrectIndex: number } => {
            const correctItem = arr[correctOldIndex];
            const indices = arr.map((_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            const shuffled = indices.map((i) => arr[i]);
            const newCorrectIndex = shuffled.indexOf(correctItem);
            return { shuffled, newCorrectIndex };
        };

        try {
            let jsonStr = response;
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);

            if (!Array.isArray(parsed)) {
                logger.error('Response is not an array');
                return [];
            }

            const questions: Question[] = [];

            for (const item of parsed) {
                if (!item.question || !item.options || !Array.isArray(item.options)) {
                    logger.warn('Skipping invalid question: missing required fields');
                    continue;
                }

                const type: QuestionType = item.type === 'true_false' ? 'true_false' : 'multiple_choice';

                let questionText = fixLatexBackslashes(item.question);
                let options = (item.options as string[]).map(opt => fixLatexBackslashes(opt));

                let correctIndex = typeof item.correctIndex === 'number'
                    ? item.correctIndex
                    : 0;

                if (correctIndex < 0 || correctIndex >= options.length) {
                    correctIndex = 0;
                }

                // Shuffle multiple_choice options so correct answer is not always A
                if (type === 'multiple_choice' && options.length >= 2) {
                    const { shuffled, newCorrectIndex } = shuffleOptions(options, correctIndex);
                    options = shuffled;
                    correctIndex = newCorrectIndex;
                }

                const concept = item.concept || concepts[0] || 'General';

                const VALID_DIFFICULTIES = ['recall', 'understand', 'apply', 'analyze'];
                const difficulty = VALID_DIFFICULTIES.includes(item.difficulty) ? item.difficulty : undefined;

                questions.push({
                    id: uuidv4(),
                    type,
                    question: questionText,
                    options,
                    correctIndex,
                    concept,
                    difficulty,
                });
            }

            return questions;
        } catch (error: any) {
            logger.error(`Failed to parse questions JSON: ${error.message}`);
            logger.debug(`Response was: ${response.substring(0, 500)}...`);
            return [];
        }
    }
}

// Export function for LangGraph node
export async function questionGeneratorAgent(state: QuizGenerationState): Promise<Partial<QuizGenerationState>> {
    const agent = new QuestionGeneratorAgent();
    return await agent.execute(state);
}
