// Map currency symbols to ISO codes to prevent RangeError
const SYMBOL_TO_ISO: Record<string, string> = {
  "€": "EUR",
  "$": "USD",
  "£": "GBP",
  "¥": "JPY",
}

function sanitizeCurrency(currency: string): string {
  if (!currency) return "USD"
  const upper = currency.toUpperCase().trim()
  return SYMBOL_TO_ISO[currency] || SYMBOL_TO_ISO[upper] || upper
}

// Hardcoded exchange rates (relative to USD as base)
// Rate means: 1 USD = X of that currency
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CAD: 1.36,
  AUD: 1.53,
}

/**
 * Convert an amount from one currency to another.
 * Uses hardcoded exchange rates with USD as the base.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  const from = sanitizeCurrency(fromCurrency)
  const to = sanitizeCurrency(toCurrency)

  // Same currency, no conversion needed
  if (from === to) return amount

  const fromRate = EXCHANGE_RATES[from] || 1
  const toRate = EXCHANGE_RATES[to] || 1

  // Convert: amount in "from" → USD → "to"
  const usdAmount = amount / fromRate
  return usdAmount * toRate
}

export function formatCurrency(amount: number, currency = "USD", locale = "en-US"): string {
  try {
    const isoCode = sanitizeCurrency(currency)
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: isoCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback: NEVER crash the UI
    console.warn("[formatCurrency] Failed to format, using fallback:", error)
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function getCurrencySymbol(currency = "USD"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$",
  }
  return symbols[currency] || "$"
}

/**
 * Safe date formatter that never throws.
 * Returns "Unknown Date" for invalid/missing date values.
 */
export function safeFormatDate(
  dateString: string | Date | null | undefined,
  formatOptions: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  locale = "en-US"
): string {
  if (!dateString) return "Unknown Date"

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Unknown Date"
    return new Intl.DateTimeFormat(locale, formatOptions).format(date)
  } catch (error) {
    console.warn("[safeFormatDate] Failed to format date, using fallback:", error)
    return "Unknown Date"
  }
}

/**
 * Safely extracts a date string for input[type="date"] value.
 * Returns empty string if date is invalid.
 */
export function safeDateInputValue(dateString: string | Date | null | undefined): string {
  if (!dateString) return ""

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ""
    return date.toISOString().split("T")[0]
  } catch {
    return ""
  }
}
