import { supabase } from '../lib/supabaseClient';
import { useCurrencyStore, currencies } from '../store/currencyStore';
import { useTranslationStore, languages } from '../store/translationStore';

export async function loadUserPreferences(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('preferred_currency, preferred_language, detected_country')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not load user preferences:', error.message);
      return;
    }

    if (!data) {
      console.log('No user preferences found');
      return;
    }

    console.log('📋 Loaded user preferences:', data);

    // Apply currency preference
    if (data.preferred_currency) {
      const currency = currencies.find(c => c.code === data.preferred_currency);
      if (currency) {
        const { setCurrency } = useCurrencyStore.getState();
        setCurrency(currency);
        console.log('✅ Applied saved currency:', currency.code);
      }
    }

    // Apply language preference
    if (data.preferred_language) {
      const language = languages.find(l => l.code === data.preferred_language);
      if (language) {
        const { setLanguage } = useTranslationStore.getState();
        setLanguage(language);
        console.log('✅ Applied saved language:', language.code);
      }
    }

    return data;
  } catch (err) {
    console.error('Error loading user preferences:', err);
  }
}

export async function saveUserCurrency(userId: string, currencyCode: string, countryCode?: string) {
  try {
    const updateData: any = {
      preferred_currency: currencyCode
    };

    if (countryCode) {
      updateData.detected_country = countryCode;
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.warn('Could not save currency preference:', error.message);
      return false;
    }

    console.log('✅ Currency preference saved:', currencyCode);
    return true;
  } catch (err) {
    console.error('Error saving currency:', err);
    return false;
  }
}

export async function saveUserLanguage(userId: string, languageCode: string) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ preferred_language: languageCode })
      .eq('id', userId);

    if (error) {
      console.warn('Could not save language preference:', error.message);
      return false;
    }

    console.log('✅ Language preference saved:', languageCode);
    return true;
  } catch (err) {
    console.error('Error saving language:', err);
    return false;
  }
}
