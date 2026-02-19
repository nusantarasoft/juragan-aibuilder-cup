import React from 'react';
import { Button, Result, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    resetUser = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="w-full h-full flex items-center justify-center p-6 bg-red-50 rounded-lg">
                    <Result
                        status="warning"
                        title="Something went wrong"
                        subTitle={
                            <div className="flex flex-col gap-2">
                                <Typography.Text type="secondary">
                                    The component failed to render.
                                </Typography.Text>
                                {this.state.error && (
                                    <Typography.Text type="danger" className="text-xs font-mono bg-red-100 p-2 rounded">
                                        {this.state.error.message}
                                    </Typography.Text>
                                )}
                            </div>
                        }
                        extra={
                            <Button type="primary" onClick={this.resetUser} icon={<ReloadOutlined />}>
                                Try Again
                            </Button>
                        }
                    />
                </div>
            );
        }

        return this.props.children;
    }
}
