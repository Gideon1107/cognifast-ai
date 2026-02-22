/**
 * Router Agent - Analyzes user intent and routes to appropriate action
 * 
 * Decision Flow:
 * - 'retrieve': Query needs document context
 * - 'direct_answer': Can answer without retrieval (greetings, thanks, clarifications)
 * - 'clarify': Query is unclear or ambiguous
 */

import { ChatOpenAI } from '@langchain/openai';
import { ConversationState, RouterDecision } from '../../types/chat.types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ROUTER-AGENT');

export class RouterAgent {
    private llm: ChatOpenAI;

    constructor() {
        this.llm = new ChatOpenAI({
            model: 'gpt-4o-mini', // Fast model for routing
            temperature: 0, // Deterministic routing
            openAIApiKey: process.env.OPENAI_API_KEY
        });
    }

    /**
     * Detect if the query is asking about model identity (block these; no LLM answer)
     */
    private isIdentityQuery(query: string): boolean {
        const lower = query.toLowerCase().trim();
        const identityPatterns = [
            /\b(which|what)\s+model\s+(are you|am i using|is this)\b/i,
            /\bwhat\s+(model|ai|assistant)\s+are you\b/i,
            /\bwho\s+are you\b/i,
            /\b(are you|is this)\s+(gpt|chatgpt|claude|openai)\b/i,
            /\b(model|ai)\s+identity\b/i,
            /\bwhat\s+are you\b/i,
            /\bname\s+of\s+(the\s+)?model\b/i,
        ];
        return identityPatterns.some((p) => p.test(lower));
    }

    /**
     * Analyze user query and decide routing strategy
     * LLM-only routing with a prompt biased toward retrieval when documents are attached
     */
    async execute(state: ConversationState): Promise<Partial<ConversationState>> {
        const startTime = Date.now();
        logger.info(`Analyzing query: "${state.currentQuery}"`);

        try {
            const query = state.currentQuery.trim();

            // Block identity queries: return canned deflection, no LLM
            if (this.isIdentityQuery(query)) {
                logger.info('Identity query detected -> identity_block');
                return {
                    routerDecision: 'identity_block',
                    metadata: {
                        ...state.metadata,
                        model: 'router (identity_block)',
                    },
                };
            }
            const conversationHistory = state.messages
                .slice(-6)
                .map(m => `${m.role}: ${m.content}`)
                .join('\n');

            const sourceCount = Array.isArray(state.sourceIds) ? state.sourceIds.length : 0;
            const hasSources = sourceCount > 0;

            logger.info('Using LLM for routing decision');

            const prompt = `You are a router for a source-grounded chat system.

Task: choose exactly ONE label for the user query.

Labels:
- retrieve: get relevant chunks from the attached sources before answering
- direct_answer: respond without retrieval (greetings/thanks/pleasantries or questions unrelated to source content)
- clarify: ask a clarifying question ONLY if the user input is too unclear to act on
- identity_block: user is asking which model you are, what AI this is, who you are, or your identity (do not reveal; this label triggers a standard deflection)

Context:
- sources_attached: ${hasSources ? 'yes' : 'no'} (count=${sourceCount})
- recent_messages:
${conversationHistory || '(none)'}

Rules (important):
1) If sources_attached=yes: choose retrieve for ANY question that could be answered from the sources, including: factual questions, "what is this document about?", "what do we have here?", "what's in here?", "summarize this", "what's this about?", "what's the content?", or any phrasing that refers to "here" / "this" / "the document" / "the material" as the thing being asked about.
2) Choose direct_answer ONLY for pure social/utility messages with no reference to content: e.g. "Hi", "Thanks", "Bye", "Hello". If the user says "Hi, what do we have here?" or "What's here today?" they are asking about the SOURCE content → retrieve.
3) Choose identity_block for any question about which model this is, what AI/assistant this is, who you are, or your identity. Examples: "Which model are you?", "What model is this?", "Are you GPT?", "Who are you?" (when meaning the AI).
4) Choose clarify ONLY for extremely underspecified inputs (e.g. "?", "what", "huh") or missing referent (e.g. "what about that?" with no context).
5) If uncertain and sources_attached=yes, prefer retrieve.

Examples:
User: "Does he have a programming skill?" (sources_attached=yes) -> retrieve
User: "What do we have here today?" (sources_attached=yes) -> retrieve
User: "What is this document about?" (sources_attached=yes) -> retrieve
User: "Hi" -> direct_answer
User: "?" -> clarify
User: "What is RAG?" (sources_attached=yes, asking general knowledge not about the document) -> direct_answer
User: "Which model are you?" -> identity_block
User: "What AI is this?" -> identity_block

User query: "${query}"

Return only one word: retrieve OR direct_answer OR clarify OR identity_block`;

            const response = await this.llm.invoke(prompt);
            const decision = response.content.toString().toLowerCase().trim() as RouterDecision;

            // Validate decision
            const validDecisions: RouterDecision[] = ['retrieve', 'direct_answer', 'clarify', 'identity_block'];
            const routerDecision = validDecisions.includes(decision) ? decision : 'retrieve';

            const endTime = Date.now();
            logger.info(`Decision: ${routerDecision} (LLM, took ${endTime - startTime}ms)`);

            return {
                routerDecision: routerDecision,
                metadata: {
                    ...state.metadata,
                    model: 'gpt-4o-mini (router)'
                }
            };

        } catch (error: any) {
            logger.error(`Error: ${error.message}`);
            return {
                routerDecision: 'retrieve',
                metadata: state.metadata
            };
        }
    }
}

// Export function for LangGraph node
export async function routerAgent(state: ConversationState): Promise<Partial<ConversationState>> {
    const agent = new RouterAgent();
    return await agent.execute(state);
}

