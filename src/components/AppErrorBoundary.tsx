import { Component, type ErrorInfo, type ReactNode } from 'react'
import { captureError } from '../engine/errorReporter'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(`${error.message}\n${info.componentStack}`, 'react.error-boundary')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h2>页面发生异常</h2>
          <p>请刷新页面，系统已记录错误信息。</p>
        </div>
      )
    }
    return this.props.children
  }
}

