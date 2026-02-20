/**
 * Identity Agent - Handles identity-related queries
 */

import { ConversationState, Message } from '../../types/chat.types';
import { v4 as uuidv4 } from 'uuid';


export class IdentityAgent {

    async execute(state: ConversationState): Promise<Partial<ConversationState>> {
        const cannedMessage: Message = {
            id: uuidv4(),
            conversationId: state.conversationId,
            role: 'assistant',
            content: "I'm an AI assistant here to help you get answers from your documents. I can't share details about my model or identity. What would you like to know about your sources?",
            createdAt: new Date().toISOString(),
        };
        return { messages: [...state.messages, cannedMessage] };
    }
}

// Export function for LangGraph node
export async function identityAgent(state: ConversationState): Promise<Partial<ConversationState>> {
    const agent = new IdentityAgent();
    return await agent.execute(state);
}