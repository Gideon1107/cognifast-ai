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

        const docReference = isMultiDoc ? 'documents' : 'document';
        const docPlural = isMultiDoc ? 's' : '';
        const notMentionPhrasing = isMultiDoc ? "documents don't" : "document doesn't";
        const multiDocInstruction = isMultiDoc ? '\n5. When synthesizing information from multiple documents, attribute each piece to its source naturally' : '';
        
        return `You are a helpful AI assistant with access to ${isMultiDoc ? 'multiple documents' : 'a document'}. Answer the user's question naturally and conversationally.

Available Information from Document${docPlural}:
${context || "No information available"}

Conversation History:
${conversationHistory || "No previous messages"}

User Question: ${state.currentQuery}

Instructions:
1. Answer naturally as if you've read the ${docReference} yourself
2. DO NOT mention "context", "provided context", or "the context shows" - speak as if you have direct knowledge
3. ALWAYS cite the document source when providing information - use the format [Source 1 - DocumentName.pdf] or mention "According to DocumentName.pdf" or "In DocumentName.pdf"
4. DO NOT say generic things like "This information is detailed in the document" or "as mentioned in various sections" - use SPECIFIC source citations with document names
5. If you don't have the information to answer, say: "I don't see that information in the ${docReference}" or "The ${notMentionPhrasing} mention that"${multiDocInstruction}
6. Be conversational, helpful, and concise
7. DO NOT end with generic phrases like "feel free to ask", "let me know if", or "if you have more questions" - just answer the question and stop naturally
8. DO NOT end with similar generic phrases like "feel free to ask", "let me know if", "if there's any more information you need", "if you have any other questions", etc.
9. JUST ANSWER AND STOP NATURALLY
10. DO NOT ASK USER ABOUT THEIR DAY

Example of GOOD citation:
"He worked on DevConnect, a web chat application [Source 1 - Resume.pdf]. According to [Source 2 - Portfolio.pdf], he also built Footnation."

Example of BAD citation:
"He worked on several projects. This information is detailed in the document."

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

        return `You are a helpful AI assistant. Respond to the user's message naturally and conversationally.

Conversation History:
${conversationHistory || "No previous messages"}

User Message: ${state.currentQuery}

Instructions:
- Respond naturally as a human would
- DO NOT end with similar generic phrases like "feel free to ask", "let me know if", "if there's any more information you need", "if you have any other questions", etc.
- JUST ANSWER AND STOP NATURALLY
- DO NOT ASK USER ABOUT THEIR DAY

Your response:`;
    }

    /**
     * Build prompt for clarification requests
     */
    private buildClarificationPrompt(state: ConversationState): string {
        return `You are a helpful AI assistant. The user's message is unclear and needs clarification.

User Message: ${state.currentQuery}

Instructions:
- Politely ask what they mean or what specific information they need
- Be conversational and natural
- Avoid phrases like "feel free to" or "please let me know"
- Just ask your clarifying question directly and naturally
- DO NOT end with similar generic phrases like "feel free to ask", "let me know if", "if there's any more information you need", "if you have any other questions", etc.
- JUST ANSWER AND STOP NATURALLY
- DO NOT ASK USER ABOUT THEIR DAY

Your response:`;
    }
}

// Export function for LangGraph node
export async function generatorAgent(state: ConversationState): Promise<Partial<ConversationState>> {
    const agent = new GeneratorAgent();
    return await agent.execute(state);
}
