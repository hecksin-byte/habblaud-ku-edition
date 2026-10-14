import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from './i18n';
import { coinText } from './money';

describe('coinText', () => {
  afterEach(() => setLocale('pt-BR'));

  it('em coreano cada moeda vale mil won: "10천 원"', () => {
    setLocale('ko');
    expect(coinText(10)).toBe('10천 원');
    expect(coinText(105)).toBe('105천 원');
  });

  it('nos outros idiomas continua a moedinha', () => {
    for (const l of ['pt-BR', 'en', 'es', 'fr'] as const) {
      setLocale(l);
      expect(coinText(10)).toBe('🪙10');
    }
  });
});
