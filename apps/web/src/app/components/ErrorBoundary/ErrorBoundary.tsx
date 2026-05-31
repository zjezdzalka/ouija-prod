'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional custom fallback UI. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Optional name shown in the default fallback (e.g. "Chat Window") */
  name?: string
}

interface State {
  error: Error | null
}

/**
 * Generic React error boundary.
 *
 * Catches render-time errors in the subtree and renders a fallback instead
 * of letting the whole page go blank.
 *
 * Usage:
 *   <ErrorBoundary name="Chat Window">
 *     <ChatWindow ... />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd send this to an error-tracking service (Sentry, etc.)
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    const { children, fallback, name = 'This section' } = this.props

    if (error) {
      if (fallback) return fallback(error, this.reset)

      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-muted, #888)'
          }}
        >
          <p style={{ marginBottom: '0.75rem' }}>
            {name} ran into an unexpected error.
          </p>
          <button
            onClick={this.reset}
            style={{
              padding: '0.4rem 1rem',
              cursor: 'pointer',
              borderRadius: '6px',
              border: '1px solid currentColor',
              background: 'transparent',
              color: 'inherit'
            }}
          >
            Try again
          </button>
        </div>
      )
    }

    return children
  }
}
