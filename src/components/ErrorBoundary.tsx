import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface Props {
  children: ReactNode
  className?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground',
            this.props.className
          )}
        >
          <div className="max-w-sm w-full text-center space-y-4">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Try reloading the page.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs text-muted-foreground bg-muted/50 rounded-md p-3 overflow-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleReload} variant="default">
              Reload page
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
