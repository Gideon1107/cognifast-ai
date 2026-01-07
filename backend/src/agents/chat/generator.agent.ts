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
     * Supports token-by-token streaming if onToken callback is provided in metadata
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

            // Check if we should stream tokens (onToken callback in metadata)
            const onToken = (state.metadata as any)?.onToken;
            
            if (onToken && typeof onToken === 'function') {
                // Token-by-token streaming mode
                return await this.executeStreaming(state, prompt, onToken, startTime);
            } else {
                // Non-streaming mode (for REST API or fallback)
                return await this.executeNonStreaming(state, prompt, startTime);
            }
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
     * Execute with token-by-token streaming
     */
    private async executeStreaming(
        state: ConversationState,
        prompt: string,
        onToken: (token: string) => void,
        startTime: number
    ): Promise<Partial<ConversationState>> {
        const responseStartTime = Date.now();
        let content = '';
        let tokensUsed = 0;
        const messageId = uuidv4();

        // Stream tokens from OpenAI
        const stream = await this.llm.stream(prompt);
        
        for await (const chunk of stream) {
            const token = chunk.content?.toString() || '';
            if (token) {
                content += token;
                // Emit token immediately via callback
                onToken(token);
            }

            // Extract token usage from chunk metadata if available
            const chunkMetadata = chunk.response_metadata as any;
            if (chunkMetadata?.usage?.total_tokens) {
                tokensUsed = chunkMetadata.usage.total_tokens;
            }
        }

        const responseEndTime = Date.now();
        const totalTime = Date.now() - startTime;
        logger.info(`Generated streaming response (${content.length} chars) in ${totalTime}ms (OpenAI: ${responseEndTime - responseStartTime}ms)`);

        // Create assistant message with complete content
        const assistantMessage: Message = {
            id: messageId,
            conversationId: state.conversationId,
            role: "assistant",
            content: content,
            sources: state.retrievedChunks.map((chunk) => ({
                chunkId: chunk.id,
                sourceId: chunk.sourceId,
                sourceName: chunk.sourceName,
                chunkText: chunk.chunkText,
                chunkIndex: chunk.chunkIndex,
                similarity: chunk.similarity,
            })),
            createdAt: new Date().toISOString(),
        };

        return {
            messages: [...state.messages, assistantMessage],
            metadata: {
                ...state.metadata,
                model: "gpt-4o-mini (generator)",
                totalTokens: (state.metadata.totalTokens || 0) + tokensUsed,
            },
        };
    }

    /**
     * Execute without streaming (for REST API)
     */
    private async executeNonStreaming(
        state: ConversationState,
        prompt: string,
        startTime: number
    ): Promise<Partial<ConversationState>> {
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
                sourceId: chunk.sourceId,
                sourceName: chunk.sourceName,
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
    }

    /**
     * Build RAG prompt with retrieved context
     */
    private buildRAGPrompt(state: ConversationState): string {
        // Build context from retrieved chunks with numbered citations
        // Citation numbers match array index + 1: [1] = chunks[0], [2] = chunks[1], etc.
        const context = state.retrievedChunks
            .map((chunk, idx) => `[${idx + 1}]\n${chunk.chunkText}`)
            .join("\n\n");

        // Build conversation history
        const conversationHistory = state.messages
            .slice(-5) // Last 5 messages
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n");

        // Determine if we're working with multiple sources
        const uniqueSources = new Set(state.retrievedChunks.map(c => c.sourceName));
        const isMultiSource = uniqueSources.size > 1;

        const sourceReference = isMultiSource ? 'sources' : 'source';
        const sourcePlural = isMultiSource ? 's' : '';
        const notMentionPhrasing = isMultiSource ? "sources don't" : "source doesn't";
        const multiSourceInstruction = isMultiSource ? '\n5. When synthesizing information from multiple sources, attribute each piece to its source naturally' : '';
        
        return `You are a helpful AI assistant with access to ${isMultiSource ? 'multiple sources' : 'a source'}. Answer the user's question naturally and conversationally.

Available Information from Source${sourcePlural}:
${context || "No information available"}

Conversation History:
${conversationHistory || "No previous messages"}

User Question: ${state.currentQuery}

Instructions:
1. Answer naturally as if you've read the ${sourceReference} yourself
2. DO NOT mention "context", "provided context", or "the context shows" - speak as if you have direct knowledge
3. ALWAYS cite sources using numbered citations [1], [2], [3], etc. when referencing information from the sources
4. Citation numbers correspond to the numbered chunks in the context above ([1] = first chunk, [2] = second chunk, etc.)
5. CRITICAL: ONLY use citation numbers that exist in the context above. If the context shows [1], [2], [3], you can ONLY cite [1], [2], or [3]. DO NOT create citations like [4], [5], etc. if they don't exist in the context.
6. Place citations immediately after the information being cited, like: "This process occurs [1] within the chloroplasts..."
7. DO NOT include source names in citations - just use the number: [1], not [Source 1 - Name]
8. DO NOT say generic things like "This information is detailed in the source" or "as mentioned in various sections" - use SPECIFIC numbered citations
9. If you don't have the information to answer, say: "I don't see that information in the ${sourceReference}" or "The ${notMentionPhrasing} mention that"${multiSourceInstruction}
6. Be conversational, helpful, and concise
7. DO NOT end with generic phrases like "feel free to ask", "let me know if", or "if you have more questions" - just answer the question and stop naturally
8. DO NOT end with similar generic phrases like "feel free to ask", "let me know if", "if there's any more information you need", "if you have any other questions", etc.
9. JUST ANSWER AND STOP NATURALLY
10. DO NOT ASK USER ABOUT THEIR DAY

Formatting Requirements:
- Use proper paragraph breaks for readability
- Use numbered lists (1., 2., 3.) or bullet points when listing multiple items
- Use **bold** for emphasis on key terms or important points
- Structure longer answers with clear sections or paragraphs
- Ensure proper spacing between paragraphs
- Use consistent citation format throughout
- Make the response easy to scan and read

Example of GOOD formatting with ${state.retrievedChunks.length} chunk(s) available:
"Several factors can disturb photosynthesis, impacting its efficiency. Key ones include:

1. **Light Intensity**: Insufficient light can reduce the rate of photosynthesis, as plants rely on light energy to drive the process ${state.retrievedChunks.length >= 1 ? '[1]' : ''}.

2. **Carbon Dioxide Concentration**: A low concentration of carbon dioxide can limit the rate of photosynthesis since it's one of the essential reactants in the process ${state.retrievedChunks.length >= 1 ? '[1]' : ''}."

REMEMBER: You have ${state.retrievedChunks.length} chunk(s) in the context, so you can ONLY cite ${state.retrievedChunks.map((_, i) => `[${i + 1}]`).join(', ')}. DO NOT use any other citation numbers.

Example of GOOD citation:
"He worked on DevConnect, a web chat application [1]."

Example of BAD citation:
"He worked on several projects. This information is detailed in the document."
"He worked on DevConnect [1] and also built Footnation [2]." ← BAD if you only have 1 chunk!

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

Formatting Requirements:
- Use proper paragraph breaks for readability
- Use numbered lists (1., 2., 3.) or bullet points when listing multiple items
- Use **bold** for emphasis on key terms or important points
- Structure longer answers with clear sections or paragraphs
- Ensure proper spacing between paragraphs
- Make the response easy to scan and read

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

Formatting Requirements:
- Use proper paragraph breaks for readability
- Keep clarification questions concise and clear
- Use **bold** for emphasis if needed
- Ensure proper spacing

Your response:`;
    }
}

// Export function for LangGraph node
export async function generatorAgent(state: ConversationState): Promise<Partial<ConversationState>> {
    const agent = new GeneratorAgent();
    return await agent.execute(state);
}
