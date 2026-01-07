import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import { checkDatabaseConnection } from './db/dbConnection';
import sourceRoutes from './routes/source.routes';
import chatRoutes from './routes/chat.routes';
import { setupChatSocket } from './sockets/chat.socket';
import { createLogger } from './utils/logger';

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

// Root route
app.get('/', (req, res) => {
    res.send('Cognifast AI API');
});

// API routes
app.use('/api/sources', sourceRoutes);
app.use('/api/chat', chatRoutes);

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
    logger.info(`   WebSocket: ws://localhost:${PORT}`);
});