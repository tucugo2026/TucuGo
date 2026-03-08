import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Error inesperado' };
  }

  componentDidCatch(error, info) {
    console.error('TucuGo error boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          maxWidth: 900,
          margin: '40px auto',
          background: 'white',
          borderRadius: 24,
          padding: 24,
          border: '1px solid #ffd7d7'
        }}>
          <h2 style={{ marginTop: 0 }}>TucuGo se encontró con un error</h2>
          <p>La app no se pudo renderizar correctamente en este dispositivo.</p>
          <p><strong>Detalle:</strong> {this.state.message}</p>
          <p>
            Esta versión corregida incluye modo demo local para que puedas verla aunque Firebase o el caché del navegador den problemas.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
