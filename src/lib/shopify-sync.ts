// Stub: Shopify sync is not enabled in this project.
export function isShopifyConfigured(): boolean {
  return false;
}

export type SyncStats = {
  total: number;
  synced: number;
  failed: number;
  lastSync: string | null;
};

export function getSyncStats(): SyncStats {
  return { total: 0, synced: 0, failed: 0, lastSync: null };
}

export async function syncAllProducts(
  onProgress?: (current: number, total: number) => void,
): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  imported: number;
  updated: number;
  errors: string[];
  message: string;
}> {
  onProgress?.(0, 0);
  return {
    success: false,
    synced: 0,
    failed: 0,
    imported: 0,
    updated: 0,
    errors: [],
    message: "Shopify sync não está configurado neste projeto.",
  };
}