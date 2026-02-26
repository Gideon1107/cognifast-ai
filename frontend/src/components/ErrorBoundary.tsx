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
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0d11] px-4 font-inter">
                    <div className="max-w-md w-full animate-in fade-in zoom-in duration-300">
                        <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 p-10 text-center relative">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
                            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />

                            <div className="w-20 h-20 bg-red-50/80 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-inner border border-red-100 dark:border-red-900/30">
                                <AlertTriangle size={40} strokeWidth={1.5} />
                            </div>

                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
                                Wait, Something Wrong
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg leading-relaxed font-medium">
                                Cognifast ran into an unexpected glitch. Please try again or return to the dashboard.
                            </p>

                            {this.state.error && (
                                <div className="mb-10 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl">
                                    <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words">
                                        Something went wrong while rendering this page.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
                                <button
                                    onClick={this.handleReload}
                                    className="flex items-center justify-center space-x-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95 group"
                                >
                                    <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                                    <span>Try Again</span>
                                </button>
                                <button
                                    onClick={this.handleReset}
                                    className="flex items-center justify-center space-x-2 px-8 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold rounded-2xl transition-all active:scale-95"
                                >
                                    <Home size={18} />
                                    <span>Dashboard</span>
                                </button>
                            </div>


                        </div>

                        <p className="mt-8 text-center text-gray-400 dark:text-gray-600 text-sm font-medium">
                            Error code: <span className="font-mono bg-gray-100 dark:bg-gray-800/50 px-2 py-0.5 rounded text-xs uppercase">cf_render_exception</span>
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
