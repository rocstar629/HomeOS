'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Settings,
  Plug,
  FlaskConical,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Unplug,
} from 'lucide-react';
import { useHomeAssistant } from '@/context/HomeAssistantContext';
import { cn } from '@/lib/utils';

interface SettingsStatus {
  configured: boolean;
  source: 'file' | 'env' | null;
  url: string;
  hasToken: boolean;
}

type Busy = 'test' | 'save' | 'remove' | null;
type Message = { kind: 'ok' | 'err'; text: string } | null;

export default function SettingsPage() {
  const { refreshConfig, status, source } = useHomeAssistant();
  const [settings, setSettings] = useState<SettingsStatus | null>(null);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<Message>(null);

  const applyStatus = useCallback((data: SettingsStatus) => {
    setSettings(data);
    setUrl(data.url ?? '');
    setToken('');
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/ha', { cache: 'no-store' });
      if (response.ok) {
        applyStatus((await response.json()) as SettingsStatus);
      }
    } catch {
      // Leave the form as-is; user can retry.
    }
  }, [applyStatus]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/ha', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SettingsStatus | null) => {
        if (!cancelled && data) applyStatus(data);
      })
      .catch(() => {
        // First load failed; the form stays empty for manual entry.
      });
    return () => {
      cancelled = true;
    };
  }, [applyStatus]);

  const post = async (init: RequestInit, kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setMessage(null);
    try {
      const response = await fetch('/api/settings/ha', {
        ...init,
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({
          kind: 'err',
          text: typeof body.error === 'string' ? body.error : 'Something went wrong.',
        });
        return null;
      }
      return body as Record<string, unknown>;
    } catch {
      setMessage({ kind: 'err', text: 'Could not reach the FamilyOS server.' });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    const body = await post(
      { method: 'POST', body: JSON.stringify({ url, token, testOnly: true }) },
      'test'
    );
    if (body) {
      const location = typeof body.location === 'string' ? body.location : undefined;
      const version = typeof body.version === 'string' ? body.version : undefined;
      setMessage({
        kind: 'ok',
        text: `Connected${location ? ` to ${location}` : ''}${version ? ` (HA ${version})` : ''}. Save to apply.`,
      });
    }
  };

  const handleSave = async () => {
    const body = await post({ method: 'POST', body: JSON.stringify({ url, token }) }, 'save');
    if (body) {
      setMessage({ kind: 'ok', text: 'Saved. FamilyOS is now talking to Home Assistant.' });
      setToken('');
      await refreshConfig();
      await load();
    }
  };

  const handleDisconnect = async () => {
    const body = await post({ method: 'DELETE' }, 'remove');
    if (body) {
      setMessage({ kind: 'ok', text: 'App-stored credentials removed.' });
      setToken('');
      await refreshConfig();
      await load();
    }
  };

  const sourceBadge =
    settings?.source === 'env'
      ? 'Environment variables'
      : settings?.source === 'file'
        ? 'Saved in FamilyOS'
        : null;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-zinc-500">Home Assistant connection</p>
        </div>
        <Settings className="w-8 h-8 text-zinc-300" aria-hidden />
      </header>

      {/* Current status */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {status === 'demo' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-500">
                <FlaskConical className="w-3.5 h-3.5" />
                Running on demo data
              </span>
            ) : settings?.configured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 text-xs font-medium">
                <Plug className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                Not configured
              </span>
            )}
            {sourceBadge && (
              <span className="text-xs text-zinc-400">{sourceBadge}</span>
            )}
          </div>
          {!settings?.configured && (
            <span className="text-xs text-zinc-500">
              Enter your Home Assistant details below to go live.
            </span>
          )}
        </div>
        {settings?.url && (
          <div className="text-sm text-zinc-500 break-all">
            {settings.url}
            {source === 'env' && settings.source === 'env' && (
              <span className="block text-xs text-zinc-400 mt-1">
                Set via environment variables. Saving here stores credentials in FamilyOS and
                overrides them.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Credential form */}
      <form
        className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className="space-y-1">
          <label htmlFor="ha-url" className="text-sm font-medium">
            Home Assistant URL
          </label>
          <input
            id="ha-url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://homeassistant.local:8123"
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="ha-token" className="text-sm font-medium">
            Long-lived access token
          </label>
          <input
            id="ha-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={
              settings?.hasToken
                ? '•••••••••• (leave blank to keep the saved token)'
                : 'Paste your Home Assistant token'
            }
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          <p className="text-xs text-zinc-500">
            Profile → Security → Long-lived access tokens in Home Assistant.
          </p>
        </div>

        {message && (
          <div
            className={cn(
              'flex items-center gap-2 text-sm p-3 rounded-xl',
              message.kind === 'ok'
                ? 'bg-green-50 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
            )}
            role="status"
          >
            {message.kind === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
            )}
            {message.text}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={busy !== null || !url}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            {busy === 'test' ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Testing…
              </span>
            ) : (
              'Test connection'
            )}
          </button>
          <button
            type="submit"
            disabled={busy !== null || !url}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
          >
            {busy === 'save' ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </span>
            ) : (
              'Save & connect'
            )}
          </button>
          {settings?.source === 'file' && (
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={busy !== null}
              className="px-4 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Unplug className="w-4 h-4" aria-hidden />
              Disconnect
            </button>
          )}
        </div>

        <p className="text-xs text-zinc-500 leading-relaxed">
          Credentials are stored <strong>only on the server</strong> (in the FamilyOS data
          directory, readable by the app process alone). They are never sent to your browser,
          never included in the client bundle, and never logged. Demo data is used until a
          connection is saved here or provided via environment variables.
        </p>
      </form>
    </div>
  );
}
