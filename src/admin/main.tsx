import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../ui/tokens.css';
import '../ui/components.css';
import '../ui/app.css';
import '../ui/admin.css';
import { colorScheme, insideTelegram, setupWebApp } from '../telegram/webapp';
import App from './App';
import { RootErrorBoundary } from '../lib/ErrorBoundary';

// Inside the Telegram Mini App (the owner opened the dashboard from the app): tell Telegram we
// are ready, expand, and mark the document so the layout keeps clear of Telegram's header.
if (insideTelegram()) {
  setupWebApp();
  document.documentElement.classList.add('tg-inside');
}

// The design tokens switch on `data-theme`; the dashboard follows the system scheme.
// `?theme=light|dark` in the URL pins one (support: "is it the dark theme that looks broken?").
const pinned = new URLSearchParams(window.location.search).get('theme');
const scheme = window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme = (): void =>
  document.documentElement.setAttribute(
    'data-theme',
    pinned === 'light' || pinned === 'dark'
      ? pinned
      : insideTelegram()
        ? colorScheme()
        : scheme.matches
          ? 'dark'
          : 'light',
  );
applyTheme();
scheme.addEventListener('change', applyTheme);

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RootErrorBoundary title="Дашборд не смог отрисоваться">
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
