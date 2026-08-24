import { describe, expect, it } from 'vitest';
import { parseRceImages } from './rce-images';

describe('RCE-afbeeldingen', () => {
  it('dedupliceert dezelfde afbeelding uit meerdere graphs', () => {
    const bindings: Parameters<typeof parseRceImages>[0] = [
      { image: { value: 'https://example.test/image/1' }, graph: { value: 'image' }, title: { value: 'Foto' } },
      { image: { value: 'https://example.test/image/1' }, graph: { value: 'image-1' }, thumbnail: { value: 'https://example.test/thumb.jpg' } }
    ];
    const result = parseRceImages(bindings);
    expect(result).toHaveLength(1);
    expect(result[0].thumbnailUrl).toBe('https://example.test/thumb.jpg');
    expect(result[0].graph).toContain('image-1');
  });
});
