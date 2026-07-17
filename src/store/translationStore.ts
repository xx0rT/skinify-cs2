import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations } from '../data/translations';

/* Map our short language codes to Google Translate's expected codes.
   GT uses zh-CN / pt-BR style; ours are 2-letter. Anything missing
   falls through to no-op (English remains). */
const GT_LANG_MAP: Record<string, string> = {
  cs: 'cs',
  de: 'de',
  es: 'es',
  fr: 'fr',
  pl: 'pl',
  ru: 'ru',
  it: 'it',
  pt: 'pt',
  tr: 'tr',
  ar: 'ar',
  zh: 'zh-CN',
  ja: 'ja',
};

/* Google Translate widget has been removed — see index.html for the
   bootstrap that wipes any leftover `googtrans=` cookies. The store
   now drives translation purely via our own dictionary (data/translations.ts)
   and a React re-render. No reload required.

   We still expose `applyGoogleTranslate` as a thin no-op so callsites
   that pre-date the removal don't break. Anything that used to depend
   on the page reload (e.g. <html lang="…">) gets updated below. */
function applyGoogleTranslate(code: string) {
  if (typeof window === 'undefined') return;
  /* Keep the cookie clean so a returning user with a stale cookie
     doesn't see Google Translate try to retranslate them on the next
     load — index.html already clears it on boot but this re-clears
     after a manual language change too. */
  try {
    document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'googtrans=; path=/; domain=.skinify.gg; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } catch {
    /* private mode — ignore */
  }
  /* Mirror the chosen language to <html lang="…"> so screen readers
     and Google's crawler see the right value.

     CRITICAL: only ever set a lang code we actually SHIP a dictionary
     for. The picker advertises ~20 languages but only en/cs/de/ru have
     real translations — everything else renders English via the
     createTranslations() fallback. Setting <html lang="fr"> while the
     visible text is English tells crawlers the wrong language (the bug
     an SEO audit flagged). Fall back to 'en' for any unsupported code. */
  try {
    const htmlLang = TRANSLATED_LANGS.has(code) ? code : 'en';
    document.documentElement.lang = htmlLang;
  } catch {
    /* extremely defensive — DOM should always be available here */
  }
}

/* Languages that have a real dictionary in data/translations.ts. Keep in
   sync when a new locale is fully translated. */
export const TRANSLATED_LANGS = new Set(['en', 'cs', 'de', 'ru']);

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

export const removeLanguagePrefix = (pathname: string): string => {
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length > 0 && languages.some(lang => lang.code === pathParts[0])) {
    return '/' + pathParts.slice(1).join('/');
  }
  return pathname;
};

const createTranslations = (lang: string) => {
  return translations[lang] || translations.en;
};

interface TranslationState {
  currentLanguage: Language;
  translations: Record<string, string>;
  /* True until the user explicitly picks a language. Flips to false on
     manual change so we never overwrite their choice on later auto-
     detect passes. Mirrors the same pattern the currency store uses. */
  isAutoDetected: boolean;
  setLanguage: (language: Language) => void;
  setLanguageByCode: (code: string, fromAuto?: boolean) => void;
  t: (key: string) => string;
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set, get) => ({
      /* Default to Czech — Skinify s.r.o. is a Czech business, the
         majority of traffic comes from CZ/SK, and the legal entity +
         PayU billing are CZK-denominated. IP-based geo detection in
         App.tsx can still override this to another language for non-CZ
         visitors before they see the first paint, but if detection
         fails (offline / blocked / ad-blocker), CZ is the right
         default rather than English. */
      currentLanguage: languages[1], // 'cs'
      /* IMPORTANT: `translations` is RECOMPUTED at runtime from
         currentLanguage.code (see `partialize` below — we don't
         persist the dictionary itself). The previous version of this
         store wrote the whole dict into localStorage, which meant any
         user who visited before a translation-key shipped saw raw
         keys ("changelog.title") on later visits because their
         localStorage carried a stale snapshot. */
      translations: createTranslations(languages[1].code),
      isAutoDetected: true,

      setLanguage: (language: Language) => {
        console.log('🔄 Translation Store: Language changed to', language.code, language.nativeName);
        const newTranslations = createTranslations(language.code);
        set({
          currentLanguage: language,
          translations: newTranslations,
          /* Direct setLanguage call = manual switch (from a picker). */
          isAutoDetected: false,
        });
        applyGoogleTranslate(language.code);
      },

      setLanguageByCode: (code: string, fromAuto = false) => {
        const language = languages.find(lang => lang.code === code);
        if (language) {
          console.log('🔄 Translation Store: Language set to', language.code, language.nativeName);
          const newTranslations = createTranslations(language.code);
          set((prev) => ({
            currentLanguage: language,
            translations: newTranslations,
            /* Only flip isAutoDetected to false on a USER action. Auto-
               detect calls keep it true so a later detection (next visit)
               can still update if their location changed. */
            isAutoDetected: fromAuto ? prev.isAutoDetected : false,
          }));
          applyGoogleTranslate(language.code);
        } else {
          console.warn('⚠️ Translation Store: Language not found:', code);
        }
      },

      t: (key: string): string => {
        const { translations } = get();
        return translations[key] || key;
      },
    }),
    {
      name: 'translation-storage',
      /* Bumped 2 → 3 to invalidate every existing localStorage entry
         that was storing the stale dictionary. The migrate hook below
         strips the persisted translations and re-derives them from the
         current bundle. */
      version: 3,
      /* Only persist the user's choice. The translations dictionary
         is recomputed at hydration time from the (possibly newer)
         translations.ts bundle, so adding keys never strands existing
         users on a stale dict. */
      partialize: (state: any) => ({
        currentLanguage: state.currentLanguage,
        isAutoDetected: state.isAutoDetected,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        /* Rehydration writes back only the persisted slice — we have
           to refill `translations` from the live bundle so the rest of
           the app sees the latest keys. */
        const code = state.currentLanguage?.code || 'en';
        state.translations = createTranslations(code);
      },
      /* Migration:
           v1 → v2: bump default language to Czech (existing logic).
           v2 → v3: drop the persisted `translations` dict so users on
             older builds don't see stale UI strings. partialize above
             prevents future writes; this migrate hook handles already-
             stored entries on first load after the bump. */
      migrate: (persisted: any, fromVersion: number) => {
        if (!persisted) return persisted;
        let next = { ...persisted };
        if (fromVersion < 2) {
          const isAuto = next?.isAutoDetected !== false;
          const onEnglishByDefault = next?.currentLanguage?.code === 'en';
          if (isAuto && onEnglishByDefault) {
            next = {
              ...next,
              currentLanguage: languages[1],
              isAutoDetected: true,
            };
          }
        }
        if (fromVersion < 3) {
          /* Strip the stale dictionary; onRehydrateStorage repopulates
             it from the live bundle. */
          delete next.translations;
        }
        return next;
      },
    }
  )
);
