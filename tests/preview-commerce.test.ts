import { describe, expect, it, vi } from 'vitest';
import {
  PreviewAdsService,
  PreviewPurchasesService,
  PREVIEW_PURCHASE_KEY,
} from '../src/services/preview-commerce';
import type { CommercePreviewPort } from '../src/services/preview-commerce';
import { MonetizationService } from '../src/services/monetization';
import { PASS_SEASON } from '../src/config/pass';

function fixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const view: CommercePreviewPort = {
    advertise: vi.fn().mockResolvedValue('completed'),
    checkout: vi.fn().mockResolvedValue(true),
  };
  return { values, storage, view };
}

describe('explicit monetization preview', () => {
  it('grants each completed preview once and never grants a cancellation', async () => {
    const { view } = fixture();
    const service = new MonetizationService(new PreviewAdsService(view));
    const grant = vi.fn();
    expect(await service.rewardedHint(grant)).toBe('granted');
    expect(await service.rewardedEnergy(grant)).toBe('granted');
    expect(grant).toHaveBeenCalledTimes(2);
    view.advertise = vi.fn().mockResolvedValue('cancelled');
    expect(await service.rewardedEnergy(grant)).toBe('cancelled');
    expect(grant).toHaveBeenCalledTimes(2);
  });
  it('persists and restores only an explicitly confirmed sandbox purchase', async () => {
    const { view, values, storage } = fixture();
    const purchases = new PreviewPurchasesService(view, storage);
    expect(await purchases.entitlements()).toMatchObject({ adsRemoved: false });
    expect(await purchases.purchase('battle-pass')).toBe('purchased');
    expect(values.has(PREVIEW_PURCHASE_KEY)).toBe(true);
    expect(values.has('flecha-trampa:profile:v1')).toBe(false);
    const restored = new PreviewPurchasesService(view, storage);
    expect(await restored.restore()).toMatchObject({
      adsRemoved: true,
      battlePassSeason: PASS_SEASON,
    });
    await restored.resetPreview();
    expect(await purchases.entitlements()).toMatchObject({ adsRemoved: false });
    expect((await purchases.entitlements()).battlePassSeason).toBeUndefined();
  });
  it('ignores corruption, unknown products and storage failures', async () => {
    const { view, values, storage } = fixture();
    const purchases = new PreviewPurchasesService(view, storage);
    values.set(
      PREVIEW_PURCHASE_KEY,
      JSON.stringify({ schema: 1, season: 'expired', active: true }),
    );
    expect((await purchases.entitlements()).adsRemoved).toBe(false);
    values.set(PREVIEW_PURCHASE_KEY, '{broken');
    expect((await purchases.entitlements()).adsRemoved).toBe(false);
    expect(await purchases.purchase('remove-ads')).toBe('unavailable');
    expect(await new PreviewPurchasesService(view, null).purchase('battle-pass')).toBe(
      'unavailable',
    );
    const broken = new PreviewPurchasesService(view, {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(await broken.purchase('battle-pass')).toBe('unavailable');
    expect((await broken.entitlements()).adsRemoved).toBe(false);
  });
  it('cancels without granting premium and serializes simultaneous checkouts', async () => {
    const { view, storage } = fixture();
    let finish: (value: boolean) => void = () => undefined;
    view.checkout = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const purchases = new PreviewPurchasesService(view, storage);
    const first = purchases.purchase('battle-pass');
    expect(await purchases.purchase('battle-pass')).toBe('cancelled');
    finish(false);
    expect(await first).toBe('cancelled');
    expect((await purchases.entitlements()).adsRemoved).toBe(false);
  });
});
