import { GENERATOR_VERSION } from '../generator/config';
import type { LevelConfig } from '../generator/config';
import { integer, isRecord, nonNegative } from '../utils/validation';

export interface DailyRecord {
  attempts: number;
  completed: boolean;
  bestTimeMs: number | null;
  bestErrors: number | null;
  lastTimeMs: number;
  lastErrors: number;
  lastResult: 'won' | 'lost';
}

export interface DailyProgress {
  streak: number;
  bestStreak: number;
  lastCompleted: string | null;
  completedDays: number;
  records: Record<string, DailyRecord>;
}

export const defaultDailyProgress = (): DailyProgress => ({ streak: 0, bestStreak: 0, lastCompleted: null, completedDays: 0, records: {} });

export function utcDate(date = new Date()): string {
  if (!Number.isFinite(date.getTime())) throw new Error('Fecha inválida.');
  return date.toISOString().slice(0, 10);
}

export function isUtcDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && utcDate(date) === value;
}

export function previousUtcDay(date: string): string {
  if (!isUtcDate(date)) throw new Error('Fecha UTC inválida.');
  return utcDate(new Date(new Date(`${date}T00:00:00Z`).getTime() - 86400000));
}

export function dailyChallenge(date = utcDate()): { seed: string; date: string; config: LevelConfig } {
  if (!isUtcDate(date)) throw new Error('Fecha UTC inválida.');
  return { seed: `daily:${GENERATOR_VERSION}:${date}`, date, config: { width: 7, height: 7, density: 0.67, complexity: 0.75 } };
}

export function currentStreak(progress: DailyProgress, today = utcDate()): number {
  return progress.lastCompleted === today || progress.lastCompleted === previousUtcDay(today) ? progress.streak : 0;
}

export function updateDaily(progress: DailyProgress, date: string, result: { won: boolean; timeMs: number; errors: number }): DailyProgress {
  if (!isUtcDate(date) || !nonNegative(result.timeMs) || !integer(result.errors, 0, 3)) throw new Error('Resultado diario inválido.');
  const previous = progress.records[date];
  const firstCompletion = result.won && !previous?.completed;
  const improves = result.won && (previous?.bestErrors == null || result.errors < previous.bestErrors || result.errors === previous.bestErrors && result.timeMs < (previous.bestTimeMs ?? Infinity));
  let { streak, bestStreak, lastCompleted, completedDays } = progress;
  if (firstCompletion) {
    completedDays++;
    if (!lastCompleted || date > lastCompleted) {
      streak = lastCompleted === previousUtcDay(date) ? streak + 1 : 1;
      lastCompleted = date;
      bestStreak = Math.max(bestStreak, streak);
    }
  }
  return {
    streak, bestStreak, lastCompleted, completedDays,
    records: { ...progress.records, [date]: {
      attempts: (previous?.attempts ?? 0) + 1,
      completed: Boolean(previous?.completed || result.won),
      bestTimeMs: improves ? result.timeMs : previous?.bestTimeMs ?? null,
      bestErrors: improves ? result.errors : previous?.bestErrors ?? null,
      lastTimeMs: result.timeMs, lastErrors: result.errors, lastResult: result.won ? 'won' : 'lost',
    } },
  };
}

export function isDailyProgress(value: unknown): value is DailyProgress {
  if (!isRecord(value) || !integer(value.streak) || !integer(value.bestStreak) || !integer(value.completedDays) || value.streak > value.bestStreak) return false;
  if (value.lastCompleted !== null && !isUtcDate(value.lastCompleted) || !isRecord(value.records)) return false;
  return Object.entries(value.records).every(([date, record]) => {
    if (!isUtcDate(date) || !isRecord(record) || !integer(record.attempts, 1) || typeof record.completed !== 'boolean') return false;
    if (!nonNegative(record.lastTimeMs) || !integer(record.lastErrors, 0, 3) || !['won', 'lost'].includes(String(record.lastResult))) return false;
    return record.completed ? nonNegative(record.bestTimeMs) && integer(record.bestErrors, 0, 2) : record.bestTimeMs === null && record.bestErrors === null;
  });
}

export function dailyCountdown(now = new Date()): string {
  const today = utcDate(now);
  const next = new Date(`${today}T00:00:00Z`).getTime() + 86400000;
  const seconds = Math.max(0, Math.floor((next - now.getTime()) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((part) => String(part).padStart(2, '0')).join(':');
}
