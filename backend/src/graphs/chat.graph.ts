import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { ConversationState, Message, RetrievedChunk, ResponseQuality, RouterDecision } from '../types/chat.types';
import { routerAgent } from '../agents/chat/router.agent';
import { retrievalAgent } from '../agents/chat/retrieval.agent';
import { generatorAgent } from '../agents/chat/generator.agent';
import { qualityAgent } from '../agents/chat/quality.agent';
import { createLogger } from '../utils/logger';

const logger = createLogger('CHAT-GRAPH');

/**
 * Chat StateGraph
 * 
 * Flow:
 * START → Router → [Retrieval (optional)] → Generator → Quality → END or back to Generator
 * 
 * Nodes:
 * - router: Decides how to handle the query (retrieve/direct_answer/clarify)
 * - retrieval: Fetches relevant document chunks (only if router says 'retrieve')
 * - generator: Creates the AI response
 * - quality: Evaluates response quality and triggers retry if needed
 * 
 * Edges:
 * - Router → Retrieval (if decision = 'retrieve')
 * - Router → Generator (if decision = 'direct_answer' or 'clarify')
 * - Retrieval → Generator (always)
 * - Generator → Quality (always)
 * - Quality → Generator (if quality = 'poor' and retries < max)
 * - Quality → END (if quality = 'good' or max retries reached)
 */

// Define the state annotation
const StateAnnotation = Annotation.Root({
    conversationId: Annotation<string>,
    sourceIds: Annotation<string[]>,
    messages: Annotation<Message[]>,
    currentQuery: Annotation<string>,
    retrievedChunks: Annotation<RetrievedChunk[]>,
    routerDecision: Annotation<RouterDecision>,
    responseQuality: Annotation<ResponseQuality>,
    retryCount: Annotation<number>,
    metadata: Annotation<Record<string, any>>
});

// Define the graph
const chatGraphBuilder = new StateGraph(StateAnnotation);

// Add nodes
chatGraphBuilder.addNode('router' as any, routerAgent as any);
chatGraphBuilder.addNode('retrieval' as any, retrievalAgent as any);
chatGraphBuilder.addNode('generator' as any, generatorAgent as any);
chatGraphBuilder.addNode('quality' as any, qualityAgent as any);

// Set entry point: START → Router
chatGraphBuilder.addEdge(START, 'router' as any);

// Router → Retrieval OR Generator (conditional based on router decision)
chatGraphBuilder.addConditionalEdges(
    'router' as any,
    (state: any) => {
        logger.info(`Router decision: ${state.routerDecision}`);
        if (state.routerDecision === 'retrieve') {
            return 'retrieval'; // Need to fetch document chunks
        } else {
            return 'generator'; // Direct answer or clarification
        }
    }
);

// Retrieval → Generator (always after retrieval)
chatGraphBuilder.addEdge('retrieval' as any, 'generator' as any);

// Generator → Quality OR END (skip quality check for first message)
chatGraphBuilder.addConditionalEdges(
    'generator' as any,
    (state: any) => {
        // Skip quality check for first message to improve response time
        const isFirstMessage = state.metadata?.isFirstMessage === true;
        if (isFirstMessage) {
            logger.info('Skipping quality check for first message (performance optimization)');
            return 'end';
        }
        return 'quality';
    },
    {
        quality: 'quality' as any,
        end: END
    }
);

// Quality → Generator OR END (conditional based on quality and retry count)
chatGraphBuilder.addConditionalEdges(
    'quality' as any,
    (state: any) => {
        logger.info(`Response quality: ${state.responseQuality}, Retry count: ${state.retryCount}`);
        
        const MAX_RETRIES = 2;
        
        if (state.responseQuality === 'poor' && state.retryCount < MAX_RETRIES) {
            logger.info(`Quality is poor. Retrying... (Attempt ${state.retryCount}/${MAX_RETRIES})`);
            return 'generator'; // Regenerate response
        } else {
            if (state.responseQuality === 'poor' && state.retryCount >= MAX_RETRIES) {
                logger.info('Max retries reached. Accepting response.');
            } else {
                logger.info('Response quality is good. Finishing.');
            }
            return END; // Done
        }
    }
);

// Compile the graph
export const chatGraph = chatGraphBuilder.compile();

/**
 * Execute the chat graph with initial state
 * 
 * @param initialState - The initial conversation state
 * @returns The final conversation state after graph execution
 */
export async function executeChatGraph(initialState: ConversationState): Promise<ConversationState> {
    try {
        logger.info('Chat Graph Execution Started');
        logger.info(`Conversation ID: ${initialState.conversationId}`);
        logger.info(`Source IDs: [${initialState.sourceIds.join(', ')}]`);
        logger.info(`Query: ${initialState.currentQuery}`);
        
        const startTime = Date.now();
        
        // Execute the graph
        const result = await chatGraph.invoke(initialState);
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        // Update metadata
        const finalResult = {
            ...result,
            metadata: {
                ...result.metadata,
                startTime,
                endTime,
                executionTime
            }
        };
        
        return finalResult as ConversationState;
        
    } catch (error: any) {
        logger.error(`Error executing chat graph: ${error.message}`);
        throw new Error(`Chat graph execution failed: ${error.message}`);
    }
}

/**
 * Stream the chat graph execution
 * 
 * Returns an async iterator of state updates from the graph
 * Each yield contains the updated state after each node execution
 */
export async function* streamChatGraph(initialState: ConversationState): AsyncGenerator<Partial<ConversationState>, void, unknown> {
    try {
        logger.info('Chat Graph Streaming Started');
        
        // Get the stream and iterate over it
        const stream = await chatGraph.stream(initialState);
        
        // Stream graph execution - yields state after each node
        for await (const stateUpdate of stream) {
            // stateUpdate is an object with node names as keys
            // Each key contains the state after that node executed
            const stateUpdateAny = stateUpdate as Record<string, Partial<ConversationState>>;
            const nodeNames = Object.keys(stateUpdateAny);
            
            for (const nodeName of nodeNames) {
                const nodeState = stateUpdateAny[nodeName];
                if (nodeState) {
                    logger.info(`[CHAT-GRAPH] Node '${nodeName}' completed`);
                    
                    // Add node name to state for stage detection
                    const stateWithNode = {
                        ...nodeState,
                        _currentNode: nodeName
                    };
                    
                    // Yield the state update with node info
                    yield stateWithNode;
                }
            }
        }
        
        logger.info('Chat Graph Streaming Completed');
        
    } catch (error) {
        logger.error(`Error streaming chat graph: ${error}`);
        throw new Error(`Chat graph streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
