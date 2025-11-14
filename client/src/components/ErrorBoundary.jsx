import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { error: null, info: null };
  }

  componentDidCatch(error, info){
    console.error('ErrorBoundary caught', error, info);
    this.setState({ error, info });
  }

  render(){
    if (this.state.error) {
      return (
        <div style={{padding:20,fontFamily:'sans-serif', backgroundColor: '#fef2f2', border: '1px solid #ef4444', margin: 20, borderRadius: 8}}>
          <h2 style={{color: '#991b1b', fontSize: '1.5rem'}}>Something in the UI failed to render</h2>
          <pre style={{whiteSpace:'pre-wrap',background:'#111',color:'#fff',padding:12, marginTop: 16, borderRadius: 4}}>
            {String(this.state.error && this.state.error.stack)}
          </pre>
          <details style={{whiteSpace:'pre-wrap', marginTop:10}}>
            <summary>Component stack</summary>
            <pre style={{background: '#f3f4f6', padding: 8, borderRadius: 4}}>{this.state.info?.componentStack}</pre>
          </details>
          <p style={{marginTop: 16}}>Open the browser's DevTools console to inspect the full error. The application is temporarily paused to avoid repeated crashes.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;