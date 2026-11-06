export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'manual';
export interface SharePort {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: { writeText(text: string): Promise<void> };
}

/** Reports success only when the platform share or clipboard operation actually succeeds. */
export class ShareService {
  constructor(private readonly port: SharePort = navigator) {}

  async copy(text: string): Promise<ShareOutcome> {
    if (!this.port.clipboard) return 'manual';
    try { await this.port.clipboard.writeText(text); return 'copied'; } catch { return 'manual'; }
  }

  async share(data: ShareData): Promise<ShareOutcome> {
    if (this.port.share && (!this.port.canShare || this.port.canShare(data))) {
      try { await this.port.share(data); return 'shared'; }
      catch (error) { if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') return 'cancelled'; }
    }
    return this.copy([data.text, data.url].filter(Boolean).join('\n'));
  }
}
