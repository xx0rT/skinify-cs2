import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslationStore, languages } from '../store/translationStore';

const LanguageDetector: React.FC = () => {
  const location = useLocation();
  const { setLanguageByCode } = useTranslationStore();

  useEffect(() => {
    const path = location.pathname;
    const pathParts = path.split('/').filter(Boolean);

    if (pathParts.length > 0) {
      const potentialLangCode = pathParts[0];
      const isValidLanguage = languages.some(lang => lang.code === potentialLangCode);

      if (isValidLanguage) {
        console.log('🌍 LanguageDetector: Switching to', potentialLangCode);
        setLanguageByCode(potentialLangCode);
        return;
      }
    }

    console.log('🌍 LanguageDetector: Defaulting to en');
    setLanguageByCode('en');
  }, [location.pathname, setLanguageByCode]);

  return null;
};

export default LanguageDetector;
