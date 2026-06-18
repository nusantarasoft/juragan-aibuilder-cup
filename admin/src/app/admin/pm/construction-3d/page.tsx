"use client";

import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';
import { Spin } from 'antd';

const Construction3D = dynamic(() => import('./Construction3D'), {
  ssr: false,
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#1e1e2e', color: '#f38ba8', minHeight: '100vh' }}>
          <h2 style={{ color: '#cba6f7' }}>⚠️ Construction 3D — Client Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#181825', padding: 16, borderRadius: 8, color: '#f38ba8', fontSize: 13 }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#181825', padding: 16, borderRadius: 8, color: '#a6adc8', fontSize: 11, marginTop: 8 }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Page() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={{ padding: 120, textAlign: 'center' }}><Spin size="large" /></div>}>
        <Construction3D />
      </Suspense>
    </ErrorBoundary>
  );
}
