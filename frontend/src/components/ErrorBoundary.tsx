import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can also log the error to an error reporting service
        console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/dashboard';
    };

    private handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="relative min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900 overflow-hidden px-6">
                    {/* Background orbs */}
                    <div
                        aria-hidden
                        className="orb animate-pulse-orb w-[600px] h-[600px] -top-48 -left-48 opacity-40"
                        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, transparent 70%)' }}
                    />
                    <div
                        aria-hidden
                        className="orb animate-pulse-orb w-[500px] h-[500px] -bottom-32 -right-32 opacity-30"
                        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', animationDelay: '3s' }}
                    />

                    <div className="relative z-10 max-w-md w-full text-center">
                        {/* Icon */}
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 mb-8 mx-auto">
                            <AlertTriangle size={36} className="text-red-400" strokeWidth={1.5} />
                        </div>

                        <h1 className="sansation-regular text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                            Something went wrong
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed mb-8">
                            Cognifast hit an unexpected error. Try reloading or head back to the dashboard.
                        </p>

                        {this.state.error && (
                            <div className="mb-8 px-4 py-3 glass rounded-xl border border-red-500/15 text-left">
                                <p className="text-xs font-mono text-red-400 break-all">
                                    {this.state.error.message || 'An unknown error occurred.'}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                                onClick={this.handleReload}
                                className="inline-flex items-center gap-2 bg-linear-to-r from-emerald-500 to-blue-600 text-white px-8 py-3 rounded-xl text-base font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.03] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer group"
                            >
                                <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="inline-flex items-center gap-2 glass px-8 py-3 rounded-xl text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer"
                            >
                                <Home size={16} />
                                Dashboard
                            </button>
                        </div>

                        <p className="mt-10 text-xs text-gray-400 dark:text-gray-600 font-mono">
                            cf_render_exception
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
