/**
 * Quality Agent - Validates response quality and triggers regeneration if needed
 */

import { ChatOpenAI } from '@langchain/openai';
import { ConversationState, ResponseQuality } from '../../types/chat.types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('QUALITY-AGENT');

export class QualityAgent {
    private llm: ChatOpenAI;
    private maxRetries: number = 2; 

    constructor() {
        this.llm = new ChatOpenAI({
            modelName: 'gpt-4o-mini',
            temperature: 0, // Deterministic evaluation
            openAIApiKey: process.env.OPENAI_API_KEY
        });
    }

    /**
     * Evaluate response quality
     */
    async execute(state: ConversationState): Promise<Partial<ConversationState>> {
        const startTime = Date.now();
        logger.info('Evaluating response quality...');

        try {
            // Get the last assistant message
            const lastMessage = state.messages[state.messages.length - 1];
            
            if (!lastMessage || lastMessage.role !== 'assistant') {
                logger.warn('No assistant message to evaluate');
                return { 
                    responseQuality: 'good',
                    metadata: {
                        ...state.metadata,
                        endTime: Date.now()
                    }
                };
            }

            // Check if we've already reached max retries
            // If so, accept the response even if quality is poor
            if (state.retryCount >= this.maxRetries) {
                logger.info('Max retries reached, accepting current response');
                return { 
                    responseQuality: 'good', // Force to good to end the loop
                    metadata: {
                        ...state.metadata,
                        endTime: Date.now()
                    }
                };
            }

            // Build evaluation prompt
            const prompt = `You are a quality checker. Evaluate if the AI assistant's response is good quality.

User Question: ${state.currentQuery}

AI Response: ${lastMessage.content}

Context Used: ${state.retrievedChunks.length > 0 ? 'Yes' : 'No'}

Quality Criteria:
1. Answers the user's question
2. Uses provided context when available
3. Is accurate and not misleading
4. Is clear and well-structured
5. Doesn't hallucinate information not in context

Evaluate and return ONLY one word: "good" or "poor"

If the response fails any critical criteria (especially accuracy or hallucination), return "poor".
Otherwise return "good".

Evaluation:`;


            const llmStartTime = Date.now();
            const response = await this.llm.invoke(prompt);
            const llmEndTime = Date.now();
            logger.info(`LLM evaluation took ${llmEndTime - llmStartTime}ms`);
            
            const evaluation = response.content.toString().toLowerCase().trim();
            
            const quality: ResponseQuality = evaluation.includes('poor') ? 'poor' : 'good';

            const totalTime = Date.now() - startTime;
            logger.info(`Quality assessment: ${quality} (total: ${totalTime}ms)`);

            if (quality === 'poor') {
                // Check if next retry would exceed max
                if (state.retryCount + 1 >= this.maxRetries) {
                    logger.info('Poor quality but max retries would be reached, accepting response');
                    return {
                        responseQuality: 'good', // Accept it
                        metadata: {
                            ...state.metadata,
                            endTime: Date.now()
                        }
                    };
                }
                
                logger.info('Poor quality detected, will regenerate');
                return {
                    responseQuality: quality,
                    retryCount: state.retryCount + 1,
                    // Remove the poor quality message for regeneration
                    messages: state.messages.slice(0, -1)
                };
            }

            return {
                responseQuality: quality,
                metadata: {
                    ...state.metadata,
                    endTime: Date.now()
                }
            };

        } catch (error: any) {
            logger.error(`Error: ${error.message}`);
            return {
                responseQuality: 'good',
                metadata: {
                    ...state.metadata,
                    endTime: Date.now()
                }
            };
        }
    }
}

// Export function for LangGraph node
export async function qualityAgent(state: ConversationState): Promise<Partial<ConversationState>> {
    const agent = new QualityAgent();
    return await agent.execute(state);
}

