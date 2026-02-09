import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import { checkDatabaseConnection } from './db/dbConnection';
import sourceRoutes from './routes/source.routes';
import chatRoutes from './routes/chat.routes';
import quizRoutes from './routes/quiz.routes';
import { setupChatSocket } from './sockets/chat.socket';
import { createLogger } from './utils/logger';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

const logger = createLogger('SERVER');

const PORT = process.env.PORT || 3000;

dotenv.config({debug: false, path: '.env'});
const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log every incoming request (method + path)
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl || req.url}`);
    next();
});

// Root route
app.get('/', (req, res) => {
    res.send('Cognifast AI API');
});

// Serve uploaded files (must be before /api/sources so /api/sources/files/* is handled here)
app.use('/api/sources/files', express.static(UPLOADS_DIR));

// API routes
app.use('/api/sources', sourceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/quiz', quizRoutes);

// Create HTTP server and Socket.io server
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Setup Socket.io handlers
setupChatSocket(io);

httpServer.listen(PORT, async () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info('Checking database connection...');
    await checkDatabaseConnection();
    logger.info('API endpoints available:');
    logger.info(`   Sources:   http://localhost:${PORT}/api/sources`);
    logger.info(`   Chat:      http://localhost:${PORT}/api/chat`);
    logger.info(`   Quiz:      http://localhost:${PORT}/api/quiz`);
    logger.info(`   WebSocket: ws://localhost:${PORT}`);
});