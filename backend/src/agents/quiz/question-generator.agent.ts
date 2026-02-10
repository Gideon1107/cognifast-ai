/**
 * Question Generator Agent - Extracts concepts AND generates quiz questions
 * On retry it only generates replacement questions for the deficit.
 */

import { ChatOpenAI } from "@langchain/openai";
import { QuizGenerationState, Question, QuestionType } from "../../types/quiz.types";
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../utils/logger';

const logger = createLogger('QUESTION-GENERATOR');

/** Over-generate so after validation we still have at least numQuestions */
const OVER_GENERATE_COUNT = 3;

export class QuestionGeneratorAgent {
    private llm: ChatOpenAI;

    constructor() {
        this.llm = new ChatOpenAI({
            modelName: "gpt-4o-mini",
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

        return `You are an expert educator and quiz creator. Perform TWO tasks from the source material below.

SOURCE MATERIAL:
${contextText}

─── TASK 1: CONCEPT EXTRACTION ───
Extract the ${numConcepts} most important, quiz-worthy concepts.
- Factual, testable, specific, and concrete
- Important to understanding the material
- Each concept: a short name + brief description

─── TASK 2: QUESTION GENERATION ───
Generate exactly ${numQuestions} high-quality quiz questions covering those concepts.

Quality rules:
1. QUESTION VARIETY: Use diverse question formats - don't repeat the same phrasing. Mix what/which/how/why/when.
2. ONE CONCEPT PER QUESTION: Each question tests one specific concept.
3. DIFFICULTY: Require real understanding. Use plausible distractors.
4. EQUATIONS AND FORMULAS: If the content contains equations or formulas, include questions that test understanding of them. Use LaTeX: $CO_2$, $H_2O$, $\\frac{a}{b}$, $\\rightarrow$.
5. FORMAT: Prefer multiple_choice (4 options). Use true_false only for straightforward factual claims.
6. LaTeX: Use $...$ for all chemical formulas and math. DO NOT wrap LaTeX in markdown.

OUTPUT FORMAT — Output ONLY valid JSON with this exact structure:
{
  "concepts": [
    "Concept Name: Brief description",
    "Concept Name: Brief description"
  ],
  "questions": [
    {
      "type": "multiple_choice",
      "question": "In the context of [topic], what is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 2,
      "concept": "Concept Name"
    },
    {
      "type": "true_false",
      "question": "A statement that is definitively true or false.",
      "options": ["True", "False"],
      "correctIndex": 0,
      "concept": "Concept Name"
    }
  ]
}

IMPORTANT:
- correctIndex is 0-based. Vary it across questions.
- For true_false, options must be exactly ["True", "False"].
- For reaction equations: never use the exact reverse as a wrong option.
- Output ONLY the JSON object, no other text or markdown.

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

        return `You are an expert quiz creator. Generate exactly ${numQuestions} NEW quiz questions from the concepts and source material below. These are REPLACEMENT questions — do not repeat questions that were already generated.

Concepts to cover (prioritise uncovered ones):
${conceptList}

Source Material:
${contextText}

Quality rules:
1. QUESTION VARIETY: Diverse formats, mix what/which/how/why/when.
2. ONE CONCEPT PER QUESTION.
3. DIFFICULTY: Plausible distractors, require real understanding.
4. LaTeX: $...$ for formulas and chemical elements.
5. FORMAT: Prefer multiple_choice (4 options). true_false only for straightforward facts.

Output EXACTLY in this JSON format (valid JSON array):
[
  {
    "type": "multiple_choice",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 2,
    "concept": "Concept Name"
  }
]

IMPORTANT:
- correctIndex is 0-based. Vary it across questions.
- Output ONLY the JSON array, no other text.

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

                questions.push({
                    id: uuidv4(),
                    type,
                    question: questionText,
                    options,
                    correctIndex,
                    concept,
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
