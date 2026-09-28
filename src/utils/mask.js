/**
 * Currency and Financial Input Mask Helper
 * Automatically handles cents, tens, hundreds, thousands with point and comma separation
 * Supports BRL, USD, EUR, USDT, USDC.
 */

export function formatRawToCurrency(raw, currency = 'BRL') {
  if (raw === null || raw === undefined || raw === '') return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  
  if (currency === 'USD' || currency === 'USDT' || currency === 'USDC') {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (currency === 'EUR') {
    return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseFormattedCurrency(val, currency = 'BRL') {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export function attachCurrencyMask(inputEl, getCurrencyFn = () => 'BRL') {
  if (!inputEl) return;

  const handleInput = () => {
    const cur = typeof getCurrencyFn === 'function' ? getCurrencyFn() : getCurrencyFn;
    const rawVal = inputEl.value;
    if (!rawVal.trim()) {
      inputEl.dataset.numericValue = '0';
      return;
    }
    const formatted = formatRawToCurrency(rawVal, cur);
    inputEl.value = formatted;
    inputEl.dataset.numericValue = String(parseFormattedCurrency(formatted, cur));
  };

  inputEl.addEventListener('input', handleInput);
  inputEl.addEventListener('focus', () => {
    if (!inputEl.value) {
      inputEl.placeholder = typeof getCurrencyFn === 'function' && getCurrencyFn() === 'USD' ? '0.00' : '0,00';
    }
  });

  return {
    reformat: () => handleInput(),
    getNumericValue: () => parseFormattedCurrency(inputEl.value, typeof getCurrencyFn === 'function' ? getCurrencyFn() : getCurrencyFn)
  };
}
