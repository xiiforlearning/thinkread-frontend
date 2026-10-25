import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { common } from './i18n/common';
import { currentLang } from './i18n/lang';
import { tr } from './i18n/t';
import { RootErrorBoundary } from './lib/ErrorBoundary';
import { setupWebApp } from './telegram/webapp';
import './ui/tokens.css';
import './ui/components.css';
import './ui/app.css';

setupWebApp();
document.documentElement.lang = currentLang();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RootErrorBoundary title={tr(common, 'appCrashed')}>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
