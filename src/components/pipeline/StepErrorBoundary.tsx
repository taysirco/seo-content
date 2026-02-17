'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * React Error Boundary — catches render errors in step components
 * and shows a retry UI instead of crashing the entire app.
 */
export class StepErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[StepErrorBoundary]', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-destructive">
                        <AlertTriangle className="w-6 h-6" />
                        <h3 className="font-semibold text-lg">
                            {this.props.fallbackTitle || 'Something went wrong'}
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        {this.state.error?.message || 'An unexpected error occurred in this step.'}
                    </p>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={this.handleRetry}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
