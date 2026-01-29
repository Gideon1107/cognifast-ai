/**
 * Question Generator Agent - Generates quiz questions from extracted concepts
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
     * Generate questions from concepts
     */
    async execute(state: QuizGenerationState): Promise<Partial<QuizGenerationState>> {
        const startTime = Date.now();
        logger.info(`Generating ${state.numQuestions} questions from ${state.concepts.length} concepts...`);

        try {
            if (state.concepts.length === 0) {
                logger.warn('No concepts provided for question generation');
                return {
                    questions: [],
                    metadata: {
                        ...state.metadata,
                        questionGenerationTime: Date.now() - startTime
                    }
                };
            }

            // Get chunk text for context
            const chunks = (state.metadata as any).chunks || [];
            const contextText = chunks
                .slice(0, 15)
                .map((c: any) => c.chunkText)
                .join('\n\n');

            const toGenerate = state.numQuestions + OVER_GENERATE_COUNT;
            const prompt = this.buildPrompt(state.concepts, toGenerate, contextText);
            
            const response = await this.llm.invoke(prompt);
            const content = response.content.toString();

            // Parse questions from response
            const questions = this.parseQuestions(content, state.concepts);
            
            const elapsed = Date.now() - startTime;
            logger.info(`Generated ${questions.length} questions in ${elapsed}ms`);

            return {
                questions,
                metadata: {
                    ...state.metadata,
                    questionGenerationTime: elapsed
                }
            };

        } catch (error: any) {
            logger.error(`Error generating questions: ${error.message}`);
            return {
                questions: [],
                metadata: {
                    ...state.metadata,
                    error: error.message
                }
            };
        }
    }

    private buildPrompt(concepts: string[], numQuestions: number, contextText: string): string {
        const conceptList = concepts.map((c, i) => `${i + 1}. ${c}`).join('\n');
        
        return `You are an expert quiz creator for any subject (STEM, humanities, business, etc.). Generate exactly ${numQuestions} high-quality quiz questions from the concepts and source material below. Write instructions that work for any topic, not just one subject.

Concepts to cover:
${conceptList}

Source Material (use for accuracy and wording):
${contextText.substring(0, 8000)}

Quality rules (apply to any domain):
1. QUESTION VARIETY: Use diverse question formats - don't repeat the same phrasing. Be creative while keeping the correct answer unambiguous. Examples:
   - "What is the primary function of [X]?"
   - "Which of the following best describes [X]?"
   - "What distinguishes [X] from [Y]?"
   - "Which statement about [X] is correct?"
   - "What is the main purpose of [X]?"
   - "How does [X] affect [Y]?"
   - "Why is [X] important for [Y]?"
   - "When does [X] occur?"
   - "Which factor most influences [X]?"
   - "What is the relationship between [X] and [Y]?"
   Mix question types (what/which/how/why/when) and vary your phrasing across questions. The key is that the correct answer must be clearly right; avoid ambiguity.
2. ONE CONCEPT PER QUESTION: Each question must test exactly one listed concept and one specific aspect of it. Avoid vague or overly broad questions.
3. DIFFICULTY: Do not make questions trivially easy. Require real understanding to answer. Avoid obvious wrong options; use plausible distractors that a knowledgeable person could eliminate but a guesser could not. Distractors should draw on related ideas, common misconceptions, or statements that are true in another context but wrong here.
4. EQUATIONS AND FORMULAS (when available): If a concept or the source material includes equations, formulas, chemical reactions, or mathematical expressions, include questions that test the user's understanding of them. Where relevant:
   - Phrase the question so it asks about an equation or formula (e.g. "Which equation correctly represents...?", "What is the correct formula for...?").
   - Put equations and formulas in both the question and the answer options using LaTeX (e.g. options that are different equations, so the user must identify the correct one).
   - Only add equation-based questions when the concept and source material actually contain equations or formulas; do not force them for purely conceptual topics.
   - For reaction equations: do NOT use the exact reverse of the correct equation as a distractor (e.g. if the correct answer is $6CO_2 + 6H_2O \\rightarrow C_6H_{12}O_6 + 6O_2$, do not use $6O_2 + 6H_2O \\rightarrow 6CO_2 + C_6H_{12}O_6$ as an option—that is the reverse reaction). Use other plausible errors instead: wrong coefficients, wrong product or reactant, missing term, or a different but wrong equation from the same topic.
5. FORMAT: Prefer multiple_choice (4 options) when the concept has nuance or multiple plausible answers; use true_false only for straightforward factual claims.
6. LaTeX (use inline LaTeX for all formulas and chemical elements):
   - Chemical formulas and elements: $CO_2$, $H_2O$, $C_6H_{12}O_6$, $O_2$ (not CO2, H2O, O2) in questions and options
   - Mathematical expressions: $6CO_2 + 6H_2O$, reaction arrows: \\rightarrow or \\leftarrow (e.g. $6CO_2 + 6H_2O \\rightarrow C_6H_{12}O_6 + 6O_2$)
   - Subscripts: $H_2O$ not H2O; superscripts: $x^2$, fractions: $\\frac{a}{b}$
   - Block equations (when appropriate): \\[ and \\] for display equations
   - DO NOT wrap LaTeX in markdown (no **$...$** or _..._). ALWAYS use LaTeX for chemical formulas: $CO_2$ not CO2, $H_2O$ not H2O, $O_2$ not O2

Output EXACTLY in this JSON format (valid JSON array):
[
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

IMPORTANT:
- correctIndex is 0-based. Vary it (0, 1, 2, 3) across questions so the correct answer is NOT always first (option A).
- For true_false, options must be exactly ["True", "False"]
- LaTeX: use $...$ for formulas and chemical elements (e.g. $CO_2$, $H_2O$, \\rightarrow for arrows). Same convention as chat responses.
- For "which equation" questions: never use the reverse reaction as a wrong option (e.g. no $6O_2 + 6H_2O \\rightarrow 6CO_2 + C_6H_{12}O_6$ when the correct equation is photosynthesis). Use wrong coefficients, wrong terms, or a different wrong equation.
- Output ONLY the JSON array, no other text or markdown

Generate exactly ${numQuestions} questions now:`;
    }

    private parseQuestions(response: string, concepts: string[]): Question[] {
        /**
         * Fix LaTeX when the LLM drops backslashes (e.g. ightarrow -> \rightarrow)
         * This is a safety net - the LLM often omits backslashes even when instructed not to.
         */
        const fixLatexBackslashes = (text: string): string => {
            if (!text || typeof text !== 'string') return text;
            return text
                // Fix broken arrows: "ightarrow" -> "\rightarrow", "eftarrow" -> "\leftarrow"
                .replace(/ightarrow/g, '\\rightarrow')
                .replace(/eftarrow/g, '\\leftarrow')
                // Fix broken commands: "ext{" -> "\text{", "rac{" -> "\frac{"
                .replace(/(?<![a-zA-Z])ext\s*\{/g, '\\text{')
                .replace(/(?<![a-zA-Z])rac\s*\{/g, '\\frac{')
                .replace(/(?<![a-zA-Z])frac\s*\{/g, '\\frac{');
        };

        /**
         * Shuffle array and return new array plus the new index of the item that was at correctOldIndex
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
            // Extract JSON from response (handle markdown code blocks)
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
                // Validate required fields
                if (!item.question || !item.options || !Array.isArray(item.options)) {
                    logger.warn('Skipping invalid question: missing required fields');
                    continue;
                }

                // Validate type
                const type: QuestionType = item.type === 'true_false' ? 'true_false' : 'multiple_choice';

                // Fix LaTeX backslashes that the LLM drops
                let questionText = fixLatexBackslashes(item.question);
                let options = (item.options as string[]).map(opt => fixLatexBackslashes(opt));

                // Validate correctIndex
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

                // Find matching concept
                const concept = item.concept || concepts[0] || 'General';

                questions.push({
                    id: uuidv4(),
                    type,
                    question: questionText,
                    options,
                    correctIndex,
                    concept
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
