import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in react tree:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-5 shadow-sm">
            <div className="bg-red-50 text-red-650 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-800">Something went wrong</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                An unexpected error occurred in the application. Please reload the page or return to the dashboard.
              </p>
              {this.state.error && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left max-h-36 overflow-y-auto text-[10px] font-mono text-slate-500 leading-normal whitespace-pre-wrap mt-2">
                  {this.state.error.toString()}
                </div>
              )}
            </div>

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
              Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
