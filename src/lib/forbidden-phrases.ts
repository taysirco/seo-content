/**
 * W8-1: Centralized forbidden AI cliché phrases.
 * Now language-aware — delegates to language-config.ts for per-language phrase sets.
 * Shared between: mega-prompt-builder, section-prompt-builder, seo-auditor, audit route.
 */
import { getForbiddenPhrases as getLangPhrases } from '@/lib/language-config';

/** Get forbidden phrases for a specific language (defaults to Arabic) */
export function getForbiddenPhrasesForLang(lang: string): string[] {
  return getLangPhrases(lang);
}

/** Get CSV of forbidden phrases for a specific language */
export function getForbiddenPhrasesCsvForLang(lang: string): string {
  return getLangPhrases(lang).join(', ');
}

/** Legacy export — Arabic phrases (backward compatibility) */
export const FORBIDDEN_PHRASES = getLangPhrases('ar');
export const FORBIDDEN_PHRASES_CSV = FORBIDDEN_PHRASES.join(', ');
