import type { AdsService, InterstitialResult, RewardedAdResult } from './ads';
import type { Entitlements, Product, PurchasesService } from './purchases';
import type { StoragePort } from './progress';
import { PASS_SEASON } from '../config/pass';

export type PreviewPlacement = 'hint' | 'energy' | 'between-levels';
export interface CommercePreviewPort {
  advertise(placement: PreviewPlacement): Promise<'completed' | 'cancelled'>;
  checkout(product: Product): Promise<boolean>;
}
export const PREVIEW_PURCHASE_KEY = 'flecha-trampa:preview-purchases:v1';

/** Explicitly labelled local simulations. No SDK, impressions, invoices or payment data. */
export class PreviewAdsService implements AdsService {
  readonly preview = true;
  readonly rewardedAvailable = true;
  readonly interstitialAvailable = true;
  constructor(private readonly view: CommercePreviewPort) {}
  showRewardedHint(): Promise<RewardedAdResult> {
    return this.showRewarded('hint');
  }
  async showRewarded(placement: 'hint' | 'energy'): Promise<RewardedAdResult> {
    const result = await this.view.advertise(placement);
    return result === 'completed'
      ? { status: 'rewarded', receipt: `preview:${crypto.randomUUID()}` }
      : { status: 'cancelled' };
  }
  async showInterstitial(): Promise<InterstitialResult> {
    return (await this.view.advertise('between-levels')) === 'completed' ? 'displayed' : 'skipped';
  }
}

export function previewStorage(): StoragePort | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Sandbox rights live in a separate key and are never accepted by a live store adapter. */
export class PreviewPurchasesService implements PurchasesService {
  readonly preview = true;
  readonly available: boolean;
  private busy = false;
  constructor(
    private readonly view: CommercePreviewPort,
    private readonly storage: StoragePort | null = previewStorage(),
  ) {
    this.available = storage !== null;
  }
  async entitlements(): Promise<Entitlements> {
    let active = false;
    try {
      const raw = this.storage?.getItem(PREVIEW_PURCHASE_KEY);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (
          typeof saved === 'object' &&
          saved !== null &&
          'schema' in saved &&
          'season' in saved &&
          'active' in saved
        )
          active = saved.schema === 1 && saved.season === PASS_SEASON && saved.active === true;
      }
    } catch {
      /* Corrupt or inaccessible sandbox receipts grant no rights. */
    }
    return {
      adsRemoved: active,
      ownedThemes: [],
      ...(active ? { battlePassSeason: PASS_SEASON } : {}),
    };
  }
  async purchase(product: Product): Promise<'unavailable' | 'cancelled' | 'purchased'> {
    if (!this.available || product !== 'battle-pass') return 'unavailable';
    if (this.busy) return 'cancelled';
    this.busy = true;
    try {
      if (!(await this.view.checkout(product))) return 'cancelled';
      this.storage!.setItem(
        PREVIEW_PURCHASE_KEY,
        JSON.stringify({ schema: 1, season: PASS_SEASON, active: true }),
      );
      await this.storage!.whenIdle?.();
      return 'purchased';
    } catch {
      return 'unavailable';
    } finally {
      this.busy = false;
    }
  }
  restore(): Promise<Entitlements> {
    return this.entitlements();
  }
  async resetPreview(): Promise<void> {
    this.storage?.setItem(
      PREVIEW_PURCHASE_KEY,
      JSON.stringify({ schema: 1, season: PASS_SEASON, active: false }),
    );
    await this.storage?.whenIdle?.();
  }
}
