export const SAVED_PHONES_KEY = 'saved-phones-v1';

const MAX_PHONES = 100;

function normalize(phone: string): string {
  return String(phone).trim();
}

function getPhones(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(SAVED_PHONES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

/**
 * Adds the phone to localStorage if it is truthy and not already in the list.
 * Normalizes with trim; keeps at most MAX_PHONES entries (newest first).
 */
export function addPhoneIfNew(phone: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const normalized = phone ? normalize(phone) : '';
  if (!normalized) return;

  const list = getPhones();
  const already = list.some((p) => normalize(p) === normalized);
  if (already) return;

  const next = [normalized, ...list].slice(0, MAX_PHONES);
  window.localStorage.setItem(SAVED_PHONES_KEY, JSON.stringify(next));
}
