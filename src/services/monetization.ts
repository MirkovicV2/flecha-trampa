import type { AdsService, InterstitialResult } from './ads';
import { NoOpAdsService } from './ads';
import type { PlaySession } from './session';
import type { PurchasesService } from './purchases';
import { NoOpPurchasesService } from './purchases';
import { PASS_SEASON } from '../config/pass';

export class MonetizationService {
  private rewarding = false;
  private readonly receipts = new Set<string>();
  private readonly interstitialSessions = new Set<string>();

  constructor(
    readonly ads: AdsService = new NoOpAdsService(),
    readonly purchases: PurchasesService = new NoOpPurchasesService(),
  ) {}

  async rewardedHint(
    grant: () => void,
  ): Promise<'granted' | 'unavailable' | 'cancelled' | 'failed' | 'duplicate' | 'busy'> {
    return this.rewarded('hint', grant);
  }

  async rewardedEnergy(
    grant: () => void,
  ): Promise<'granted' | 'unavailable' | 'cancelled' | 'failed' | 'duplicate' | 'busy'> {
    return this.rewarded('energy', grant);
  }

  private async rewarded(
    placement: 'hint' | 'energy',
    grant: () => void,
  ): Promise<'granted' | 'unavailable' | 'cancelled' | 'failed' | 'duplicate' | 'busy'> {
    if (this.rewarding) return 'busy';
    if (!this.ads.rewardedAvailable) return 'unavailable';
    this.rewarding = true;
    try {
      const result = this.ads.showRewarded
        ? await this.ads.showRewarded(placement)
        : placement === 'hint'
          ? await this.ads.showRewardedHint()
          : { status: 'unavailable' as const };
      if (result.status !== 'rewarded') return result.status;
      if (!result.receipt || this.receipts.has(result.receipt)) return 'duplicate';
      this.receipts.add(result.receipt);
      grant();
      return 'granted';
    } catch {
      return 'failed';
    } finally {
      this.rewarding = false;
    }
  }

  async betweenLevels(session: PlaySession): Promise<InterstitialResult> {
    if (
      session.mode !== 'classic' ||
      session.state.status !== 'won' ||
      this.interstitialSessions.has(session.id)
    )
      return 'skipped';
    if (!this.ads.interstitialAvailable) return 'unavailable';
    this.interstitialSessions.add(session.id);
    try {
      const rights = await this.purchases.entitlements();
      if (rights.adsRemoved || rights.battlePassSeason === PASS_SEASON) return 'skipped';
      return await this.ads.showInterstitial('between-levels');
    } catch {
      return 'failed';
    }
  }
}
