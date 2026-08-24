import { describe, expect, it } from 'vitest';
import { optionalNumber } from './url-params';

describe('optionele numerieke URL-parameters', () => {
  it('ziet een ontbrekende of lege waarde niet als nul', () => {
    expect(optionalNumber(new URLSearchParams(), 'lon')).toBeNull();
    expect(optionalNumber(new URLSearchParams('lon='), 'lon')).toBeNull();
    expect(optionalNumber(new URLSearchParams('lon=abc'), 'lon')).toBeNull();
  });

  it('accepteert geldige getallen, inclusief nul', () => {
    expect(optionalNumber(new URLSearchParams('lon=6.0668'), 'lon')).toBe(6.0668);
    expect(optionalNumber(new URLSearchParams('lon=0'), 'lon')).toBe(0);
  });
});