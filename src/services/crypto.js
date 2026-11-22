/**
 * Live Crypto Price Service
 * Fetches real-time daily market prices and 24h price variations
 * from public free APIs (AwesomeAPI & CoinGecko) with resilient caching and offline fallbacks.
 */

import { storage } from './storage.js';

export const SUPPORTED_CRYPTOS = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: '₿',
    coingeckoId: 'bitcoin',
    awesomeCode: 'BTC-BRL',
    defaultBRL: 560000,
    defaultUSD: 98000
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: '⟠',
    coingeckoId: 'ethereum',
    awesomeCode: 'ETH-BRL',
    defaultBRL: 18500,
    defaultUSD: 3300
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    icon: '◎',
    coingeckoId: 'solana',
    awesomeCode: 'SOL-BRL',
    defaultBRL: 850,
    defaultUSD: 150
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    icon: '₮',
    coingeckoId: 'tether',
    awesomeCode: 'USDT-BRL',
    defaultBRL: 5.60,
    defaultUSD: 1.0
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    icon: '$',
    coingeckoId: 'usd-coin',
    awesomeCode: 'USDC-BRL',
    defaultBRL: 5.60,
    defaultUSD: 1.0
  },
  {
    symbol: 'XRP',
    name: 'XRP / Ripple',
    icon: '✕',
    coingeckoId: 'ripple',
    awesomeCode: 'XRP-BRL',
    defaultBRL: 8.50,
    defaultUSD: 1.50
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    icon: '🟡',
    coingeckoId: 'binancecoin',
    awesomeCode: 'BNB-BRL',
    defaultBRL: 3800,
    defaultUSD: 660
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    icon: '₳',
    coingeckoId: 'cardano',
    awesomeCode: 'ADA-BRL',
    defaultBRL: 4.80,
    defaultUSD: 0.85
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    icon: '🐕',
    coingeckoId: 'dogecoin',
    awesomeCode: 'DOGE-BRL',
    defaultBRL: 1.20,
    defaultUSD: 0.21
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    icon: '🔺',
    coingeckoId: 'avalanche-2',
    awesomeCode: 'AVAX-BRL',
    defaultBRL: 180,
    defaultUSD: 32
  },
  {
    symbol: 'DOT',
    name: 'Polkadot',
    icon: '🟣',
    coingeckoId: 'polkadot',
    awesomeCode: 'DOT-BRL',
    defaultBRL: 45,
    defaultUSD: 8.0
  }
];

const CACHE_KEY = 'crypto_market_prices_v1';
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export const cryptoService = {
  // Returns currently cached prices or default initial data
  getPrices() {
    const cached = storage.get(CACHE_KEY, null);
    if (cached && cached.prices && typeof cached.prices === 'object') {
      return cached.prices;
    }

    // Default fallback initial price map
    const fallback = {};
    SUPPORTED_CRYPTOS.forEach((c) => {
      fallback[c.symbol] = {
        symbol: c.symbol,
        name: c.name,
        icon: c.icon,
        priceBRL: c.defaultBRL,
        priceUSD: c.defaultUSD,
        change24h: 0,
        lastUpdated: new Date().toISOString()
      };
    });
    return fallback;
  },

  isCacheFresh() {
    const cached = storage.get(CACHE_KEY, null);
    if (!cached || !cached.timestamp) return false;
    return Date.now() - cached.timestamp < CACHE_TTL_MS;
  },

  // Fetches market prices from AwesomeAPI and CoinGecko with fallback
  async fetchMarketPrices(force = false) {
    if (!force && this.isCacheFresh()) {
      return this.getPrices();
    }

    const current = this.getPrices();
    const updated = { ...current };

    let fetchedAny = false;

    // 1. Fetch via AwesomeAPI (Ultra-fast, Brazilian BRL endpoints)
    try {
      const awesomePairs = 'BTC-BRL,ETH-BRL,SOL-BRL,XRP-BRL,DOGE-BRL,USDT-BRL';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(`https://economia.awesomeapi.com.br/last/${awesomePairs}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const btcItem = data.BTCBRL;
        const ethItem = data.ETHBRL;
        const solItem = data.SOLBRL;
        const xrpItem = data.XRPBRL;
        const dogeItem = data.DOGEBRL;
        const usdtItem = data.USDTBRL || data.USDBRLT;

        const updateItem = (sym, item) => {
          if (!item) return;
          const bid = parseFloat(item.bid);
          const pct = parseFloat(item.pctChange) || 0;
          if (!isNaN(bid) && bid > 0) {
            const usdApprox = bid / 5.60;
            updated[sym] = {
              ...(updated[sym] || {}),
              symbol: sym,
              priceBRL: bid,
              priceUSD: Number(usdApprox.toFixed(2)),
              change24h: Number(pct.toFixed(2)),
              lastUpdated: new Date().toISOString()
            };
            fetchedAny = true;
          }
        };

        updateItem('BTC', btcItem);
        updateItem('ETH', ethItem);
        updateItem('SOL', solItem);
        updateItem('XRP', xrpItem);
        updateItem('DOGE', dogeItem);
        updateItem('USDT', usdtItem);
        updateItem('USDC', usdtItem); // USDC tracks 1:1 with USDT approx
      }
    } catch (e) {
      console.warn('[CryptoService] AwesomeAPI falhou, tentando CoinGecko...', e.message);
    }

    // 2. Fetch full list via CoinGecko (Global API)
    try {
      const ids = SUPPORTED_CRYPTOS.map((c) => c.coingeckoId).join(',');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl,usd&include_24hr_change=true`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        SUPPORTED_CRYPTOS.forEach((c) => {
          const item = data[c.coingeckoId];
          if (item && item.brl) {
            updated[c.symbol] = {
              symbol: c.symbol,
              name: c.name,
              icon: c.icon,
              priceBRL: Number(item.brl),
              priceUSD: Number(item.usd || item.brl / 5.60),
              change24h: Number((item.brl_24h_change || item.usd_24h_change || 0).toFixed(2)),
              lastUpdated: new Date().toISOString()
            };
            fetchedAny = true;
          }
        });
      }
    } catch (e) {
      console.warn('[CryptoService] CoinGecko falhou ou atingiu limite:', e.message);
    }

    if (fetchedAny) {
      storage.set(CACHE_KEY, {
        timestamp: Date.now(),
        prices: updated
      });
    }

    return updated;
  },

  getCryptoConfig(symbol) {
    const sym = (symbol || '').toUpperCase().trim();
    return SUPPORTED_CRYPTOS.find((c) => c.symbol === sym) || {
      symbol: sym || 'CRYPTO',
      name: sym || 'Criptomoeda',
      icon: '🪙',
      defaultBRL: 1,
      defaultUSD: 1
    };
  },

  calculateHoldingValue(symbol, qty, targetCurrency = 'BRL') {
    const sym = (symbol || '').toUpperCase().trim();
    const prices = this.getPrices();
    const item = prices[sym] || {};
    const unitPriceBRL = item.priceBRL || this.getCryptoConfig(sym).defaultBRL || 1;
    const unitPriceUSD = item.priceUSD || this.getCryptoConfig(sym).defaultUSD || 1;
    const change24h = item.change24h || 0;

    const numericQty = parseFloat(qty) || 0;
    const valueBRL = numericQty * unitPriceBRL;
    const valueUSD = numericQty * unitPriceUSD;

    return {
      symbol: sym,
      qty: numericQty,
      unitPriceBRL,
      unitPriceUSD,
      valueBRL,
      valueUSD,
      displayValue: targetCurrency === 'USD' ? valueUSD : valueBRL,
      change24h
    };
  }
};
