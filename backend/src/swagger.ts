import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import fs from 'fs';
import path from 'path';

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Cognifast AI API',
            version: '1.0.0',
            description: 'API documentation for Cognifast AI backend',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            schemas: {
                Source: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        type: { type: 'string', enum: ['pdf', 'docx', 'url', 'text'] },
                        url: { type: 'string' },
                        status: { type: 'string', enum: ['processing', 'completed', 'failed'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Conversation: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Message: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        conversationId: { type: 'string', format: 'uuid' },
                        role: { type: 'string', enum: ['user', 'assistant'] },
                        content: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Quiz: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        conversationId: { type: 'string', format: 'uuid' },
                        sourceId: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        totalQuestions: { type: 'integer' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                QuizAttempt: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        quizId: { type: 'string', format: 'uuid' },
                        score: { type: 'integer' },
                        status: { type: 'string', enum: ['in_progress', 'completed'] },
                        completedAt: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        error: { type: 'string' },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
    // Swagger Page
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Docs in JSON format
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
};

export const generateSwaggerJson = () => {
    const outputPath = path.join(__dirname, '..', 'swagger.json');
    fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
    console.log(`Swagger JSON successfully generated at ${outputPath}`);
};
