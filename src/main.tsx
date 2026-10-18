import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RootErrorBoundary } from './lib/ErrorBoundary';
import { setupWebApp } from './telegram/webapp';
import './ui/tokens.css';
import './ui/components.css';
import './ui/app.css';

setupWebApp();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RootErrorBoundary title="Приложение не смогло отрисоваться">
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
