import { useCurrencyStore } from '../store/currencyStore';

/**
 * Format price with styled decimal part
 * - CZK: No decimals (1000 Kč)
 * - USD/EUR: 2 decimals with smaller, darker styling (23.21$)
 */
export function useStyledPrice(priceInCZK: number): {
  wholePart: string;
  decimalPart: string;
  symbol: string;
  hasDecimals: boolean;
} {
  const { selectedCurrency, convertPrice } = useCurrencyStore();
  const convertedPrice = convertPrice(priceInCZK);

  const hasDecimals = selectedCurrency.code !== 'CZK';

  if (!hasDecimals) {
    // CZK - no decimals
    return {
      wholePart: Math.round(convertedPrice).toLocaleString('en-US'),
      decimalPart: '',
      symbol: selectedCurrency.symbol,
      hasDecimals: false
    };
  }

  // USD/EUR - 2 decimals
  const [whole, decimal] = convertedPrice.toFixed(2).split('.');

  return {
    wholePart: Number(whole).toLocaleString('en-US'),
    decimalPart: decimal,
    symbol: selectedCurrency.symbol,
    hasDecimals: true
  };
}

/**
 * Render styled price component
 */
export function StyledPrice({
  price,
  wholeClassName = '',
  decimalClassName = '',
  symbolClassName = ''
}: {
  price: number;
  wholeClassName?: string;
  decimalClassName?: string;
  symbolClassName?: string;
}) {
  const { wholePart, decimalPart, symbol, hasDecimals } = useStyledPrice(price);

  return (
    <span className="inline-flex items-baseline">
      <span className={wholeClassName}>{wholePart}</span>
      {hasDecimals && (
        <span className={`text-[0.85em] opacity-60 ${decimalClassName}`}>
          .{decimalPart}
        </span>
      )}
      <span className={`ml-1 ${symbolClassName}`}>{symbol}</span>
    </span>
  );
}
