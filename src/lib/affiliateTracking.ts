/**
 * Affiliate Tracking System
 *
 * This module handles affiliate link tracking:
 * 1. Captures the `ref` parameter from URLs
 * 2. Stores affiliate code in localStorage with expiration
 * 3. Records link clicks in Supabase
 * 4. Provides functions to get current affiliate for checkout attribution
 */

import { supabase } from './supabase';

const AFFILIATE_STORAGE_KEY = 'fragranciaria_affiliate';
const AFFILIATE_EXPIRY_DAYS = 30;

interface StoredAffiliate {
  code: string;
  link_id?: string;
  product_id?: string;
  captured_at: string;
  expires_at: string;
}

/**
 * Check URL for affiliate reference and store it
 * Called on app initialization
 */
export async function captureAffiliateFromUrl(): Promise<void> {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');

  if (!refCode) return;

  try {
    // Find the affiliate link
    const { data: link, error } = await supabase
      .from('affiliate_links')
      .select('id, affiliate_id, product_id, code')
      .eq('code', refCode)
      .eq('is_active', true)
      .single();

    if (error || !link) {
      console.warn('Affiliate link not found:', refCode);
      return;
    }

    // Store affiliate info
    const now = new Date();
    const expiresAt = new Date(now.getTime() + AFFILIATE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const affiliateData: StoredAffiliate = {
      code: refCode,
      link_id: link.id,
      product_id: link.product_id,
      captured_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(affiliateData));

    // Record click
    await recordClick(link.id);

    // Clean URL (remove ref parameter)
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('ref');
    window.history.replaceState({}, '', newUrl.toString());

    console.log('Affiliate captured:', refCode);
  } catch (error) {
    console.error('Error capturing affiliate:', error);
  }
}

/**
 * Record a click on an affiliate link
 */
async function recordClick(linkId: string): Promise<void> {
  try {
    // Get existing click count
    const { data: link } = await supabase
      .from('affiliate_links')
      .select('clicks')
      .eq('id', linkId)
      .single();

    // Increment clicks
    await supabase
      .from('affiliate_links')
      .update({
        clicks: (link?.clicks || 0) + 1,
        last_clicked_at: new Date().toISOString()
      })
      .eq('id', linkId);
  } catch (error) {
    console.error('Error recording click:', error);
  }
}

/**
 * Get current stored affiliate info
 */
export function getStoredAffiliate(): StoredAffiliate | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(AFFILIATE_STORAGE_KEY);
  if (!stored) return null;

  try {
    const data: StoredAffiliate = JSON.parse(stored);

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      localStorage.removeItem(AFFILIATE_STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    localStorage.removeItem(AFFILIATE_STORAGE_KEY);
    return null;
  }
}

/**
 * Get affiliate link ID for checkout attribution
 */
export function getAffiliateLinkId(): string | null {
  const affiliate = getStoredAffiliate();
  return affiliate?.link_id || null;
}

/**
 * Get affiliate code for checkout attribution
 */
export function getAffiliateCode(): string | null {
  const affiliate = getStoredAffiliate();
  return affiliate?.code || null;
}

/**
 * Clear stored affiliate (call after order completion if needed)
 */
export function clearStoredAffiliate(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AFFILIATE_STORAGE_KEY);
}

/**
 * Create an affiliate sale record
 * Called from webhook or checkout completion
 */
export async function createAffiliateSale(params: {
  shopify_order_id: string;
  order_number: string;
  order_total: number;
  affiliate_link_id?: string;
  affiliate_code?: string;
}): Promise<{ success: boolean; sale_id?: string; error?: string }> {
  try {
    // If we have a code but no link_id, find the link
    let linkId = params.affiliate_link_id;

    if (!linkId && params.affiliate_code) {
      const { data: link } = await supabase
        .from('affiliate_links')
        .select('id, affiliate_id')
        .eq('code', params.affiliate_code)
        .eq('is_active', true)
        .single();

      if (link) {
        linkId = link.id;
      }
    }

    if (!linkId) {
      return { success: false, error: 'No affiliate link found' };
    }

    // Get link details with affiliate and tier info
    const { data: link, error: linkError } = await supabase
      .from('affiliate_links')
      .select(`
        id,
        affiliate_id,
        affiliates!inner (
          id,
          tier_id,
          affiliate_tiers!inner (
            commission_rate
          )
        )
      `)
      .eq('id', linkId)
      .single();

    if (linkError || !link) {
      return { success: false, error: 'Affiliate link not found' };
    }

    // Calculate commission
    const affiliateData = link.affiliates as any;
    const commissionRate = affiliateData?.affiliate_tiers?.commission_rate || 0.08;
    const commissionAmount = params.order_total * commissionRate;

    // Create sale record
    const { data: sale, error: saleError } = await supabase
      .from('affiliate_sales')
      .insert({
        affiliate_id: link.affiliate_id,
        link_id: linkId,
        shopify_order_id: params.shopify_order_id,
        order_number: params.order_number,
        order_total: params.order_total,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending',
      })
      .select('id')
      .single();

    if (saleError) {
      return { success: false, error: saleError.message };
    }

    // Update link conversions count
    await supabase
      .from('affiliate_links')
      .update({
        conversions: supabase.rpc('increment', { x: 1 })
      })
      .eq('id', linkId);

    return { success: true, sale_id: sale?.id };
  } catch (error: any) {
    console.error('Error creating affiliate sale:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build affiliate link URL
 */
export function buildAffiliateUrl(code: string, productId?: string): string {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://fragranciaria.com.br';

  if (productId) {
    return `${baseUrl}/produto/${productId}?ref=${code}`;
  }

  return `${baseUrl}?ref=${code}`;
}
