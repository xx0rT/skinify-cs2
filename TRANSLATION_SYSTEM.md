# Multi-Language Translation & Auto-Currency System

## Overview
The website now supports URL-based language switching for English, Czech, German, and Russian, plus automatic currency detection based on user location with database persistence.

## Language System

### Primary Languages (URL-based)
- **English (en)** - Default language
- **Czech (cs)** - `/cs/`
- **German (de)** - `/de/`
- **Russian (ru)** - `/ru/`

### Additional Languages (Available in store)
The translation store also includes: Spanish, French, Italian, Portuguese, Polish, Turkish, Arabic, Chinese, Japanese, Korean, Dutch, Swedish, Norwegian, Danish, Finnish, Hungarian, Romanian, Ukrainian, Greek, Thai, Vietnamese, Indonesian, and Hindi.

### URL Format Examples
- English: `skinify.gg/` or `skinify.gg/en/`
- Czech: `skinify.gg/cs/`
- German: `skinify.gg/de/`
- Russian: `skinify.gg/ru/`

### Page Examples
- Czech marketplace: `skinify.gg/cs/marketplace`
- German profile: `skinify.gg/de/profile`
- Russian shop: `skinify.gg/ru/shop/username`
- Czech item detail: `skinify.gg/cs/item/123`

## Currency System

### Auto-Detection
The system automatically detects the user's country based on IP address and sets the appropriate currency:

- **Slovakia (SK)** → EUR
- **Czech Republic (CZ)** → CZK
- **Germany (DE)** → EUR
- **Poland (PL)** → PLN
- **United States (US)** → USD
- **And 100+ more countries...**

### Database Persistence
User preferences are automatically saved to the database:
- `preferred_currency` - User's chosen currency (e.g., 'EUR', 'CZK')
- `preferred_language` - User's language preference (e.g., 'cs', 'en')
- `detected_country` - Country code detected from IP (e.g., 'SK', 'CZ')

### Currency Switching
Users can manually switch currencies through the currency dropdown, and their preference is saved permanently to their profile.

## Translation Keys

### Navigation
- `nav.market`, `nav.inventory`, `nav.orders`, `nav.profile`, `nav.vip`, `nav.rewards`
- `nav.marketplace`, `nav.about`, `nav.contact`, `nav.support`, `nav.faq`, `nav.terms`, `nav.privacy`

### Wallet & Balance
- `balance`, `wallet`, `deposit`, `withdraw`
- `pending.balance`, `available.balance`, `total.balance`
- `currency`, `change.currency`

### Actions
- `search`, `search.items`, `filter`, `sort`, `settings`, `language`
- `login`, `login.steam`, `logout`, `signup`
- `buy.now`, `add.to.cart`, `remove`, `edit`, `delete`
- `view.details`, `view.all`, `load.more`

### Shopping
- `cart`, `checkout`, `my.cart`, `empty.cart`, `continue.shopping`
- `total`, `subtotal`, `price`, `quantity`, `item`, `items`

### Items & Listings
- `hot.items`, `featured`, `trending`, `new.arrivals`, `best.sellers`, `on.sale`
- `float.value`, `wear`, `exterior`, `stattrak`, `souvenir`

### Common
- `loading`, `cancel`, `confirm`, `save`, `close`, `back`, `next`, `previous`
- `submit`, `send`, `yes`, `no`, `ok`

### Messages
- `language.changed`, `currency.changed`, `success`, `error`, `warning`, `info`
- `no.results`, `no.items`

### User
- `welcome`, `my.profile`, `my.orders`, `my.wishlist`, `my.shop`
- `account.settings`, `notifications`, `messages`

## For Developers

### Using Translations in Components
```typescript
import { useTranslationStore } from '../store/translationStore';

const MyComponent = () => {
  const { t, currentLanguage } = useTranslationStore();

  return (
    <div>
      <h1>{t('nav.market')}</h1>
      <p>{t('wallet')}: {t('balance')}</p>
      <button>{t('buy.now')}</button>
      <span>Current: {currentLanguage.nativeName}</span>
    </div>
  );
};
```

### Using Currency in Components
```typescript
import { useCurrencyStore } from '../store/currencyStore';

const PriceDisplay = ({ amount }) => {
  const { selectedCurrency } = useCurrencyStore();

  return (
    <span>
      {selectedCurrency.symbol}{(amount * selectedCurrency.rate).toFixed(2)}
    </span>
  );
};
```

### Adding New Translation Keys
1. Edit `/src/data/translations.ts`
2. Add the key to all language objects (en, cs, de, ru)
3. Use the key in components with `t('your.key')`

## Database Schema

### Users Table
```sql
preferred_currency text DEFAULT 'USD'  -- User's preferred currency code
preferred_language text DEFAULT 'en'   -- User's preferred language code
detected_country text                  -- Auto-detected country code
```

## Files Created/Modified

### New Files
1. `src/data/translations.ts` - Comprehensive translations for 4 languages
2. `src/components/LanguageDetector.tsx` - URL-based language detection

### Modified Files
1. `src/store/translationStore.ts` - Enhanced with new translation system
2. `src/components/Header.tsx` - Uses translations for navigation
3. `src/App.tsx` - Language routes + currency detection with DB save
4. `src/utils/geolocation.ts` - Returns country code with currency

## Build Status
✅ Successfully built in 39.97s with no errors

## Features Implemented
- ✅ URL-based language routing (/cs, /de, /ru, /en)
- ✅ Automatic language detection from URL
- ✅ 100+ translation keys for 4 languages
- ✅ Geo-location based currency detection
- ✅ Database persistence for user preferences
- ✅ Automatic currency setting based on country
- ✅ Currency manual override capability
