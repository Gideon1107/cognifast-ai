/**
 * Logger Utility
 * Provides consistent logging with timestamps and context
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function getTimestamp(): string {
    return new Date().toISOString();
}

function formatLog(level: LogLevel, context: string, message: string, ...args: any[]): string {
    const timestamp = getTimestamp();
    const baseLog = `[${timestamp}] [${level}] [${context}] ${message}`;
    return args.length > 0 ? `${baseLog}` : baseLog;
}

export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context.toUpperCase();
    }

    info(message: string, ...args: any[]): void {
        console.log(formatLog('INFO', this.context, message), ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(formatLog('WARN', this.context, message), ...args);
    }

    error(message: string, ...args: any[]): void {
        console.error(formatLog('ERROR', this.context, message), ...args);
    }

    debug(message: string, ...args: any[]): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(formatLog('DEBUG', this.context, message), ...args);
        }
    }
}

// Export convenience function
export function createLogger(context: string): Logger {
    return new Logger(context);
}

