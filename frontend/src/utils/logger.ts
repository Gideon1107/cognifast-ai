/**
 * Simple Logger Utility for Frontend
 */

export function createLogger(context: string) {
    return {
        info: (message: string) => {
            if (import.meta.env.DEV) {
                console.log(`[${new Date().toISOString()}] [${context}] ${message}`);
            }
        },
        error: (message: string) => {
            console.error(`[${new Date().toISOString()}] [${context}] ${message}`);
        },
        warn: (message: string) => {
            console.warn(`[${new Date().toISOString()}] [${context}] ${message}`);
        },
        debug: (message: string) => {
            if (import.meta.env.DEV) {
                console.debug(`[${new Date().toISOString()}] [${context}] ${message}`);
            }
        },
    };
}

