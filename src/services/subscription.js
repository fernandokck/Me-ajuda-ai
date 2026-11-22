/**
 * Subscription Service (Free vs. PRO / Premium Engine)
 * Controls feature access, limits, tier states, and local testing simulation.
 */

import { storage } from './storage.js';
import { gamification } from './gamification.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro'
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due',
  TRIAL: 'trial',
  NONE: 'none'
};

export const subscriptionService = {
  /**
   * Get current subscription state for a user
   */
  getSubscription(userEmail) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const profile = gamification.getProfile(cleanEmail) || {};
    
    // Check if local dev override is active in storage
    const devOverride = storage.get(`dev_sub_override_${cleanEmail}`, null);
    if (devOverride) {
      return {
        tier: devOverride.tier || SUBSCRIPTION_TIERS.FREE,
        status: devOverride.status || SUBSCRIPTION_STATUS.NONE,
        isPro: devOverride.tier === SUBSCRIPTION_TIERS.PRO && devOverride.status === SUBSCRIPTION_STATUS.ACTIVE,
        expiresAt: devOverride.expiresAt || null,
        isDevSimulated: true
      };
    }

    const tier = profile.subscription_tier || SUBSCRIPTION_TIERS.FREE;
    const status = profile.subscription_status || SUBSCRIPTION_STATUS.NONE;
    const isPro = tier === SUBSCRIPTION_TIERS.PRO && (status === SUBSCRIPTION_STATUS.ACTIVE || status === SUBSCRIPTION_STATUS.TRIAL);

    return {
      tier,
      status,
      isPro,
      expiresAt: profile.subscription_expires_at || null,
      isDevSimulated: false
    };
  },

  /**
   * Check if user can access a specific feature
   */
  canAccess(userEmail, featureKey) {
    const sub = this.getSubscription(userEmail);
    if (sub.isPro) return true;

    // Feature gates for FREE tier
    switch (featureKey) {
      case 'financial_report':
        // Executive PDF/HTML Dossier is PRO only
        return false;
      
      case 'multi_wallet':
        // Free allows max 1 wallet
        return false;

      case 'multi_currency':
        // Free is BRL only; USD, EUR, Cripto are PRO
        return false;

      case 'unlimited_budgets':
        // Free allows up to 2 budget goals
        return false;

      case 'full_history':
        // Free allows last 2 months; > 2 months is PRO
        return false;

      case 'ai_action_plan':
        // Full AI Strategic Plan is PRO only
        return false;

      default:
        return true;
    }
  },

  /**
   * Get maximum allowed items for a feature on FREE vs PRO
   */
  getLimit(userEmail, featureKey) {
    const sub = this.getSubscription(userEmail);
    if (sub.isPro) return Infinity;

    switch (featureKey) {
      case 'wallets_count':
        return 1; // Free allows 1 wallet
      case 'budgets_count':
        return 2; // Free allows 2 category budget goals
      case 'history_months':
        return 2; // Free allows 2 months of history
      default:
        return Infinity;
    }
  },

  /**
   * Set subscription state (local and cloud sync)
   */
  async setSubscription(userEmail, { tier, status, expiresAt = null, customerId = null }) {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const profile = gamification.getProfile(cleanEmail) || {};

    const updatedProfile = {
      ...profile,
      subscription_tier: tier,
      subscription_status: status,
      subscription_expires_at: expiresAt,
      customer_id: customerId || profile.customer_id || null
    };

    gamification.saveProfile(cleanEmail, updatedProfile);

    // Save dev simulation state
    storage.set(`dev_sub_override_${cleanEmail}`, {
      tier,
      status,
      expiresAt
    });

    // Sync with Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').update({
          subscription_tier: tier,
          subscription_status: status,
          subscription_expires_at: expiresAt,
          customer_id: customerId,
          updated_at: new Date().toISOString()
        }).eq('user_email', cleanEmail);
      } catch (e) {
        console.warn('[Subscription] Erro ao sincronizar com Supabase:', e);
      }
    }

    return this.getSubscription(cleanEmail);
  },

  /**
   * Quick toggle for local testing in development
   */
  toggleDevSimulatedPro(userEmail) {
    const current = this.getSubscription(userEmail);
    if (current.isPro) {
      // Switch to FREE
      this.setSubscription(userEmail, {
        tier: SUBSCRIPTION_TIERS.FREE,
        status: SUBSCRIPTION_STATUS.NONE,
        expiresAt: null
      });
      return false;
    } else {
      // Switch to PRO
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      this.setSubscription(userEmail, {
        tier: SUBSCRIPTION_TIERS.PRO,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        expiresAt: nextYear.toISOString()
      });
      return true;
    }
  }
};
