export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          city: string | null
          converted: boolean | null
          converted_at: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          link_id: string
          order_id: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          city?: string | null
          converted?: boolean | null
          converted_at?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          link_id: string
          order_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          city?: string | null
          converted?: boolean | null
          converted_at?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          link_id?: string
          order_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_dashboard_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_id: string
          clicks: number | null
          code: string
          conversions: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_clicked_at: string | null
          product_id: string | null
          product_image: string | null
          product_name: string | null
          product_price: number | null
        }
        Insert: {
          affiliate_id: string
          clicks?: number | null
          code: string
          conversions?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_clicked_at?: string | null
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          product_price?: number | null
        }
        Update: {
          affiliate_id?: string
          clicks?: number | null
          code?: string
          conversions?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_clicked_at?: string | null
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          product_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_dashboard_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_notifications: {
        Row: {
          affiliate_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_notifications_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_dashboard_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_notifications_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          pix_key: string | null
          pix_key_type: string | null
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_dashboard_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_sales: {
        Row: {
          affiliate_id: string
          commission_amount: number
          commission_rate: number
          confirmed_at: string | null
          created_at: string | null
          id: string
          link_id: string | null
          order_number: string | null
          order_total: number
          paid_at: string | null
          payout_id: string | null
          shopify_order_id: string | null
          status: string | null
        }
        Insert: {
          affiliate_id: string
          commission_amount: number
          commission_rate: number
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          link_id?: string | null
          order_number?: string | null
          order_total: number
          paid_at?: string | null
          payout_id?: string | null
          shopify_order_id?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number
          commission_rate?: number
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          link_id?: string | null
          order_number?: string | null
          order_total?: number
          paid_at?: string | null
          payout_id?: string | null
          shopify_order_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_sales_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_dashboard_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_settings: {
        Row: {
          auto_approve_affiliates: boolean | null
          cookie_duration_days: number | null
          created_at: string | null
          default_commission_rate: number | null
          id: string
          min_payout_amount: number | null
          payout_day: number | null
          support_email: string | null
          updated_at: string | null
        }
        Insert: {
          auto_approve_affiliates?: boolean | null
          cookie_duration_days?: number | null
          created_at?: string | null
          default_commission_rate?: number | null
          id?: string
          min_payout_amount?: number | null
          payout_day?: number | null
          support_email?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_approve_affiliates?: boolean | null
          cookie_duration_days?: number | null
          created_at?: string | null
          default_commission_rate?: number | null
          id?: string
          min_payout_amount?: number | null
          payout_day?: number | null
          support_email?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_tier_history: {
        Row: {
          affiliate_id: string
          created_at: string | null
          from_tier_id: string | null
          from_tier_name: string | null
          id: string
          reason: string | null
          sales_amount: number | null
          to_tier_id: string | null
          to_tier_name: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string | null
          from_tier_id?: string | null
          from_tier_name?: string | null
          id?: string
          reason?: string | null
          sales_amount?: number | null
          to_tier_id?: string | null
          to_tier_name?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string | null
          from_tier_id?: string | null
          from_tier_name?: string | null
          id?: string
          reason?: string | null
          sales_amount?: number | null
          to_tier_id?: string | null
          to_tier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_tier_history_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_dashboard_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_tier_history_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_tier_history_from_tier_id_fkey"
            columns: ["from_tier_id"]
            isOneToOne: false
            referencedRelation: "affiliate_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_tier_history_to_tier_id_fkey"
            columns: ["to_tier_id"]
            isOneToOne: false
            referencedRelation: "affiliate_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_tiers: {
        Row: {
          benefits: string[] | null
          color: string | null
          commission_rate: number
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          min_sales_amount: number
          name: string
          sort_order: number | null
        }
        Insert: {
          benefits?: string[] | null
          color?: string | null
          commission_rate: number
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          min_sales_amount?: number
          name: string
          sort_order?: number | null
        }
        Update: {
          benefits?: string[] | null
          color?: string | null
          commission_rate?: number
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          min_sales_amount?: number
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          accepted_terms: boolean | null
          accepted_terms_at: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          affiliate_code: string
          approved_at: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          current_tier_id: string | null
          custom_commission_rate: number | null
          email: string
          full_name: string
          id: string
          instagram: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          status: string | null
          tiktok: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          accepted_terms?: boolean | null
          accepted_terms_at?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          affiliate_code: string
          approved_at?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          current_tier_id?: string | null
          custom_commission_rate?: number | null
          email: string
          full_name: string
          id?: string
          instagram?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          status?: string | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          accepted_terms?: boolean | null
          accepted_terms_at?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          affiliate_code?: string
          approved_at?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          current_tier_id?: string | null
          custom_commission_rate?: number | null
          email?: string
          full_name?: string
          id?: string
          instagram?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          status?: string | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "affiliate_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          channel: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          priority: string
          status: string
          tags: string[]
          unread: boolean
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          priority?: string
          status?: string
          tags?: string[]
          unread?: boolean
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          priority?: string
          status?: string
          tags?: string[]
          unread?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          auth_user_id: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      home_featured_manual: {
        Row: {
          created_at: string
          position: number
          product_id: string
          slot: string
        }
        Insert: {
          created_at?: string
          position?: number
          product_id: string
          slot: string
        }
        Update: {
          created_at?: string
          position?: number
          product_id?: string
          slot?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          read: boolean
          sender: string
          wa_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          read?: boolean
          sender?: string
          wa_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          read?: boolean
          sender?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number | null
          auth_user_id: string | null
          created_at: string | null
          customer_cpf: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          estimated_delivery: string | null
          id: string
          items: Json | null
          metadata: Json | null
          payer_email: string | null
          payment_id: string | null
          payment_method: string | null
          payment_method_id: string | null
          payment_status: string | null
          raw: Json | null
          transaction_amount: number | null
          refund_status: string | null
          shipping_address: Json | null
          shipping_charged_cents: number | null
          shipping_method: string | null
          shipping_price: number | null
          shipping_quoted_cents: number | null
          shipping_rate_quote_id: string | null
          shipping_service_id: number | null
          shipping_service_name: string | null
          shipping_source: string | null
          status: string | null
          status_history: Json | null
          subtotal: number | null
          total: number | null
          tracking_code: string | null
          tracking_token: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          auth_user_id?: string | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          estimated_delivery?: string | null
          id?: string
          items?: Json | null
          metadata?: Json | null
          payer_email?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          raw?: Json | null
          transaction_amount?: number | null
          refund_status?: string | null
          shipping_address?: Json | null
          shipping_charged_cents?: number | null
          shipping_method?: string | null
          shipping_price?: number | null
          shipping_quoted_cents?: number | null
          shipping_rate_quote_id?: string | null
          shipping_service_id?: number | null
          shipping_service_name?: string | null
          shipping_source?: string | null
          status?: string | null
          status_history?: Json | null
          subtotal?: number | null
          total?: number | null
          tracking_code?: string | null
          tracking_token?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          auth_user_id?: string | null
          created_at?: string | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          estimated_delivery?: string | null
          id?: string
          items?: Json | null
          metadata?: Json | null
          payer_email?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          raw?: Json | null
          transaction_amount?: number | null
          refund_status?: string | null
          shipping_address?: Json | null
          shipping_charged_cents?: number | null
          shipping_method?: string | null
          shipping_price?: number | null
          shipping_quoted_cents?: number | null
          shipping_rate_quote_id?: string | null
          shipping_service_id?: number | null
          shipping_service_name?: string | null
          shipping_source?: string | null
          status?: string | null
          status_history?: Json | null
          subtotal?: number | null
          total?: number | null
          tracking_code?: string | null
          tracking_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          brand_slug: string | null
          category: string | null
          category_slug: string | null
          created_at: string
          description: string | null
          external_ids: Json
          featured: boolean
          id: string
          images: string[]
          in_stock: boolean
          is_active: boolean
          is_new: boolean
          name: string
          original_price: number | null
          price: number
          quantity: number
          sku: string | null
          slug: string | null
          subcategory: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          brand?: string | null
          brand_slug?: string | null
          category?: string | null
          category_slug?: string | null
          created_at?: string
          description?: string | null
          external_ids?: Json
          featured?: boolean
          id: string
          images?: string[]
          in_stock?: boolean
          is_active?: boolean
          is_new?: boolean
          name: string
          original_price?: number | null
          price?: number
          quantity?: number
          sku?: string | null
          slug?: string | null
          subcategory?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          brand?: string | null
          brand_slug?: string | null
          category?: string | null
          category_slug?: string | null
          created_at?: string
          description?: string | null
          external_ids?: Json
          featured?: boolean
          id?: string
          images?: string[]
          in_stock?: boolean
          is_active?: boolean
          is_new?: boolean
          name?: string
          original_price?: number | null
          price?: number
          quantity?: number
          sku?: string | null
          slug?: string | null
          subcategory?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          order_id: string
          reason: string
          requested_amount: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          order_id: string
          reason: string
          requested_amount?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          order_id?: string
          reason?: string
          requested_amount?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rate_quotes: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          from_cep: string
          id: string
          items: Json
          options: Json
          source: string
          to_cep: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          from_cep: string
          id?: string
          items: Json
          options: Json
          source: string
          to_cep: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          from_cep?: string
          id?: string
          items?: Json
          options?: Json
          source?: string
          to_cep?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      affiliate_dashboard_summary: {
        Row: {
          active_links_count: number | null
          affiliate_code: string | null
          current_commission_rate: number | null
          current_month_sales: number | null
          email: string | null
          full_name: string | null
          id: string | null
          pending_commission: number | null
          pending_sales_count: number | null
          status: string | null
          tier_color: string | null
          tier_icon: string | null
          tier_name: string | null
          total_clicks: number | null
          total_commission_earned: number | null
          total_commission_paid: number | null
          total_sales_amount: number | null
          total_sales_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_affiliate_code: { Args: never; Returns: string }
      generate_link_code: { Args: never; Returns: string }
      increment_link_clicks: { Args: { link_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
