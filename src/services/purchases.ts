import type { ThemeName } from '../config/theme';

export type Product = 'remove-ads' | 'cosmetic-theme' | 'battle-pass';
export interface Entitlements {
  readonly adsRemoved: boolean;
  readonly ownedThemes: readonly ThemeName[];
  readonly battlePassSeason?: string;
}
export interface PurchasesService {
  readonly available?: boolean;
  entitlements(): Promise<Entitlements>;
  purchase(product: Product): Promise<'unavailable' | 'cancelled' | 'purchased'>;
  restore(): Promise<Entitlements>;
}

/** A store adapter can replace this after products and receipt verification exist. */
export class NoOpPurchasesService implements PurchasesService {
  readonly available = false;
  async entitlements(): Promise<Entitlements> {
    return { adsRemoved: false, ownedThemes: ['aurora', 'ember'] };
  }
  async purchase(): Promise<'unavailable'> {
    return 'unavailable';
  }
  async restore(): Promise<Entitlements> {
    return this.entitlements();
  }
}
