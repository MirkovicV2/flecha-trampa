import { describe, expect, it, vi } from 'vitest';
import { NoOpAdsService } from '../src/services/ads';
import type { AdsService } from '../src/services/ads';
import { MonetizationService } from '../src/services/monetization';
import { NoOpPurchasesService } from '../src/services/purchases';
import { configForLevel } from '../src/generator/config';
import { newSession } from '../src/services/session';
import { solve } from '../src/solver/solver';
import { attemptMove } from '../src/core/game';

describe('future monetization boundaries', () => {
  it('never pretends an ad was displayed or awards a NoOp reward', async () => {
    const grant = vi.fn();
    const ads = new NoOpAdsService();
    expect(await ads.showRewardedHint()).toEqual({ status: 'unavailable' });
    expect(await ads.showInterstitial()).toBe('unavailable');
    expect(await new MonetizationService().rewardedHint(grant)).toBe('unavailable');
    expect(grant).not.toHaveBeenCalled();
    expect(await new NoOpPurchasesService().purchase()).toBe('unavailable');
    expect(await new NoOpPurchasesService().restore()).toMatchObject({ adsRemoved: false });
  });

  it('uses a provider receipt once and rejects duplicate or concurrent callbacks', async () => {
    const grant = vi.fn();
    const ads: AdsService = {
      rewardedAvailable: true,
      interstitialAvailable: false,
      showRewardedHint: vi
        .fn()
        .mockResolvedValue({ status: 'rewarded', receipt: 'unit-test-receipt' }),
      showInterstitial: vi.fn().mockResolvedValue('unavailable'),
    };
    const service = new MonetizationService(ads);
    const first = service.rewardedHint(grant);
    expect(await service.rewardedHint(grant)).toBe('busy');
    expect(await first).toBe('granted');
    expect(await service.rewardedHint(grant)).toBe('duplicate');
    expect(grant).toHaveBeenCalledOnce();
  });

  it('does not grant a cancelled or failed rewarded ad', async () => {
    const grant = vi.fn();
    const ads: AdsService = {
      rewardedAvailable: true,
      interstitialAvailable: false,
      showRewardedHint: vi.fn().mockResolvedValue({ status: 'cancelled' }),
      showInterstitial: vi.fn().mockResolvedValue('unavailable'),
    };
    expect(await new MonetizationService(ads).rewardedHint(grant)).toBe('cancelled');
    ads.showRewardedHint = vi.fn().mockRejectedValue(new Error('network'));
    expect(await new MonetizationService(ads).rewardedHint(grant)).toBe('failed');
    expect(grant).not.toHaveBeenCalled();
  });

  it('limits interstitials to one validated transition after a classic victory', async () => {
    const ads: AdsService = {
      rewardedAvailable: false,
      interstitialAvailable: true,
      showRewardedHint: vi.fn().mockResolvedValue({ status: 'unavailable' }),
      showInterstitial: vi.fn().mockResolvedValue('displayed'),
    };
    const service = new MonetizationService(ads);
    const session = newSession('classic', 1, 'between-levels', configForLevel(1));
    expect(await service.betweenLevels(session)).toBe('skipped');
    for (const id of solve(session.state.board).sequence)
      session.state = attemptMove(session.state, id).state;
    expect(await service.betweenLevels(session)).toBe('displayed');
    expect(await service.betweenLevels(session)).toBe('skipped');
    expect(ads.showInterstitial).toHaveBeenCalledOnce();
    expect(ads.showInterstitial).toHaveBeenCalledWith('between-levels');
  });

  it('respects the remove-ads entitlement', async () => {
    const ads: AdsService = {
      rewardedAvailable: false,
      interstitialAvailable: true,
      showRewardedHint: vi.fn().mockResolvedValue({ status: 'unavailable' }),
      showInterstitial: vi.fn().mockResolvedValue('displayed'),
    };
    const purchases = new NoOpPurchasesService();
    purchases.entitlements = async () => ({ adsRemoved: true, ownedThemes: ['aurora'] });
    const session = newSession('classic', 1, 'entitlement', configForLevel(1));
    for (const id of solve(session.state.board).sequence)
      session.state = attemptMove(session.state, id).state;
    expect(await new MonetizationService(ads, purchases).betweenLevels(session)).toBe('skipped');
    expect(ads.showInterstitial).not.toHaveBeenCalled();
  });
});
