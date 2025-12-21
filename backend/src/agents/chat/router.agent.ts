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
            modelName: 'gpt-4o-mini', // Fast model for routing
            temperature: 0, // Deterministic routing
            openAIApiKey: process.env.OPENAI_API_KEY
        });
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
            const conversationHistory = state.messages
                .slice(-6)
                .map(m => `${m.role}: ${m.content}`)
                .join('\n');

            const docCount = Array.isArray(state.documentIds) ? state.documentIds.length : 0;
            const hasDocuments = docCount > 0;

            logger.info('Using LLM for routing decision');

            const prompt = `You are a router for a document-grounded chat system.

Task: choose exactly ONE label for the user query.

Labels:
- retrieve: get relevant chunks from the attached documents before answering
- direct_answer: respond without retrieval (greetings/thanks/pleasantries or questions unrelated to document content)
- clarify: ask a clarifying question ONLY if the user input is too unclear to act on

Context:
- documents_attached: ${hasDocuments ? 'yes' : 'no'} (count=${docCount})
- recent_messages:
${conversationHistory || '(none)'}

Rules (important):
1) If documents_attached=yes: choose retrieve for ANY factual question that could be answered from the documents, even if it is a yes/no question.
   Examples of document-grounded factual questions: skills, programming, experience, work history, education, certifications, projects, tools, technologies, roles, companies, dates, achievements.
2) Choose direct_answer ONLY for social/utility messages (hi/hello/thanks/bye), or meta questions unrelated to document content.
3) Choose clarify ONLY for extremely underspecified inputs (e.g. "?", "what", "huh") or missing referent (e.g. "what about that?" with no context).
4) If uncertain and documents_attached=yes, prefer retrieve.

Examples:
User: "Does he have a programming skill?" (documents_attached=yes) -> retrieve
User: "Hi" -> direct_answer
User: "?" -> clarify
User: "What is RAG?" (documents_attached=yes) -> direct_answer

User query: "${query}"

Return only one word: retrieve OR direct_answer OR clarify`;

            const response = await this.llm.invoke(prompt);
            const decision = response.content.toString().toLowerCase().trim() as RouterDecision;

            // Validate decision
            const validDecisions: RouterDecision[] = ['retrieve', 'direct_answer', 'clarify'];
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

