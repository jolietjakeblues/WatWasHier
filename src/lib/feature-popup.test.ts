import { describe, expect, it } from 'vitest';
import { archaeologyPopup, bagPopup, escapeHtml, rcePopup } from './feature-popup';

describe('feature popups', () => {
  it('escapet bronwaarden voordat ze als HTML worden getoond', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('toont BAG-details compact', () => {
    expect(bagPopup({ identificatie: '123', bouwjaar: 1930 })).toContain('Bouwjaar');
  });

  it('toont een monumentregister-link voor RCE', () => {
    expect(rcePopup({ ci_citation: 'https://example.test/monument' })).toContain('Open monumentregister');
  });

  it('groepeert archeologische details per type', () => {
    const html = archaeologyPopup({ archaeologyType: 'Vondstlocatie' }, { anchorUri: 'x', groups: [{ type: 'Vondsten', count: 2 }], relations: [] });
    expect(html).toContain('Vondsten: <strong>2</strong>');
  });
});
