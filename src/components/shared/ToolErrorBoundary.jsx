'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * ToolErrorBoundary — catches runtime errors in an M5 tool subtree and
 * shows a fallback UI that lets the user either retry (clears the error
 * state) or fully reset the tool via the onReset prop.
 *
 * Usage:
 *   <ToolErrorBoundary toolName="Home Decision Analyzer" onReset={handleReset}>
 *     <MaritalHomeDecisionAnalyzer />
 *   </ToolErrorBoundary>
 */
export class ToolErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ToolErrorBoundary]', this.props.toolName, error, errorInfo);
  }

  handleRetry() {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ToolErrorFallback
          toolName={this.props.toolName}
          onRetry={this.handleRetry}
          onReset={this.props.onReset}
        />
      );
    }
    return this.props.children;
  }
}

export function ToolErrorFallback({ toolName, onRetry, onReset }) {
  return (
    <div className="flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md bg-[#FAF8F2] border border-[#C0392B]/20 rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle size={32} className="text-amber-500" />
        </div>
        <h2
          className="mb-2 text-[#1B2A4A]"
          style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '24px', fontWeight: 700 }}
        >
          Something went wrong with {toolName}
        </h2>
        <p className="mb-6 text-[#1B2A4A]" style={{ fontSize: '16px' }}>
          Your Blueprint data is safe and unchanged.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="bg-[#1B2A4A] text-white hover:bg-[#0F1A2E] px-4 py-2 rounded"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={onReset}
            className="bg-white border border-[#1B2A4A] text-[#1B2A4A] hover:bg-gray-50 px-4 py-2 rounded"
          >
            Reset This Tool
          </button>
        </div>
      </div>
    </div>
  );
}

export default ToolErrorBoundary;
