import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import { setupSwagger } from './swagger';
import { checkDatabaseConnection, closePool } from './db/dbConnection';
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

setupSwagger(app);

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

app.get('/api/health', async (req, res) => {
    const healthStatus = await checkDatabaseConnection();

    if (healthStatus) {
        res.status(200).json({
            status: "ok",
            database: "connected"
        })
    }
    else {
        res.status(500).json({
            status: "unhealthy",
            database: "disconnected"
        })
    }
})

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

// Graceful shutdown: stop accepting connections, then close the DB pool
const SHUTDOWN_TIMEOUT_MS = 10_000;
let isShuttingDown = false;

const gracefulShutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (isShuttingDown) {
        logger.warn(`Received ${signal} during shutdown; already shutting down`);
        return;
    }
    isShuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully...`);

    // Force exit if cleanup hangs (e.g. long-lived connections)
    const forceExitTimer = setTimeout(() => {
        logger.error(`Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms, forcing exit`);
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    let exitCode = 0;

    // io.close() disconnects all sockets and closes the underlying HTTP server
    try {
        await new Promise<void>((resolve, reject) => {
            io.close((err) => (err ? reject(err) : resolve()));
        });
        logger.info('HTTP and WebSocket server closed');
    } catch (error: any) {
        exitCode = 1;
        logger.error(`Error closing HTTP server: ${error?.message ?? error}`);
    }

    try {
        await closePool();
    } catch (error: any) {
        exitCode = 1;
        logger.error(`Error closing database pool: ${error?.message ?? error}`);
    }

    clearTimeout(forceExitTimer);
    process.exit(exitCode);
};

process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
