# Cognifast AI - Architecture Flow Diagram

This document provides a comprehensive visual representation of how services and sockets interact in the Cognifast AI application.

## Complete System Flow

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer"]
        ChatUI[Chat.tsx<br/>User Interface]
        WebSocketHook[useWebSocket Hook<br/>WebSocket Management]
        ZustandStore[Zustand Store<br/>Global State]
        WebSocketClient[websocket.ts<br/>Socket.io Client]
    end

    subgraph WebSocket["WebSocket Connection"]
        SocketIO[Socket.io<br/>Bidirectional Connection]
    end

    subgraph BackendSocket["Backend Socket Handlers"]
        ChatSocket[chat.socket.ts<br/>Event Handlers]
        SocketServer[Socket.io Server<br/>index.ts]
    end

    subgraph StreamingService["Chat Streaming Service"]
        ChatStreamService[chat-stream.service.ts<br/>Orchestrates Streaming]
        ChatService[chat.service.ts<br/>Conversation Management]
    end

    subgraph LangGraph["LangGraph Execution"]
        ChatGraph[chat.graph.ts<br/>State Graph]
        RouterNode[Router Node]
        RetrievalNode[Retrieval Node]
        GeneratorNode[Generator Node]
        QualityNode[Quality Node]
        IdentityResponseNode[identity_response Node<br/>Canned deflection]
    end

    subgraph Agents["Agent Layer"]
        RouterAgent[RouterAgent<br/>Query Analysis]
        RetrievalAgent[RetrievalAgent<br/>Document Retrieval]
        GeneratorAgent[GeneratorAgent<br/>Response Generation]
        QualityAgent[QualityAgent<br/>Quality Check]
    end

    subgraph Services["Service Layer"]
        RetrievalService[RetrievalService<br/>Vector Search]
        EmbeddingService[EmbeddingService<br/>Embedding Generation]
    end

    subgraph Database["Database Layer"]
        Postgres[(PostgreSQL<br/>Drizzle + pg Pool + PgVector)]
        MessagesTable[(messages table)]
        ConversationsTable[(conversations table)]
        ChunksTable[(source_chunks table)]
    end

    subgraph External["External Services"]
        OpenAI[OpenAI API<br/>LLM + Embeddings]
    end

    %% Frontend Flow
    ChatUI -->|1. User sends message| WebSocketHook
    WebSocketHook -->|2. sendMessage| WebSocketClient
    WebSocketClient -->|3. emit 'send_message'| SocketIO
    WebSocketHook -->|Updates state| ZustandStore
    ChatUI -->|Reads state| ZustandStore

    %% WebSocket Connection
    SocketIO <-->|Bidirectional| SocketServer

    %% Backend Socket Flow
    SocketServer -->|4. Receives 'send_message'| ChatSocket
    ChatSocket -->|5. emit 'message_start'| SocketServer
    SocketServer -->|6. Forward events| SocketIO
    ChatSocket -->|7. Calls| ChatStreamService

    %% Streaming Service Flow
    ChatStreamService -->|8. Get conversation| ChatService
    ChatService -->|9. Query| ConversationsTable
    ChatService -->|10. Query| MessagesTable
    ChatStreamService -->|11. Create onToken callback| ChatStreamService
    ChatStreamService -->|12. Stream execution| ChatGraph
    ChatStreamService -->|13. Save user message| MessagesTable

    %% LangGraph Flow
    ChatGraph -->|14. Execute| RouterNode
    RouterNode -->|15. Calls| RouterAgent
    RouterAgent -->|16. LLM call| OpenAI
    
    RouterNode -->|17. Decision: 'retrieve'| RetrievalNode
    RouterNode -->|18. Decision: 'direct_answer' or 'clarify'| GeneratorNode
    RouterNode -->|18b. Decision: 'identity_block'| IdentityResponseNode
    IdentityResponseNode -->|18c. Canned message| FlowEnd[(Flow ends)]
    
    RetrievalNode -->|19. Execute| RetrievalAgent
    RetrievalAgent -->|20. Calls| RetrievalService
    RetrievalService -->|21. Generate query embedding| EmbeddingService
    EmbeddingService -->|22. API call| OpenAI
    RetrievalService -->|23. Vector search| Postgres
    Postgres -->|24. Query| ChunksTable
    RetrievalService -->|25. Returns chunks| RetrievalAgent
    RetrievalAgent -->|26. Updates state| RetrievalNode
    RetrievalNode -->|27. Always| GeneratorNode
    
    GeneratorNode -->|28. Execute| GeneratorAgent
    GeneratorAgent -->|29. Check onToken in metadata| GeneratorAgent
    GeneratorAgent -->|30. Stream tokens| OpenAI
    GeneratorAgent -->|31. Call onToken for each token| ChatStreamService
    ChatStreamService -->|32. emit 'message_token'| SocketServer
    SocketServer -->|33. Forward| SocketIO
    SocketIO -->|34. Receives token| WebSocketClient
    WebSocketClient -->|35. appendStreamingContent| WebSocketHook
    WebSocketHook -->|36. Updates| ZustandStore
    ZustandStore -->|37. Triggers re-render| ChatUI
    
    GeneratorNode -->|38. After completion| QualityNode
    QualityNode -->|39. Execute| QualityAgent
    QualityAgent -->|40. LLM evaluation| OpenAI
    QualityAgent -->|41. Quality: 'poor' and retries < max| GeneratorNode
    QualityAgent -->|42. Quality: 'good' or max retries| ChatGraph
    
    %% Finalization
    ChatStreamService -->|43. Save assistant message| MessagesTable
    ChatStreamService -->|44. Update conversation| ConversationsTable
    ChatStreamService -->|45. emit 'message_end'| SocketServer
    SocketServer -->|46. Forward| SocketIO
    SocketIO -->|47. Receives| WebSocketClient
    WebSocketClient -->|48. finalizeStreamingMessage| WebSocketHook
    WebSocketHook -->|49. Updates| ZustandStore

    %% Loading States Flow
    ChatStreamService -->|50. Detect node changes| ChatStreamService
    ChatStreamService -->|51. emit 'loading_stage'| SocketServer
    SocketServer -->|52. Forward| SocketIO
    SocketIO -->|53. Receives| WebSocketClient
    WebSocketClient -->|54. setLoadingState| WebSocketHook
    WebSocketHook -->|55. Updates| ZustandStore

    %% Styling
    classDef frontend fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef websocket fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef backend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef agent fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef service fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef database fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef external fill:#ffebee,stroke:#b71c1c,stroke-width:2px

    class ChatUI,WebSocketHook,ZustandStore,WebSocketClient frontend
    class SocketIO,SocketServer,ChatSocket websocket
    class ChatStreamService,ChatService,ChatGraph,IdentityResponseNode backend
    class RouterAgent,RetrievalAgent,GeneratorAgent,QualityAgent agent
    class RetrievalService,EmbeddingService service
    class Postgres,MessagesTable,ConversationsTable,ChunksTable database
    class OpenAI external
```

## Detailed Component Interactions

### 1. Message Sending Flow (Steps 1-12)

**User Action → Frontend → WebSocket → Backend**

1. User types message in `Chat.tsx`
2. `handleSendMessage()` calls `sendMessageViaWebSocket()` from `useWebSocket` hook
3. Hook emits `send_message` event via Socket.io client
4. Backend `chat.socket.ts` receives event
5. Socket handler emits `message_start` event to frontend
6. Socket handler calls `streamChatGraphWithWebSocket()`
7. Service fetches conversation data from database
8. Service saves user message to database
9. Service creates `onToken` callback for streaming
10. Service initializes LangGraph state with callback in metadata
11. Service starts streaming graph execution

### 2. LangGraph Execution Flow (Steps 13-42)

**Router → Retrieval (conditional) / Generator / identity_response (conditional) → Generator → Quality → End/Retry**

13. **Router Agent** (`router.agent.ts`):
    - Analyzes user query using OpenAI GPT-4o-mini
    - Returns one of four decisions: `'retrieve'`, `'direct_answer'`, `'clarify'`, or `'identity_block'`
    - If `'retrieve'`: routes to Retrieval Node
    - If `'direct_answer'` or `'clarify'`: routes directly to Generator Node
    - If `'identity_block'`: routes to `identity_response` node (canned deflection message, then END; no quality check)

14. **Retrieval Agent** (`retrieval.agent.ts`) - Only if router decision is `'retrieve'`:
    - Calls `RetrievalService.retrieveRelevantChunks()`
    - RetrievalService calls `EmbeddingService.generateQueryEmbedding()`
    - EmbeddingService calls OpenAI API for query embedding
    - RetrievalService performs vector search in PostgreSQL using `match_sources_chunks` RPC
    - Returns top 5 relevant chunks with similarity scores
    - Updates state with retrieved chunks

15. **Generator Agent** (`generator.agent.ts`):
    - Checks if `onToken` callback exists in state metadata
    - If yes: Uses `llm.stream()` for token-by-token streaming
    - Calls `onToken(token)` for each token received from OpenAI
    - If no: Uses `llm.invoke()` for non-streaming (REST API compatibility)
    - Creates assistant message with complete content
    - Includes sources from retrieved chunks (if any)

16. **Quality Agent** (`quality.agent.ts`):
    - Evaluates response quality using OpenAI GPT-4o-mini
    - Returns `'good'` or `'poor'`
    - If `'poor'` and `retryCount < 2`: routes back to Generator Node
    - If `'good'` or `retryCount >= 2`: routes to END

### 3. Streaming Flow (Steps 31-49)

**Token-by-Token Streaming Back to Frontend**

31. Generator agent calls `onToken(token)` for each token
32. `onToken` callback in `chat-stream.service.ts` immediately emits `message_token` event
33. Socket.io server forwards event to connected client
34. Frontend `useWebSocket` hook receives `message_token` event
35. Hook calls `appendStreamingContent()` to update Zustand store
36. Store update triggers re-render in `Chat.tsx`
37. UI displays streaming tokens in real-time

### 4. Loading States Flow (Steps 50-55)

**Stage-Specific Loading Messages**

50. `chat-stream.service.ts` monitors graph execution state
51. Detects when current node changes (router → retrieval → generator)
52. Emits `loading_stage` event with stage name and message:
    - `router`: "Looking for cues..."
    - `retrieval`: "Reviewing document..."
    - `generator`: "Generating response..."
53. Frontend receives `loading_stage` event
54. Hook calls `setLoadingState()` to update Zustand store
55. UI displays modern gradient spinner with italicized stage message

### 5. Finalization Flow (Steps 43-49)

**Message Completion and Persistence**

43. After graph execution completes, `chat-stream.service.ts` saves final assistant message to database
44. Updates conversation `updated_at` timestamp
45. Emits `message_end` event with complete message object
46. Frontend receives `message_end` event
47. Hook calls `finalizeStreamingMessage()` to convert streaming content to final message
48. Store updates with complete message
49. UI displays final message with proper formatting

## Key Design Patterns

### 1. **Optimistic UI Updates**
- Frontend immediately adds user message to Zustand store before sending
- Provides instant feedback to user
- Reverts on error

### 2. **Token-by-Token Streaming**
- `onToken` callback passed through LangGraph state metadata
- Allows immediate emission of tokens without waiting for complete response
- Provides real-time feedback during generation

### 3. **Conditional Routing**
- Router agent decides execution path based on query analysis
- Retrieval only happens when needed
- Reduces latency for simple queries

### 4. **Quality Assurance Loop**
- Quality agent evaluates responses
- Automatic retry mechanism for poor quality responses
- Prevents infinite loops with max retry limit

### 5. **State Management**
- Zustand store maintains global state
- Messages persist across component re-renders
- Real-time updates via WebSocket events

## Database Schema Interactions

### Messages Table
- **Insert**: User messages (step 13), Assistant messages (step 43)
- **Select**: Conversation history for context (step 8)

### Conversations Table
- **Select**: Conversation details and document IDs (step 8)
- **Update**: `updated_at` timestamp on new messages (step 44)

### Source Chunks Table
- **Select**: Vector search via `match_sources_chunks` RPC (step 23)
- **Filter**: By source IDs associated with conversation

## WebSocket Events

### Client → Server
- `join_conversation`: Join conversation room
- `send_message`: Send user message
- `leave_conversation`: Leave conversation room

### Server → Client
- `joined_conversation`: Confirmation of room join
- `message_start`: Streaming started
- `loading_stage`: Stage-specific loading message
- `message_token`: Individual token from streaming response
- `message_end`: Streaming complete with final message
- `error`: Error occurred during processing

## Error Handling

- **Connection Errors**: Socket.io automatically reconnects
- **Processing Errors**: Emitted as `error` events to frontend
- **Database Errors**: Logged and propagated to frontend
- **API Errors**: Handled in respective agents/services

## Performance Optimizations

1. **First Message Skip**: Quality check skipped for first message to improve response time
2. **Conditional Retrieval**: Only retrieves when router determines it's needed
3. **Streaming**: Token-by-token streaming provides immediate feedback
4. **Connection Reuse**: Single Socket.io connection per client
5. **Room-Based Broadcasting**: Messages only sent to relevant conversation rooms

