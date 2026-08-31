import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSourceJson, SourceFetchError } from './source-fetch';

describe('fetchSourceJson', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('classificeert HTTP-fouten met bron en status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(fetchSourceJson('https://example.test', { source: 'Testbron' }))
      .rejects.toMatchObject({ source: 'Testbron', kind: 'http', status: 503 });
  });

  it('classificeert ongeldige JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('geen json', { status: 200 })));
    await expect(fetchSourceJson('https://example.test', { source: 'Testbron' }))
      .rejects.toMatchObject({ source: 'Testbron', kind: 'invalid-response' });
  });

  it('classificeert netwerkfouten', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(fetchSourceJson('https://example.test', { source: 'Testbron' }))
      .rejects.toBeInstanceOf(SourceFetchError);
  });

  it('classificeert een timeout', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    })));
    await expect(fetchSourceJson('https://example.test', { source: 'Trage bron', timeoutMs: 5 }))
      .rejects.toMatchObject({ source: 'Trage bron', kind: 'timeout' });
  });
});
