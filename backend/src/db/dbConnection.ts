import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv';
import { createLogger } from '../utils/logger';

dotenv.config();

const logger = createLogger('DB-CONNECTION');

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
)

// Function to check and log database connection status
export const checkDatabaseConnection = async (): Promise<boolean> => {
    try {
        // Test connection by attempting a simple query
        // This will work even if tables don't exist yet
        const { error } = await supabase
            .from('_connection_test')
            .select('*')
            .limit(0);

        // If we get a "table not found" error, connection is working
        // If we get auth/network errors, connection failed
        if (error) {
            // Check for table not found errors (connection is working)
            if (error.code === 'PGRST116' || 
                error.code === '42P01' ||
                error.message.includes('Could not find the table') ||
                error.message.includes('relation') && error.message.includes('does not exist')) {
                // Table doesn't exist, but connection is working
                logger.info('Supabase connection: Connected successfully');
                return true;
            } else if (error.message.includes('Invalid API key') || 
                      error.message.includes('JWT') ||
                      error.message.includes('API key')) {
                logger.error('Invalid API key or authentication failed');
                logger.error('Please check your SUPABASE_KEY in .env file');
                return false;
            } else if (error.message.includes('fetch') || 
                      error.message.includes('network') ||
                      error.message.includes('ENOTFOUND')) {
                logger.error('Network error');
                logger.error('Please check your SUPABASE_URL in .env file');
                return false;
            } else {
                // Unknown error
                logger.error(`Supabase connection error: ${error.message}`);
                return false;
            }
        }

        logger.info('Supabase connection: Connected successfully');
        return true;
    } catch (error: any) {
        logger.error(`Supabase connection failed: ${error.message}`);
        return false;
    }
};

export default supabase;