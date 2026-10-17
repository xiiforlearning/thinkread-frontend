import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

const SESSION_KEYS = ['thinkread.admin.token', 'thinkread.admin.user', 'thinkread.admin.demo'];

/**
 * The last line of defence: a render error must never leave an empty page. Plain markup on
 * purpose — the design system itself may be what failed.
 */
export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('dashboard crashed', error, info.componentStack);
  }

  private reset = (): void => {
    try {
      for (const k of SESSION_KEYS) localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
    window.location.replace(window.location.pathname);
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{ maxWidth: 640, margin: '48px auto', padding: 24, fontFamily: 'system-ui' }}>
        <h1 style={{ fontSize: 20, margin: '0 0 12px' }}>Дашборд не смог отрисоваться</h1>
        <p style={{ margin: '0 0 12px', opacity: 0.8 }}>
          Пришлите этот текст разработчику — он показывает, где именно сломалось.
        </p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 12,
            padding: 12,
            borderRadius: 8,
            background: 'rgba(127,127,127,0.15)',
          }}
        >
          {error.message}
          {'\n'}
          {(error.stack ?? '').split('\n').slice(0, 6).join('\n')}
        </pre>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => window.location.reload()}>
            Обновить страницу
          </button>
          <button type="button" onClick={this.reset}>
            Выйти и начать заново
          </button>
        </div>
      </div>
    );
  }
}
