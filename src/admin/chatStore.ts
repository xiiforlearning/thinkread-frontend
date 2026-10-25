import { useSyncExternalStore } from 'react';

export interface ChatMsg {
  from: 'me' | 'ai';
  text: string;
  copyable?: boolean;
}

/**
 * The dashboard's AI chats (school-wide and per student) live here, not in the screen: the
 * owner leaves to Settings and comes back, and the conversation is still there. Kept for the
 * browser tab (sessionStorage) — nothing is stored on the server (CLAUDE.md: teacher's AI).
 */
const KEY = 'thinkread.admin.chats';
const listeners = new Set<() => void>();
let chats: Record<string, ChatMsg[]> | null = null;

function load(): Record<string, ChatMsg[]> {
  if (chats) return chats;
  try {
    chats = JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Record<string, ChatMsg[]>;
  } catch {
    chats = {};
  }
  return chats;
}

const EMPTY: ChatMsg[] = [];

export function chatOf(key: string): ChatMsg[] {
  return load()[key] ?? EMPTY;
}

export function setChat(key: string, next: ChatMsg[]): void {
  chats = { ...load(), [key]: next };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(chats));
  } catch {
    /* private mode or quota — the in-memory copy still works for this page */
  }
  for (const l of listeners) l();
}

export function appendChat(key: string, msg: ChatMsg): void {
  setChat(key, [...chatOf(key), msg]);
}

/** Clears every chat — on sign-out. */
export function clearChats(): void {
  chats = {};
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The chat under `key` ('school' or `student:<id>`); re-renders on every change. */
export function useChat(key: string): ChatMsg[] {
  return useSyncExternalStore(
    subscribe,
    () => chatOf(key),
    () => EMPTY,
  );
}
