import type { AdsService, InterstitialResult } from './ads';
import { NoOpAdsService } from './ads';
import type { PlaySession } from './session';
import type { PurchasesService } from './purchases';
import { NoOpPurchasesService } from './purchases';

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
    if (this.rewarding) return 'busy';
    if (!this.ads.rewardedAvailable) return 'unavailable';
    this.rewarding = true;
    try {
      const result = await this.ads.showRewardedHint();
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
      if ((await this.purchases.entitlements()).adsRemoved) return 'skipped';
      return await this.ads.showInterstitial('between-levels');
    } catch {
      return 'failed';
    }
  }
}
