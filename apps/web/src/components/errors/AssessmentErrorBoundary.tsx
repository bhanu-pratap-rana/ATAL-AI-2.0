"use client";

/**
 * Assessment Error Boundary
 *
 * Catches errors in assessment components and displays a recovery UI.
 * Preserves student progress and allows reload without data loss.
 */

import React from "react";
import { clientLogger } from "@/lib/client-logger";

interface Props {
  readonly children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AssessmentErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    clientLogger.error("[Assessment] Component error caught by boundary:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReload = () => {
    globalThis.location?.reload();
  };

  handleGoBack = () => {
    globalThis.history?.back();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⚠️</span>
            </div>

            {/* Error Message */}
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Assessment Error
            </h2>
            <p className="text-text-secondary mb-6">
              Something went wrong with the assessment. Your progress has been
              saved and you can try again.
            </p>

            {/* Error Details (for debugging) */}
            {this.state.error && (
              <details className="text-left mb-6 p-4 bg-muted rounded-lg">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-2">
                  Technical Details
                </summary>
                <pre className="text-xs text-error overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Reload Assessment
              </button>
              <button
                onClick={this.handleGoBack}
                className="flex-1 px-4 py-2 bg-white text-text-secondary border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Go Back
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground mt-6">
              If this problem persists, please contact your teacher or
              administrator.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
