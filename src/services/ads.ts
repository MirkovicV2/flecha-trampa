export type RewardedAdResult =
  | { readonly status: 'unavailable' | 'cancelled' | 'failed' }
  | { readonly status: 'rewarded'; readonly receipt: string };
export type InterstitialResult = 'displayed' | 'unavailable' | 'skipped' | 'failed';

export interface AdsService {
  readonly rewardedAvailable: boolean;
  readonly interstitialAvailable: boolean;
  showRewardedHint(): Promise<RewardedAdResult>;
  showInterstitial(placement: 'between-levels'): Promise<InterstitialResult>;
}

/** No SDK, no network, no fabricated ad views or rewards. */
export class NoOpAdsService implements AdsService {
  readonly rewardedAvailable = false;
  readonly interstitialAvailable = false;
  async showRewardedHint(): Promise<RewardedAdResult> { return { status: 'unavailable' }; }
  async showInterstitial(): Promise<InterstitialResult> { return 'unavailable'; }
}
