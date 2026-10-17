import { type FormEvent, useState } from 'react';
import { Button, Callout, Card, TextField } from '../ui/components';
import { errorText } from './Shell';
import { useSession } from './session';

/**
 * Sign-in: a one-time code the bot sends in Telegram (the owner asks for it with the button,
 * a teacher by writing anything to the bot; OWNER / TEACHER only), a pasted developer token
 * (`pnpm dev:token owner`) and the demo on in-memory data.
 */
export function LoginScreen() {
  const { apiUrl, requestCode, loginWithCode, loginWithToken, startDemo } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Date | null>(null);
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  // The demo on mock data is offered only when asked for (`?demo=1`, `VITE_DEMO=1`) or in dev.
  const demoOffered =
    import.meta.env.DEV ||
    import.meta.env.VITE_DEMO === '1' ||
    new URLSearchParams(window.location.search).has('demo');

  const askCode = () => {
    setBusy(true);
    setError(null);
    requestCode()
      .then((expiresAt) => setSent(expiresAt))
      .catch((e: unknown) => setError(errorText(e)))
      .finally(() => setBusy(false));
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    loginWithCode(code).catch((err: unknown) => {
      setError(errorText(err));
      setBusy(false);
    });
  };

  const submitToken = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      loginWithToken(token.trim(), name);
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="tr tr-desktop ad-login">
      <Card desktop title="ThinkRead · Дашборд" meta="для владельца и учителей">
        <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>
          Вход через Telegram: пускаем только владельца школы и учителей (админов групп с подписью
          teacher). Студентам сюда не нужно — у них Mini App.
        </span>
        <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TextField
            label="Код из Telegram"
            placeholder="123 456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            hint={
              sent
                ? `Код отправлен владельцу в Telegram, действует до ${sent.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`
                : 'Владелец: нажмите «Прислать код», бот напишет вам в Telegram. Учитель: напишите боту любое сообщение — он ответит кодом.'
            }
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              type="submit"
              icon="check"
              disabled={busy || code.replace(/\D/g, '').length !== 6}
            >
              Войти
            </Button>
            <Button variant="secondary" size="md" icon="send" onClick={askCode} disabled={busy}>
              {sent ? 'Прислать ещё раз' : 'Прислать код в Telegram'}
            </Button>
          </div>
        </form>
        {error ? <Callout tone="bad">{error}</Callout> : null}

        <details>
          <summary style={{ fontSize: 13, cursor: 'pointer', color: 'var(--ink-2)' }}>
            Войти по токену разработчика
          </summary>
          <form
            onSubmit={submitToken}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}
          >
            <TextField
              label="JWT"
              placeholder="pnpm dev:token owner"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <TextField
              label="Как вас показывать"
              placeholder="Рустам"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="ad-sub">API: {apiUrl || 'тот же адрес, что и страница'}</span>
            <Button variant="dark" size="md" type="submit" disabled={!token.trim()}>
              Войти
            </Button>
          </form>
        </details>

        <span className="ad-sub" style={{ opacity: 0.6 }}>
          сборка {__BUILD__}
        </span>
        {demoOffered ? (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="tonal" size="md" icon="star" onClick={() => startDemo('OWNER')}>
                Демо: владелец
              </Button>
              <Button variant="ghost" size="md" onClick={() => startDemo('TEACHER')}>
                Демо: учитель
              </Button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              Демо работает на данных из макета, без сервера.
            </span>
          </>
        ) : null}
      </Card>
    </div>
  );
}
