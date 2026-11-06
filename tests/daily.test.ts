import { describe, expect, it } from 'vitest';
import { currentStreak, dailyChallenge, dailyCountdown, defaultDailyProgress, isUtcDate, previousUtcDay, updateDaily, utcDate } from '../src/services/daily';
import { generateLevel } from '../src/generator/generator';
import { GENERATOR_VERSION } from '../src/generator/config';
import { ProgressStore } from '../src/services/progress';
import { newSession } from '../src/services/session';
import { solve } from '../src/solver/solver';
import { attemptMove } from '../src/core/game';

describe('UTC daily challenges', () => {
  it('uses UTC across time zones, midnight and leap days', () => {
    expect(utcDate(new Date('2026-11-06T00:30:00+14:00'))).toBe('2026-11-05');
    expect(utcDate(new Date('2026-11-06T23:30:00-04:00'))).toBe('2026-11-07');
    expect(previousUtcDay('2024-03-01')).toBe('2024-02-29');
    expect(previousUtcDay('2026-01-01')).toBe('2025-12-31');
    expect(dailyCountdown(new Date('2026-11-06T23:59:59Z'))).toBe('00:00:01');
    expect(dailyCountdown(new Date('2026-11-06T00:00:00Z'))).toBe('24:00:00');
  });

  it.each(['2026-02-30', '2026-2-03', '<script>', '', '2026-13-01'])('rejects an invalid date: %s', (date) => {
    expect(isUtcDate(date)).toBe(false);
    expect(() => dailyChallenge(date)).toThrow();
  });

  it('reproduces one board per date and generator version', () => {
    const challenge = dailyChallenge('2026-11-06');
    expect(challenge.seed).toContain(GENERATOR_VERSION);
    expect(challenge.seed).toContain('2026-11-06');
    expect(generateLevel(challenge.seed, challenge.config)).toEqual(generateLevel(dailyChallenge('2026-11-06').seed, challenge.config));
    expect(generateLevel(challenge.seed, challenge.config).board).not.toEqual(generateLevel(dailyChallenge('2026-11-07').seed, challenge.config).board);
  });

  it('counts a completed date once and keeps the best result together', () => {
    let progress = updateDaily(defaultDailyProgress(), '2026-11-06', { won: true, timeMs: 4000, errors: 1 });
    progress = updateDaily(progress, '2026-11-06', { won: true, timeMs: 9000, errors: 0 });
    progress = updateDaily(progress, '2026-11-06', { won: false, timeMs: 3000, errors: 3 });
    expect(progress).toMatchObject({ streak: 1, bestStreak: 1, completedDays: 1 });
    expect(progress.records['2026-11-06']).toMatchObject({ attempts: 3, completed: true, bestTimeMs: 9000, bestErrors: 0, lastResult: 'lost' });
  });

  it('advances consecutive streaks, expires them after a missed day, and preserves the best', () => {
    let progress = defaultDailyProgress();
    for (const date of ['2026-11-05', '2026-11-06', '2026-11-07']) progress = updateDaily(progress, date, { won: true, timeMs: 1000, errors: 0 });
    expect(currentStreak(progress, '2026-11-08')).toBe(3);
    expect(currentStreak(progress, '2026-11-09')).toBe(0);
    progress = updateDaily(progress, '2026-11-09', { won: true, timeMs: 2000, errors: 0 });
    expect(progress).toMatchObject({ streak: 1, bestStreak: 3, completedDays: 4 });
    progress = updateDaily(progress, '2026-11-01', { won: true, timeMs: 1000, errors: 0 });
    expect(progress.lastCompleted).toBe('2026-11-09');
  });

  it('persists daily results independently of classic progression', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    const store = new ProgressStore(storage);
    const challenge = dailyChallenge('2026-11-06');
    const session = newSession('daily', 1, challenge.seed, challenge.config, challenge.date);
    store.beginSession(session);
    for (const id of solve(session.state.board).sequence) session.state = attemptMove(session.state, id).state;
    store.recordResult(session);
    store.recordResult(session);
    const recovered = new ProgressStore(storage);
    expect(recovered.profile.level).toBe(1);
    expect(recovered.profile.daily).toMatchObject({ completedDays: 1, streak: 1 });
    expect(recovered.profile.daily.records[challenge.date]?.attempts).toBe(1);
    expect(recovered.profile.dailySave?.state.status).toBe('won');
  });
});
