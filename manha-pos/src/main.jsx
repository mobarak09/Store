import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Simple Error Boundary to catch crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("CRITICAL APP CRASH:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#FEF2F2', height: '100vh', color: '#991B1B' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>⚠️ Critical System Error</h1>
          <p>The application crashed before it could start.</p>
          
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #FECACA', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Error Details:</h3>
            <pre style={{ color: '#DC2626', whiteSpace: 'pre-wrap' }}>
              {this.state.error && this.state.error.toString()}
            </pre>
            <hr style={{ borderColor: '#FECACA', margin: '20px 0' }}/>
            <p><strong>Common Fixes:</strong></p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>Check browser console (F12) for more details.</li>
              <li>Ensure Vercel Environment Variables are set correctly.</li>
              <li>Did you redeploy after adding environment variables?</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
