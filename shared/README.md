# Shared Types

This folder contains TypeScript types and constants shared between the frontend and backend.

## Structure

```
shared/
├── types/
│   ├── entities.ts    # Domain models (Message, Conversation, Document)
│   ├── api.ts         # API request/response types
│   └── index.ts       # Central export
└── constants/         # Shared constants (to be added)
```

## Usage

### In Backend

Types are imported using the `@shared` path alias:

```typescript
import type {
    Message,
    MessageSource,
    StartConversationRequest,
    SendMessageResponse
} from '@shared/types';
```

The path alias is configured in `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

### In Frontend (When Set Up)

Configure the same path alias in `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

Then import the same way:

```typescript
import type {
    Message,
    SendMessageRequest,
    SendMessageResponse
} from '@shared/types';
```

## Type Categories

### Entity Types (`entities.ts`)

Domain models representing core business entities:
- `Message` - Chat message with role, content, and optional sources
- `MessageSource` - Citation/source for AI-generated messages
- `Conversation` - Conversation metadata with document context
- `DocumentMetadata` - Document information and metadata
- `MessageRole` - Type union for message roles

### API Types (`api.ts`)

Request and response types for all API endpoints:

#### Chat API
- `StartConversationRequest` / `StartConversationResponse`
- `SendMessageRequest` / `SendMessageResponse`
- `GetConversationResponse`
- `DeleteConversationResponse`

#### Document API
- `DocumentUploadResponse`
- `GetDocumentsResponse`
- `GetDocumentResponse`

## Benefits

1. **Type Safety**: Ensures frontend and backend use the same types
2. **Single Source of Truth**: Types defined once, used everywhere
3. **Refactoring Safety**: Changing a type updates both frontend and backend
4. **Developer Experience**: Better autocomplete and type checking
5. **Documentation**: Types serve as API documentation

## Notes

- Backend-only types (like `ConversationState`, `SendMessageResult`) remain in `backend/src/types/`
- Shared types are NOT compiled by the backend build - they're referenced as source files
- When adding new API endpoints, add request/response types to `api.ts`
- When adding new domain entities, add them to `entities.ts`

