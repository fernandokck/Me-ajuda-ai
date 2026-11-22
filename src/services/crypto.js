/**
 * Live Crypto Price Service (CoinGecko Top 100 with Real Official Coin Images)
 * Fetches real-time daily market prices, official CDN images, and 24h price variations
 * from public free CoinGecko & AwesomeAPI endpoints with resilient caching and Top 100 baseline.
 */

import { storage } from './storage.js';
import top100Data from './cryptoTop100.json';

export const SUPPORTED_CRYPTOS = top100Data;

const CACHE_KEY = 'crypto_market_prices_v2';
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export const cryptoService = {
  // Returns currently cached prices or top 100 initial data
  getPrices() {
    const cached = storage.get(CACHE_KEY, null);
    if (cached && cached.prices && typeof cached.prices === 'object') {
      return cached.prices;
    }

    // Baseline fallback from Top 100
    const fallback = {};
    SUPPORTED_CRYPTOS.forEach((c) => {
      fallback[c.symbol] = {
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        image: c.image,
        priceBRL: c.priceBRL,
        priceUSD: Number((c.priceBRL / 5.60).toFixed(2)),
        change24h: c.change24h || 0,
        rank: c.rank || 0,
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

  // Fetches market prices from CoinGecko Top 100 and AwesomeAPI with fallback
  async fetchMarketPrices(force = false) {
    if (!force && this.isCacheFresh()) {
      return this.getPrices();
    }

    const current = this.getPrices();
    const updated = { ...current };

    let fetchedAny = false;

    // 1. Fetch Top 100 via CoinGecko Markets API (Full list + Real Images + 24h Change)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=brl&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h',
        {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((c) => {
            const sym = c.symbol.toUpperCase();
            const priceBRL = Number(c.current_price) || (updated[sym]?.priceBRL) || 0;
            const priceUSD = Number((priceBRL / 5.60).toFixed(2));
            const change = c.price_change_percentage_24h !== null && c.price_change_percentage_24h !== undefined
              ? Number(Number(c.price_change_percentage_24h).toFixed(2))
              : (updated[sym]?.change24h || 0);

            updated[sym] = {
              id: c.id,
              symbol: sym,
              name: c.name,
              image: c.image || updated[sym]?.image,
              priceBRL,
              priceUSD,
              change24h: change,
              rank: c.market_cap_rank || updated[sym]?.rank || 0,
              lastUpdated: new Date().toISOString()
            };
          });
          fetchedAny = true;
        }
      }
    } catch (e) {
      console.warn('[CryptoService] CoinGecko Top 100 falhou ou timeout:', e.message);
    }

    // 2. Fast Fallback via AwesomeAPI for major coins
    try {
      const awesomePairs = 'BTC-BRL,ETH-BRL,SOL-BRL,XRP-BRL,DOGE-BRL,USDT-BRL';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const resp = await fetch(`https://economia.awesomeapi.com.br/last/${awesomePairs}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const updateAwesome = (sym, item) => {
          if (!item) return;
          const bid = parseFloat(item.bid);
          const pct = parseFloat(item.pctChange) || 0;
          if (!isNaN(bid) && bid > 0) {
            updated[sym] = {
              ...(updated[sym] || {}),
              symbol: sym,
              priceBRL: bid,
              priceUSD: Number((bid / 5.60).toFixed(2)),
              change24h: Number(pct.toFixed(2)),
              lastUpdated: new Date().toISOString()
            };
            fetchedAny = true;
          }
        };

        updateAwesome('BTC', data.BTCBRL);
        updateAwesome('ETH', data.ETHBRL);
        updateAwesome('SOL', data.SOLBRL);
        updateAwesome('XRP', data.XRPBRL);
        updateAwesome('DOGE', data.DOGEBRL);
        updateAwesome('USDT', data.USDTBRL || data.USDBRLT);
        updateAwesome('USDC', data.USDTBRL || data.USDBRLT);
      }
    } catch (e) {
      console.warn('[CryptoService] AwesomeAPI falhou:', e.message);
    }

    if (fetchedAny) {
      storage.set(CACHE_KEY, {
        timestamp: Date.now(),
        prices: updated
      });
    }

    return updated;
  },

  getCryptoConfig(symbolOrId) {
    const target = (symbolOrId || '').toUpperCase().trim();
    const lowerTarget = (symbolOrId || '').toLowerCase().trim();

    const found = SUPPORTED_CRYPTOS.find(
      (c) => c.symbol.toUpperCase() === target || c.id.toLowerCase() === lowerTarget
    );

    if (found) return found;

    return {
      id: lowerTarget || 'crypto',
      symbol: target || 'CRYPTO',
      name: target || 'Criptomoeda',
      image: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
      priceBRL: 1,
      change24h: 0,
      rank: 999
    };
  },

  calculateHoldingValue(symbolOrId, qty, targetCurrency = 'BRL') {
    const cfg = this.getCryptoConfig(symbolOrId);
    const sym = cfg.symbol;
    const prices = this.getPrices();
    const item = prices[sym] || cfg;

    const unitPriceBRL = Number(item.priceBRL) || cfg.priceBRL || 1;
    const unitPriceUSD = Number(item.priceUSD) || Number((unitPriceBRL / 5.60).toFixed(2)) || 1;
    const change24h = item.change24h !== undefined ? item.change24h : (cfg.change24h || 0);
    const image = item.image || cfg.image;
    const name = item.name || cfg.name;

    const numericQty = parseFloat(qty) || 0;
    const valueBRL = numericQty * unitPriceBRL;
    const valueUSD = numericQty * unitPriceUSD;

    return {
      id: cfg.id,
      symbol: sym,
      name,
      image,
      rank: cfg.rank,
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
