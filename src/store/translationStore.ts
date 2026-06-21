import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations } from '../data/translations';

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
    }
  )
);
