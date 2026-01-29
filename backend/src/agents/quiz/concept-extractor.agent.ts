/**
 * Concept Extractor Agent - Extracts key concepts from document chunks for quiz generation
 */

import { ChatOpenAI } from "@langchain/openai";
import { QuizGenerationState } from "../../types/quiz.types";
import { createLogger } from '../../utils/logger';

const logger = createLogger('CONCEPT-EXTRACTOR');

export class ConceptExtractorAgent {
    private llm: ChatOpenAI;

    constructor() {
        this.llm = new ChatOpenAI({
            modelName: "gpt-4o-mini",
            temperature: 0.3, // Lower for more consistent extraction
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Extract key concepts from document chunks
     */
    async execute(state: QuizGenerationState): Promise<Partial<QuizGenerationState>> {
        const startTime = Date.now();
        logger.info(`Extracting concepts from ${state.metadata.totalChunks || 0} chunks...`);

        try {
            // Build context from chunks (passed via metadata)
            const chunks = (state.metadata as any).chunks || [];
            
            if (chunks.length === 0) {
                logger.warn('No chunks provided for concept extraction');
                return {
                    concepts: [],
                    metadata: {
                        ...state.metadata,
                        conceptExtractionTime: Date.now() - startTime
                    }
                };
            }

            // Combine chunk text (limit to avoid token overflow)
            const maxChunks = 20; // Limit chunks to process
            const relevantChunks = chunks.slice(0, maxChunks);
            const chunkText = relevantChunks
                .map((c: any, idx: number) => `[Chunk ${idx + 1}]\n${c.chunkText}`)
                .join('\n\n');

            const prompt = this.buildPrompt(chunkText, state.numQuestions);
            
            const response = await this.llm.invoke(prompt);
            const content = response.content.toString();

            // Parse concepts from response
            const concepts = this.parseConcepts(content, state.numQuestions);
            
            const elapsed = Date.now() - startTime;
            logger.info(`Extracted ${concepts.length} concepts in ${elapsed}ms`);

            return {
                concepts,
                metadata: {
                    ...state.metadata,
                    conceptExtractionTime: elapsed
                }
            };

        } catch (error: any) {
            logger.error(`Error extracting concepts: ${error.message}`);
            return {
                concepts: [],
                metadata: {
                    ...state.metadata,
                    error: error.message
                }
            };
        }
    }

    private buildPrompt(chunkText: string, numQuestions: number): string {
        // Request more concepts than questions to allow variety
        const numConcepts = Math.min(numQuestions * 2, 30);
        
        return `You are an expert educator extracting key concepts from educational content.

Your task: Extract the ${numConcepts} most important, quiz-worthy concepts from the following content.

Content:
${chunkText}

Instructions:
1. Identify concepts that are:
   - Factual and testable (can be asked as multiple choice or true/false)
   - Specific and concrete (not vague or abstract)
   - Important to understanding the material
2. For each concept, provide a brief description
3. Output as a numbered list

Format your response EXACTLY like this:
1. [Concept Name]: [Brief description of what this concept covers]
2. [Concept Name]: [Brief description]
...

Example:
1. Photosynthesis Process: The chemical process by which plants convert light energy, water, and CO2 into glucose and oxygen
2. Mitochondria Function: The role of mitochondria as the powerhouse of cells, producing ATP through cellular respiration

Extract ${numConcepts} concepts now:`;
    }

    private parseConcepts(response: string, targetCount: number): string[] {
        const lines = response.split('\n').filter(line => line.trim());
        const concepts: string[] = [];

        for (const line of lines) {
            // Match numbered lines like "1. Concept: Description" or "1. Concept"
            const match = line.match(/^\d+\.\s*([^:]+)(?::|$)/);
            if (match) {
                const concept = match[1].trim();
                if (concept && concept.length > 2) {
                    concepts.push(concept);
                }
            }
        }

        // Limit to reasonable number
        const maxConcepts = Math.max(targetCount * 2, 20);
        return concepts.slice(0, maxConcepts);
    }
}

// Export function for LangGraph node
export async function conceptExtractorAgent(state: QuizGenerationState): Promise<Partial<QuizGenerationState>> {
    const agent = new ConceptExtractorAgent();
    return await agent.execute(state);
}
