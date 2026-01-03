import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallbackRadius: number
}

interface State {
  hasError: boolean
  error: Error | null
}

export class PlanetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PlanetErrorBoundary] Planet render failed:', error.message)
    console.error('[PlanetErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <mesh>
          <sphereGeometry args={[this.props.fallbackRadius, 16, 16]} />
          <meshBasicMaterial color={0xff0000} />
        </mesh>
      )
    }
    return this.props.children
  }
}
