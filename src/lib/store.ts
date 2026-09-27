// Device-local preferences and saved list (instant, works without an account).
import { useSyncExternalStore } from "react";

type Settings = {
  timeZone: string | null; // null = automatic
  notifications: boolean;
  appearance: "dark" | "oled";
  lastSeenChange: string | null;
};

const SAVED_KEY = "anime.saved.v1";
const SETTINGS_KEY = "anime.settings.v1";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = () => l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};

const defaults: Settings = { timeZone: null, notifications: false, appearance: "dark", lastSeenChange: null };
let savedCache: { raw: string | null; val: string[] } = { raw: null, val: [] };
let settingsCache: { raw: string | null; val: Settings } = { raw: null, val: defaults };
const EMPTY: string[] = [];

function readSaved(): string[] {
  const raw = localStorage.getItem(SAVED_KEY);
  if (raw !== savedCache.raw) savedCache = { raw, val: raw ? JSON.parse(raw) : [] };
  return savedCache.val;
}
function readSettings(): Settings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (raw !== settingsCache.raw) settingsCache = { raw, val: { ...defaults, ...(raw ? JSON.parse(raw) : {}) } };
  return settingsCache.val;
}

export function useSaved() {
  const ids = useSyncExternalStore(subscribe, readSaved, () => EMPTY);
  const toggle = (id: string) => {
    const cur = readSaved();
    localStorage.setItem(SAVED_KEY, JSON.stringify(cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur]));
    emit();
  };
  const remove = (id: string) => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(readSaved().filter((x) => x !== id)));
    emit();
  };
  return { ids, isSaved: (id: string) => ids.includes(id), toggle, remove };
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, readSettings, () => defaults);
  const update = (patch: Partial<Settings>) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readSettings(), ...patch }));
    emit();
  };
  const detectedZone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return { settings, update, timeZone: settings.timeZone ?? detectedZone, detectedZone };
}
