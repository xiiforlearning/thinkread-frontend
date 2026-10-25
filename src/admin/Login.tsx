import { type FormEvent, useState } from 'react';
import { loginDict } from '../i18n/admin/login';
import { useT } from '../i18n/t';
import { Button, Callout, Card, TextField } from '../ui/components';
import { fmtTime } from './format';
import { errorText } from './Shell';
import { useSession } from './session';

/**
 * Sign-in: a one-time code the bot sends in Telegram (the owner asks for it with the button,
 * a teacher by writing anything to the bot; OWNER / TEACHER only), a pasted developer token
 * (`pnpm dev:token owner`) and the demo on in-memory data.
 */
export function LoginScreen() {
  const t = useT(loginDict);
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
      <Card desktop title={t('title')} meta={t('meta')}>
        <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>
          {t('intro')}
        </span>
        <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TextField
            label={t('codeLabel')}
            placeholder="123 456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            hint={sent ? t('codeSent', { time: fmtTime(sent) }) : t('codeHint')}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              type="submit"
              icon="check"
              disabled={busy || code.replace(/\D/g, '').length !== 6}
            >
              {t('signIn')}
            </Button>
            <Button variant="secondary" size="md" icon="send" onClick={askCode} disabled={busy}>
              {sent ? t('resendCode') : t('sendCode')}
            </Button>
          </div>
        </form>
        {error ? <Callout tone="bad">{error}</Callout> : null}

        <details>
          <summary style={{ fontSize: 13, cursor: 'pointer', color: 'var(--ink-2)' }}>
            {t('devToken')}
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
              label={t('nameLabel')}
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="ad-sub">API: {apiUrl || t('apiSameOrigin')}</span>
            <Button variant="dark" size="md" type="submit" disabled={!token.trim()}>
              {t('signIn')}
            </Button>
          </form>
        </details>

        <span className="ad-sub" style={{ opacity: 0.6 }}>
          {t('build', { build: __BUILD__ })}
        </span>
        {demoOffered ? (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="tonal" size="md" icon="star" onClick={() => startDemo('OWNER')}>
                {t('demoOwner')}
              </Button>
              <Button variant="ghost" size="md" onClick={() => startDemo('TEACHER')}>
                {t('demoTeacher')}
              </Button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('demoNote')}</span>
          </>
        ) : null}
      </Card>
    </div>
  );
}
