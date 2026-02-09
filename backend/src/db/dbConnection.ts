import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { createLogger } from '../utils/logger';
import * as schema from './schema';

dotenv.config();

const logger = createLogger('DB-CONNECTION');

// Create a connection pool using the DATABASE_URL from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the Drizzle ORM client with all schema tables
export const db = drizzle(pool, { schema });

// Expose the raw pool for edge cases (e.g. raw SQL / vector search function)
export { pool };

// Function to check and log database connection status
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Database connection: Connected successfully');
    return true;
  } catch (error: any) {
    logger.error(`Database connection failed: ${error.message ?? error}`);
    return false;
  }
};

// Gracefully shut down the pool (call on process exit)
export const closePool = async (): Promise<void> => {
  await pool.end();
  logger.info('Database pool closed');
};
