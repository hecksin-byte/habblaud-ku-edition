import { getLocale } from './i18n';

/**
 * As moedinhas fictícias do escritório: "🪙10". Em coreano aparecem como dinheiro: cada moeda vale mil won,
 * então 10 moedas são "10천 원".
 */
export function coinText(n: number): string {
  return getLocale() === 'ko' ? `${n}천 원` : `🪙${n}`;
}
