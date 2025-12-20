import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import { checkDatabaseConnection } from './db/dbConnection';
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import { createLogger } from './utils/logger';

const logger = createLogger('SERVER');

const PORT = process.env.PORT || 3000;

dotenv.config({debug: false, path: '.env'});
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.send('Cognifast AI API');
});

app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

app.listen(PORT, async () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info('Checking database connection...');
    await checkDatabaseConnection();
    logger.info('API endpoints available:');
    logger.info(`   Documents: http://localhost:${PORT}/api/documents`);
    logger.info(`   Chat:      http://localhost:${PORT}/api/chat`);
});