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
  setLanguage: (language: Language) => void;
  setLanguageByCode: (code: string) => void;
  t: (key: string) => string;
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set, get) => ({
      currentLanguage: languages[0],
      translations: createTranslations(languages[0].code),

      setLanguage: (language: Language) => {
        console.log('🔄 Translation Store: Language changed to', language.code, language.nativeName);
        const newTranslations = createTranslations(language.code);
        set({
          currentLanguage: language,
          translations: newTranslations
        });
      },

      setLanguageByCode: (code: string) => {
        const language = languages.find(lang => lang.code === code);
        if (language) {
          console.log('🔄 Translation Store: Language set to', language.code, language.nativeName);
          const newTranslations = createTranslations(language.code);
          set({
            currentLanguage: language,
            translations: newTranslations
          });
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
