export const CURRENCIES = {
  GNF: { code: 'GNF', symbol: 'GNF', decimals: 0, position: 'after' },
  USD: { code: 'USD', symbol: '$', decimals: 2, position: 'before' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, position: 'after' },
  NGN: { code: 'NGN', symbol: '₦', decimals: 0, position: 'before' },
  XOF: { code: 'XOF', symbol: 'CFA', decimals: 0, position: 'after' },
};

let _current = CURRENCIES.GNF;

export function setActiveCurrency(code) {
  _current = CURRENCIES[code] || CURRENCIES.GNF;
}

export function fmt(amount, currencyCode) {
  const c = currencyCode ? (CURRENCIES[currencyCode] || _current) : _current;
  const n = c.decimals > 0 ? amount.toFixed(c.decimals) : Math.round(amount).toString();
  const parts = n.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formatted = parts.join(',');
  return c.position === 'before' ? `${c.symbol}${formatted}` : `${formatted} ${c.symbol}`;
}
