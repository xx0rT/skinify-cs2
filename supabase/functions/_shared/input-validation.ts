/**
 * Input Validation and Sanitization Utilities
 * Prevents injection attacks and validates user input
 */

/**
 * Validate Steam ID format
 */
export function validateSteamId(steamId: string): boolean {
  if (!steamId || typeof steamId !== 'string') {
    return false;
  }

  // Steam ID format: 17 digits
  const steamIdRegex = /^[0-9]{17}$/;
  return steamIdRegex.test(steamId);
}

/**
 * Validate amount (currency)
 */
export function validateAmount(amount: any): { valid: boolean; value?: number; error?: string } {
  const numAmount = Number(amount);

  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (numAmount < 0) {
    return { valid: false, error: 'Amount cannot be negative' };
  }

  if (numAmount > 10000000) {
    return { valid: false, error: 'Amount exceeds maximum allowed value' };
  }

  // Check for reasonable decimal places (max 2)
  if (!Number.isInteger(numAmount * 100)) {
    return { valid: false, error: 'Amount can have at most 2 decimal places' };
  }

  return { valid: true, value: numAmount };
}

/**
 * Sanitize string input
 * Removes potential XSS and injection attempts
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim and limit length
  let sanitized = input.trim().substring(0, maxLength);

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate transaction ID format
 */
export function validateTransactionId(txId: string): boolean {
  if (!txId || typeof txId !== 'string') {
    return false;
  }

  // Transaction ID format: TXN-timestamp-random
  const txIdRegex = /^[A-Za-z0-9_-]{10,100}$/;
  return txIdRegex.test(txId);
}

/**
 * Validate order reference
 */
export function validateOrderReference(ref: string): boolean {
  if (!ref || typeof ref !== 'string') {
    return false;
  }

  // Order reference format
  const refRegex = /^[A-Za-z0-9_-]{10,200}$/;
  return refRegex.test(ref);
}

/**
 * Validate currency code
 */
export function validateCurrency(currency: string): boolean {
  const validCurrencies = ['CZK', 'EUR', 'USD', 'GBP'];
  return validCurrencies.includes(currency);
}

/**
 * Validate payment method
 */
export function validatePaymentMethod(method: string): boolean {
  const validMethods = ['card', 'bank', 'gopay', 'revolut'];
  return validMethods.includes(method.toLowerCase());
}

/**
 * Comprehensive input validation for deposit requests
 */
export interface DepositValidation {
  valid: boolean;
  errors: string[];
  sanitized?: {
    steam_id: string;
    amount: number;
    payment_method: string;
    currency: string;
  };
}

export function validateDepositRequest(data: any): DepositValidation {
  const errors: string[] = [];

  // Validate Steam ID
  if (!validateSteamId(data.steam_id)) {
    errors.push('Invalid Steam ID format');
  }

  // Validate amount
  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.valid) {
    errors.push(amountValidation.error || 'Invalid amount');
  }

  // Validate amount range for deposits
  // Use appropriate minimums based on currency
  if (amountValidation.valid && amountValidation.value) {
    const minAmount = currency === 'EUR' ? 2 : 50; // 2 EUR ≈ 50 CZK
    const maxAmount = currency === 'EUR' ? 41000 : 1000000; // 41000 EUR ≈ 1M CZK

    if (amountValidation.value < minAmount) {
      const displayAmount = currency === 'EUR' ? `${minAmount} EUR` : `${minAmount} CZK`;
      errors.push(`Minimum deposit amount is ${displayAmount}`);
    }
    if (amountValidation.value > maxAmount) {
      const displayAmount = currency === 'EUR' ? `${maxAmount} EUR` : `${maxAmount} CZK`;
      errors.push(`Maximum deposit amount is ${displayAmount}`);
    }
  }

  // Validate payment method
  if (!validatePaymentMethod(data.payment_method)) {
    errors.push('Invalid payment method');
  }

  // Validate currency (optional)
  const currency = data.currency || 'CZK';
  if (!validateCurrency(currency)) {
    errors.push('Invalid currency code');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      steam_id: data.steam_id,
      amount: amountValidation.value!,
      payment_method: data.payment_method.toLowerCase(),
      currency: currency
    }
  };
}

/**
 * Validate order creation request
 */
export function validateOrderRequest(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!validateSteamId(data.buyer_steam_id)) {
    errors.push('Invalid buyer Steam ID');
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  if (data.items && data.items.length > 50) {
    errors.push('Cannot order more than 50 items at once');
  }

  const amountValidation = validateAmount(data.total_amount);
  if (!amountValidation.valid) {
    errors.push(amountValidation.error || 'Invalid total amount');
  }

  if (!data.payment_transaction_id) {
    errors.push('Payment transaction ID is required');
  }

  return { valid: errors.length === 0, errors };
}
