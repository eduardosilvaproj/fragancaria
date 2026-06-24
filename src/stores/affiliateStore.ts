import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Affiliate,
  AffiliateDashboardSummary,
  AffiliateLink,
  AffiliateSale,
  AffiliatePayout,
  AffiliateNotification,
  AffiliateTier,
} from '@/types/affiliate';
import {
  affiliateAuth,
  affiliateService,
  linkService,
  saleService,
  payoutService,
  notificationService,
  settingsService,
  onAuthStateChange,
} from '@/lib/supabase';

// =============================================
// INTERFACE DO STORE
// =============================================

interface AffiliateState {
  // Auth
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Dados do afiliado
  affiliate: Affiliate | null;
  dashboardSummary: AffiliateDashboardSummary | null;

  // Listas
  links: AffiliateLink[];
  sales: AffiliateSale[];
  payouts: AffiliatePayout[];
  notifications: AffiliateNotification[];
  tiers: AffiliateTier[];

  // Contadores
  unreadNotificationsCount: number;

  // Actions - Auth
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;

  // Actions - Data
  loadDashboard: () => Promise<void>;
  loadLinks: (page?: number) => Promise<void>;
  loadSales: (page?: number) => Promise<void>;
  loadPayouts: (page?: number) => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadTiers: () => Promise<void>;

  // Actions - Links
  createLink: (productId?: string, productName?: string, productImage?: string, productPrice?: number) => Promise<AffiliateLink>;

  // Actions - Notifications
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  // Actions - Profile
  updateProfile: (data: Partial<Affiliate>) => Promise<void>;

  // Actions - Helpers
  clearError: () => void;
  reset: () => void;
}

// =============================================
// STORE
// =============================================

export const useAffiliateStore = create<AffiliateState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      isAuthenticated: false,
      isLoading: false,
      error: null,
      affiliate: null,
      dashboardSummary: null,
      links: [],
      sales: [],
      payouts: [],
      notifications: [],
      tiers: [],
      unreadNotificationsCount: 0,

      // =============================================
      // AUTH
      // =============================================

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { affiliate } = await affiliateAuth.login(email, password);

          if (affiliate.status === 'pending') {
            await affiliateAuth.logout();
            throw new Error('Sua conta ainda está em análise. Aguarde a aprovação.');
          }

          if (affiliate.status === 'rejected') {
            await affiliateAuth.logout();
            throw new Error('Sua solicitação foi recusada. Entre em contato com o suporte.');
          }

          if (affiliate.status === 'suspended') {
            await affiliateAuth.logout();
            throw new Error('Sua conta está suspensa. Entre em contato com o suporte.');
          }

          set({ isAuthenticated: true, affiliate, isLoading: false });

          // Carregar dados do dashboard
          await get().loadDashboard();
          await get().loadNotifications();
          await get().loadTiers();
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Erro ao fazer login',
            isAuthenticated: false,
            affiliate: null,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await affiliateAuth.logout();
        } catch (error) {
          console.error('Erro no logout:', error);
        } finally {
          get().reset();
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const session = await affiliateAuth.getSession();
          if (!session) {
            set({ isAuthenticated: false, affiliate: null, isLoading: false });
            return;
          }

          const affiliate = await affiliateService.getCurrentAffiliate();
          if (!affiliate || affiliate.status !== 'approved') {
            await affiliateAuth.logout();
            set({ isAuthenticated: false, affiliate: null, isLoading: false });
            return;
          }

          set({ isAuthenticated: true, affiliate, isLoading: false });

          // Carregar dados
          await get().loadDashboard();
          await get().loadNotifications();
          await get().loadTiers();
        } catch (error) {
          set({ isAuthenticated: false, affiliate: null, isLoading: false });
        }
      },

      // =============================================
      // DATA LOADING
      // =============================================

      loadDashboard: async () => {
        try {
          const summary = await affiliateService.getDashboardSummary();
          set({ dashboardSummary: summary });
        } catch (error) {
          console.error('Erro ao carregar dashboard:', error);
        }
      },

      loadLinks: async (page = 1) => {
        try {
          const response = await linkService.getLinks(page);
          set({ links: response.data });
        } catch (error) {
          console.error('Erro ao carregar links:', error);
        }
      },

      loadSales: async (page = 1) => {
        try {
          const response = await saleService.getSales({}, page);
          set({ sales: response.data });
        } catch (error) {
          console.error('Erro ao carregar vendas:', error);
        }
      },

      loadPayouts: async (page = 1) => {
        try {
          const response = await payoutService.getPayouts({}, page);
          set({ payouts: response.data });
        } catch (error) {
          console.error('Erro ao carregar pagamentos:', error);
        }
      },

      loadNotifications: async () => {
        try {
          const response = await notificationService.getNotifications();
          const unreadCount = response.data.filter((n) => !n.is_read).length;
          set({ notifications: response.data, unreadNotificationsCount: unreadCount });
        } catch (error) {
          console.error('Erro ao carregar notificações:', error);
        }
      },

      loadTiers: async () => {
        try {
          const tiers = await settingsService.getTiers();
          set({ tiers });
        } catch (error) {
          console.error('Erro ao carregar tiers:', error);
        }
      },

      // =============================================
      // LINKS
      // =============================================

      createLink: async (productId, productName, productImage, productPrice) => {
        try {
          const link = await linkService.createLink({
            product_id: productId,
            product_name: productName,
            product_image: productImage,
            product_price: productPrice,
          });

          set((state) => ({ links: [link, ...state.links] }));
          return link;
        } catch (error: any) {
          set({ error: error.message || 'Erro ao criar link' });
          throw error;
        }
      },

      // =============================================
      // NOTIFICATIONS
      // =============================================

      markNotificationAsRead: async (id) => {
        try {
          await notificationService.markAsRead(id);
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
            ),
            unreadNotificationsCount: Math.max(0, state.unreadNotificationsCount - 1),
          }));
        } catch (error) {
          console.error('Erro ao marcar notificação:', error);
        }
      },

      markAllNotificationsAsRead: async () => {
        try {
          await notificationService.markAllAsRead();
          set((state) => ({
            notifications: state.notifications.map((n) => ({
              ...n,
              is_read: true,
              read_at: new Date().toISOString(),
            })),
            unreadNotificationsCount: 0,
          }));
        } catch (error) {
          console.error('Erro ao marcar notificações:', error);
        }
      },

      // =============================================
      // PROFILE
      // =============================================

      updateProfile: async (data) => {
        try {
          const updated = await affiliateService.updateProfile(data);
          set({ affiliate: updated });
        } catch (error: any) {
          set({ error: error.message || 'Erro ao atualizar perfil' });
          throw error;
        }
      },

      // =============================================
      // HELPERS
      // =============================================

      clearError: () => set({ error: null }),

      reset: () =>
        set({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          affiliate: null,
          dashboardSummary: null,
          links: [],
          sales: [],
          payouts: [],
          notifications: [],
          unreadNotificationsCount: 0,
        }),
    }),
    {
      name: 'affiliate-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        affiliate: state.affiliate,
      }),
    }
  )
);

// =============================================
// LISTENER DE AUTENTICAÇÃO
// =============================================

// Inicializar listener de auth
if (typeof window !== 'undefined') {
  onAuthStateChange((user) => {
    if (!user) {
      useAffiliateStore.getState().reset();
    }
  });
}
