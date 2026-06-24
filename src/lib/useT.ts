import { useTranslationStore } from '../store/translationStore';

/* ─────────────────────────────────────────────────────────────────────────
   useT — translation resolver hook used across the app.

   Wraps `useTranslationStore.t(key)` with a guaranteed English fallback so
   callsites can always render *something* even when a translation hasn't
   landed yet for the current language. Pattern:

     const t = useT();
     <h1>{t('landing.hero.headline', 'Buy and sell CS2 skins')}</h1>

   The store's raw `t()` returns the key back when no translation exists,
   which would surface the slug to users. This helper hides that.

   Skin attributes (market_hash_name, condition labels like "Field-Tested",
   rarity names, etc.) intentionally do NOT have translation keys — those
   are product nouns and the docs are clear we leave them in English. Only
   chrome / UI strings should call useT.
   ───────────────────────────────────────────────────────────────────────── */
export function useT(): (key: string, fallback: string) => string {
  const t = useTranslationStore((s) => s.t);
  return (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
}
