/* Bridge to the original stats engine (window.KATAR_HOOKS.stats).
   The engine still rolls the die, applies the standard array, writes the
   sheet fields and restores saves. React only presents and delegates. */
export const STAT_NAMES = ['Сила','Ловкость','Харизма','Интеллект','Мудрость','Удача','Проклятие','Магия'] as const;
export type StatName = (typeof STAT_NAMES)[number];
export type StatMode = 'roll' | 'standard' | '';
export interface HistoryItem { name: StatName; value: number; die?: number; previous?: string }
interface EngineState { mode: StatMode; history: HistoryItem[]; pending: { die: number; value: number } | null; native: string }
interface Engine { get: () => EngineState; set: (value: unknown) => void }
export interface StatsSnapshot extends EngineState {
  allowed: string[]; values: Record<string, string>; assigned: string[];
  available: boolean; pendingValue: number | null;
  pendingText: string; progressText: string; warningText: string; warning: boolean;
  historyItems: string[]; undoDisabled: boolean;
}
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
export const statsEngine = () => (window as unknown as { KATAR_HOOKS?: { stats?: Engine } }).KATAR_HOOKS?.stats;
export const STANDARD = [2, 2, 1, 1, 0, -1, -2];
export const format = (n: number) => (n > 0 ? `+${n}` : String(n));
export function readStats(): StatsSnapshot | null {
  const state = statsEngine()?.get();
  if (!state) return null;
  const select = byId<HTMLSelectElement>('stats-target');
  const allowed = select ? [...select.options].map(o => o.value).filter(Boolean) : [];
  const assigned: string[] = state.history.map(h => h.name);
  if (state.mode === 'standard' && state.native) assigned.push(state.native);
  const values: Record<string, string> = {};
  for (const stat of document.querySelectorAll('.stats .stat')) {
    const name = stat.querySelector('.nm')?.textContent?.trim();
    if (name) values[name] = stat.querySelector('.mod .uline')?.textContent?.trim() || '';
  }
  let pendingValue: number | null = state.pending?.value ?? null;
  if (state.mode === 'standard' && select && !select.disabled && state.native && state.history.length < 7) pendingValue = STANDARD[state.history.length];
  const available = Boolean(select && !select.disabled && pendingValue !== null);
  const warning = byId('stats-native-warning');
  return {
    ...state, allowed, values, assigned,
    available, pendingValue,
    pendingText: byId('stats-pending')?.textContent || '',
    progressText: byId('stats-progress')?.textContent || '',
    warningText: warning?.textContent?.trim() || '',
    warning: Boolean(warning && !warning.hidden),
    historyItems: [...document.querySelectorAll('#stats-history li')].map(li => li.textContent || ''),
    undoDisabled: Boolean(byId<HTMLButtonElement>('stats-undo')?.disabled),
  };
}
export function chooseMethod(mode: Exclude<StatMode, ''>) {
  document.querySelector<HTMLInputElement>(`[name=stats-method][value="${mode}"]`)?.click();
}
export function rollDie() { byId<HTMLButtonElement>('stats-roll')?.click(); }
export function assignStat(name: string) {
  const select = byId<HTMLSelectElement>('stats-target');
  if (!select) return;
  select.value = name;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  byId<HTMLButtonElement>('stats-assign')?.click();
}
export const undoStat = () => byId<HTMLButtonElement>('stats-undo')?.click();
export const resetStats = () => byId<HTMLButtonElement>('stats-reset')?.click();
export const motionOff = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
