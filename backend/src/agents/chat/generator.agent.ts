/**
 * Generator Agent - Generates AI responses using retrieved context
 */

import { ChatOpenAI } from "@langchain/openai";
import { ConversationState, Message } from "../../types/chat.types";
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../utils/logger';

const logger = createLogger('GENERATOR-AGENT');

export class GeneratorAgent {
    private llm: ChatOpenAI;

    constructor() {
        this.llm = new ChatOpenAI({
            modelName: "gpt-4o-mini",
            temperature: 0.7, // Creative but controlled
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Generate response based on context and conversation history
     */
    async execute(state: ConversationState): Promise<Partial<ConversationState>> {
        const startTime = Date.now();
        logger.info("Generating response...");

        try {
            let prompt: string;

            // Different prompts based on router decision
            if (state.routerDecision === "direct_answer") {
                // Simple response without retrieval
                prompt = this.buildDirectAnswerPrompt(state);
            } else if (state.routerDecision === "clarify") {
                // Ask for clarification
                prompt = this.buildClarificationPrompt(state);
            } else {
                // Use retrieved context
                prompt = this.buildRAGPrompt(state);
            }

            const responseStartTime = Date.now();
            const response = await this.llm.invoke(prompt);
            const responseEndTime = Date.now();
            const content = response.content.toString();

            const totalTime = Date.now() - startTime;
            logger.info(`Generated response (${content.length} chars) in ${totalTime}ms (OpenAI: ${responseEndTime - responseStartTime}ms)`);

            // Create assistant message
            const assistantMessage: Message = {
                id: uuidv4(), 
                conversationId: state.conversationId,
                role: "assistant",
                content: content,
                sources: state.retrievedChunks.map((chunk) => ({
                    chunkId: chunk.id,
                    documentId: chunk.documentId,
                    documentName: chunk.documentName,
                    chunkText: chunk.chunkText,
                    chunkIndex: chunk.chunkIndex,
                    similarity: chunk.similarity,
                })),
                createdAt: new Date().toISOString(),
            };

            // Extract token usage safely
            const responseMetadata = response.response_metadata as any;
            const tokensUsed =
                responseMetadata?.usage?.total_tokens ||
                responseMetadata?.tokenUsage?.total_tokens ||
                0;

            return {
                messages: [...state.messages, assistantMessage],
                metadata: {
                    ...state.metadata,
                    model: "gpt-4o-mini (generator)",
                    totalTokens: (state.metadata.totalTokens || 0) + tokensUsed,
                },
            };
        } catch (error: any) {
            logger.error(`Error: ${error.message}`);

            // Return error message
            const errorMessage: Message = {
                id: uuidv4(),
                conversationId: state.conversationId,
                role: "assistant",
                content:
                    "I apologize, but I encountered an error generating a response. Please try again.",
                createdAt: new Date().toISOString(),
            };

            return {
                messages: [...state.messages, errorMessage],
                responseQuality: "poor",
            };
        }
    }

    /**
     * Build RAG prompt with retrieved context
     */
    private buildRAGPrompt(state: ConversationState): string {
        // Build context from retrieved chunks with document names
        const context = state.retrievedChunks
            .map((chunk, idx) => `[Source ${idx + 1} - ${chunk.documentName}]:\n${chunk.chunkText}`)
            .join("\n\n");

        // Build conversation history
        const conversationHistory = state.messages
            .slice(-5) // Last 5 messages
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");

        // Determine if we're working with multiple documents
        const uniqueDocs = new Set(state.retrievedChunks.map(c => c.documentName));
        const isMultiDoc = uniqueDocs.size > 1;

        return `You are a helpful AI assistant answering questions about ${isMultiDoc ? 'multiple documents' : 'a document'}. Use the provided context to answer the user's question accurately.

Context from Document${isMultiDoc ? 's' : ''}:
${context || "No context available"}

Conversation History:
${conversationHistory || "No previous messages"}

User Question: ${state.currentQuery}

Instructions:
1. Answer based on the context provided
2. If the context doesn't contain the answer, say so clearly
3. When citing information, mention the document name like: [Source 1 - ${state.retrievedChunks[0]?.documentName || 'Document'}]
4. Be concise but complete${isMultiDoc ? '\n5. When comparing or synthesizing information from multiple documents, clearly attribute each piece to its source' : ''}
5. Maintain conversational tone

Answer:`;
    }

    /**
     * Build prompt for direct answers (no retrieval needed)
     */
    private buildDirectAnswerPrompt(state: ConversationState): string {
        const conversationHistory = state.messages
            .slice(-5)
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");

        return `You are a helpful AI assistant. Respond to the user's message naturally.

Conversation History:
${conversationHistory || "No previous messages"}

User Message: ${state.currentQuery}

Respond naturally and helpfully:`;
    }

    /**
     * Build prompt for clarification requests
     */
    private buildClarificationPrompt(state: ConversationState): string {
        return `You are a helpful AI assistant. The user's query is unclear.

User Query: ${state.currentQuery}

Politely ask the user to clarify their question. Be specific about what information you need.

Clarification Request:`;
    }
}

// Export function for LangGraph node
export async function generatorAgent(state: ConversationState): Promise<Partial<ConversationState>> {
    const agent = new GeneratorAgent();
    return await agent.execute(state);
}
