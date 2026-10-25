import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError } from '../api/types';
import { shellDict } from '../i18n/admin/shell';
import { common } from '../i18n/common';
import { LANGS, setLang, useLang } from '../i18n/lang';
import { tr, useT } from '../i18n/t';
import { Avatar, Badge, Button, Callout, Chip, Icon, NavItem } from '../ui/components';
import { useAdminApi, useSession, useStaff } from './session';

/** Dashboard frame from the design: dark sidebar with counters, scrolling main; optional list pane. */
export function Shell({ pane, children }: { pane?: ReactNode; children: ReactNode }) {
  const t = useT(shellDict);
  const lang = useLang();
  const { pathname } = useLocation();
  const { state, signOut } = useSession();
  const user = useStaff();
  const api = useAdminApi();
  const counts = useQuery({
    queryKey: ['nav-counts'],
    queryFn: async () => {
      const [students, flags] = await Promise.all([
        api.students.list({}),
        api.flags.list({ status: 'NEW' }),
      ]);
      return { students: students.length, flags: flags.length };
    },
    staleTime: 60_000,
  });
  const demo = state.kind === 'signed-in' && state.demo;
  const is = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p));
  const webapp = (import.meta.env.BASE_URL ?? './').replace(/\/?$/, '/') + (demo ? '?demo=1' : '');
  // Phone: the sidebar is a drawer behind a burger button; it closes on navigation.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  return (
    <div className="tr tr-desktop ad-app">
      <header className="ad-topbar">
        <button
          type="button"
          className="ad-burger"
          aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
        <b>ThinkRead</b>
        <span className="ad-topbar-sub">{t('dashboard')}</span>
      </header>
      {menuOpen ? (
        <div className="ad-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      ) : null}
      <aside className={menuOpen ? 'ad-side ad-side-open' : 'ad-side'}>
        <div className="ad-brand">
          <b>ThinkRead</b>
          <span>{t('teacherDashboard')}</span>
        </div>
        <NavItem icon="grid" to="/" active={is('/')}>
          {t('navOverview')}
        </NavItem>
        <NavItem icon="users" to="/students" active={is('/students')} count={counts.data?.students}>
          {t('navStudents')}
        </NavItem>
        <NavItem
          icon="flag"
          to="/flags"
          active={is('/flags')}
          count={counts.data?.flags}
          alert={(counts.data?.flags ?? 0) > 0}
        >
          {t('navFlags')}
        </NavItem>
        <NavItem icon="chat" to="/groups" active={is('/groups')}>
          {t('navGroups')}
        </NavItem>
        <NavItem icon="star" to="/ai" active={is('/ai')}>
          {t('navAi')}
        </NavItem>
        {user.role === 'OWNER' ? (
          <NavItem icon="sliders" to="/settings" active={is('/settings')}>
            {t('navSettings')}
          </NavItem>
        ) : null}
        <div style={{ flexGrow: 1 }} />
        <NavItem icon="phone" href={webapp}>
          {t('openMiniApp')}
        </NavItem>
        <NavItem icon="logout" onClick={signOut}>
          {t('signOut')}
        </NavItem>
        {/* Language switch: the chips sit on the dark sidebar, so their colours are inverted inline. */}
        <div className="ad-lang" role="group" aria-label={t('language')}>
          <span>{t('language')}</span>
          {LANGS.map((l) => (
            <Chip
              key={l}
              selected={lang === l}
              onClick={() => setLang(l)}
              style={{
                height: 22,
                padding: '0 8px',
                fontSize: 11,
                background: lang === l ? 'var(--surface)' : 'transparent',
                color: lang === l ? 'var(--ink)' : 'var(--on-hero-muted)',
                boxShadow: lang === l ? 'none' : 'inset 0 0 0 1px var(--hero-overlay)',
              }}
            >
              {l.toUpperCase()}
            </Chip>
          ))}
        </div>
        <div className="ad-user">
          <Avatar name={user.name} size="sm" tone="white" />
          <span style={{ minWidth: 0 }}>
            <b>{user.name}</b>
            <span>
              {user.role} · Asia/Tashkent{demo ? ` · ${tr(common, 'demo')}` : ''}
            </span>
          </span>
        </div>
      </aside>
      {pane}
      <main className="ad-main">{children}</main>
    </div>
  );
}

export function PageHead({
  title,
  subtitle,
  aside,
  size = 'lg',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  size?: 'lg' | 'md';
}) {
  return (
    <div className="ad-head" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        {size === 'lg' ? <h1 className="ad-h1">{title}</h1> : <h2 className="ad-h2">{title}</h2>}
        {subtitle ? <span className="ad-sub">{subtitle}</span> : null}
      </div>
      {aside}
    </div>
  );
}

export function Loading({ text }: { text?: string }) {
  const t = useT(common);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: 'var(--ink-2)',
        padding: '24px 0',
        justifyContent: 'center',
        fontSize: 14,
      }}
    >
      <Icon name="spinner" /> {text ?? t('loading')}
    </div>
  );
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return tr(common, 'somethingWrong');
}

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  const t = useT(common);
  return (
    <Callout tone="bad" title={t('failed')}>
      {errorText(error)}
      {retry ? (
        <div style={{ marginTop: 8 }}>
          <Button variant="secondary" size="sm" icon="refresh" onClick={retry}>
            {t('retry')}
          </Button>
        </div>
      ) : null}
    </Callout>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--ink-2)', textAlign: 'center' }}>
      {children}
    </div>
  );
}

/** "Появится позже" marker for stage-8 features the real backend does not serve yet. */
export function SoonBadge() {
  const t = useT(shellDict);
  return <Badge tone="neutral">{t('soon')}</Badge>;
}
