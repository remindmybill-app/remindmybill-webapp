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
