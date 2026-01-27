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
                // Unknown error – avoid logging raw HTML (e.g. Cloudflare 521 pages)
                const msg = sanitizeErrorMessage(error.message);
                logger.error(`Supabase connection error: ${msg}`);
                return false;
            }
        }

        logger.info('Supabase connection: Connected successfully');
        return true;
    } catch (error: any) {
        const msg = sanitizeErrorMessage(error?.message ?? String(error));
        logger.error(`Supabase connection failed: ${msg}`);
        return false;
    }
};

/** Avoid logging full HTML/Cloudflare error pages; return a short, readable summary. */
function sanitizeErrorMessage(raw: string): string {
    if (!raw || typeof raw !== 'string') return String(raw);
    const trimmed = raw.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
        if (trimmed.includes('521') || trimmed.includes('Web server is down'))
            return 'Supabase host unavailable (521: Web server is down). Check Supabase status or whether the project is paused.';
        return 'Supabase returned an HTML error page instead of JSON. Host may be down or misconfigured.';
    }
    return trimmed.length > 500 ? trimmed.slice(0, 500) + '…' : trimmed;
}

export default supabase;