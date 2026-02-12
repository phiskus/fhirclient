export interface ApiLogEntry {
  id: string;
  timestamp: Date;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  status: number;
  statusText: string;
  ok: boolean;
  duration: number;
  operation: string;
}

// Module-level singleton store
let entries: ApiLogEntry[] = [];
let listeners: Array<() => void> = [];

export function addEntry(entry: ApiLogEntry): void {
  entries = [entry, ...entries]; // newest first
  listeners.forEach((fn) => fn());
}

export function getEntries(): ApiLogEntry[] {
  return entries;
}

export function clearEntries(): void {
  entries = [];
  listeners.forEach((fn) => fn());
}

// For use with React's useSyncExternalStore
export function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((fn) => fn !== listener);
  };
}

export function getSnapshot(): ApiLogEntry[] {
  return entries;
}
