import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslationStore, languages } from '../store/translationStore';

/* LanguageDetector — switch the active language whenever a URL with a
   `/:lang/...` prefix is visited. URL is the highest-priority signal:
   a Czech-speaker sharing a `/cs/marketplace` link to a French friend
   should override the friend's auto-detected fr.

   Previously this also FORCED 'en' when the URL had no prefix, which
   immediately overwrote the IP-detected language on every navigation.
   Fixed: if there's no language prefix, we leave the store alone —
   the boot-time geo detect (App.tsx) already chose the right default,
   and the user's manual picker choice survives. */
const LanguageDetector: React.FC = () => {
  const location = useLocation();
  const { setLanguageByCode, currentLanguage } = useTranslationStore();

  useEffect(() => {
    const path = location.pathname;
    const pathParts = path.split('/').filter(Boolean);

    if (pathParts.length > 0) {
      const potentialLangCode = pathParts[0];
      const isValidLanguage = languages.some(lang => lang.code === potentialLangCode);

      if (isValidLanguage && potentialLangCode !== currentLanguage.code) {
        console.log('🌍 LanguageDetector: URL prefix → switching to', potentialLangCode);
        setLanguageByCode(potentialLangCode);
      }
    }
    /* No URL prefix → keep whatever the store decided (auto-detected
       or manually picked). No forced default. */
  }, [location.pathname, setLanguageByCode, currentLanguage.code]);

  return null;
};

export default LanguageDetector;
