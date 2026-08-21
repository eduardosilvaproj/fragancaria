// Gerado automaticamente por scripts/gen-supabase-types.mjs.
// Fonte: OpenAPI do projeto (PostgREST). Nao editar manualmente.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      shipping_stats: {
        Row: {
          status: string | null
          count: number | null
        }
        Insert: {
          status?: string | null
          count?: number | null
        }
        Update: {
          status?: string | null
          count?: number | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          name?: string | null
          slug?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_dashboard_summary: {
        Row: {
          id: string | null
          user_id: string | null
          full_name: string | null
          email: string | null
          affiliate_code: string | null
          status: string | null
          tier_name: string | null
          tier_icon: string | null
          tier_color: string | null
          current_commission_rate: number | null
          total_clicks: number | null
          total_sales_count: number | null
          total_sales_amount: number | null
          total_commission_earned: number | null
          total_commission_paid: number | null
          pending_commission: number | null
          current_month_sales: number | null
          active_links_count: number | null
          pending_sales_count: number | null
        }
        Insert: {
          id?: string | null
          user_id?: string | null
          full_name?: string | null
          email?: string | null
          affiliate_code?: string | null
          status?: string | null
          tier_name?: string | null
          tier_icon?: string | null
          tier_color?: string | null
          current_commission_rate?: number | null
          total_clicks?: number | null
          total_sales_count?: number | null
          total_sales_amount?: number | null
          total_commission_earned?: number | null
          total_commission_paid?: number | null
          pending_commission?: number | null
          current_month_sales?: number | null
          active_links_count?: number | null
          pending_sales_count?: number | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          full_name?: string | null
          email?: string | null
          affiliate_code?: string | null
          status?: string | null
          tier_name?: string | null
          tier_icon?: string | null
          tier_color?: string | null
          current_commission_rate?: number | null
          total_clicks?: number | null
          total_sales_count?: number | null
          total_sales_amount?: number | null
          total_commission_earned?: number | null
          total_commission_paid?: number | null
          pending_commission?: number | null
          current_month_sales?: number | null
          active_links_count?: number | null
          pending_sales_count?: number | null
        }
        Relationships: []
      }
      shipping_rate_quotes: {
        Row: {
          id: string
          cache_key: string
          from_cep: string
          to_cep: string
          items: Json
          options: Json
          source: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          cache_key?: string
          from_cep?: string
          to_cep?: string
          items?: Json
          options?: Json
          source?: string
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string | null
          cache_key?: string | null
          from_cep?: string | null
          to_cep?: string | null
          items?: Json | null
          options?: Json | null
          source?: string | null
          created_at?: string | null
          expires_at?: string | null
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          id: string
          product_id: string
          customer_id: string | null
          order_id: string | null
          rating: number
          title: string | null
          content: string | null
          images: string[] | null
          is_verified_purchase: boolean
          status: string
          moderated_at: string | null
          moderated_by: string | null
          rejection_reason: string | null
          helpful_count: number
          store_reply: string | null
          store_reply_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id?: string
          customer_id?: string | null
          order_id?: string | null
          rating?: number
          title?: string | null
          content?: string | null
          images?: string[] | null
          is_verified_purchase?: boolean
          status?: string
          moderated_at?: string | null
          moderated_by?: string | null
          rejection_reason?: string | null
          helpful_count?: number
          store_reply?: string | null
          store_reply_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          product_id?: string | null
          customer_id?: string | null
          order_id?: string | null
          rating?: number | null
          title?: string | null
          content?: string | null
          images?: string[] | null
          is_verified_purchase?: boolean | null
          status?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          rejection_reason?: string | null
          helpful_count?: number | null
          store_reply?: string | null
          store_reply_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          id: number
          event: string
          audience: string
          channel: string
          destination: string | null
          enabled: boolean
          template_ref: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          event?: string
          audience?: string
          channel?: string
          destination?: string | null
          enabled?: boolean
          template_ref?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number | null
          event?: string | null
          audience?: string | null
          channel?: string | null
          destination?: string | null
          enabled?: boolean | null
          template_ref?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          customer_cpf: string | null
          shipping_address: Json | null
          items: Json | null
          subtotal: number | null
          shipping_price: number | null
          discount: number | null
          total: number | null
          amount: number | null
          payment_method: string | null
          payment_id: string | null
          payment_status: string | null
          shipping_method: string | null
          tracking_code: string | null
          estimated_delivery: string | null
          status: string | null
          status_history: Json | null
          metadata: Json | null
          payer_email: string | null
          raw: Json | null
          auth_user_id: string | null
          refund_status: string | null
          tracking_token: string | null
          nfe_key: string | null
          nfe_number: number | null
          nfe_series: number | null
          nfe_status: string | null
          nfe_xml: string | null
          nfe_danfe_url: string | null
          nfe_emitted_at: string | null
          processing_started_at: string | null
          processing_finished_at: string | null
          shipping_service_id: number | null
          shipping_carrier: string | null
          shipping_service_name: string | null
          shipping_quoted_cents: number | null
          shipping_charged_cents: number | null
          shipping_actual_cents: number | null
          shipping_source: string | null
          shipping_rate_quote_id: string | null
          payment_method_id: string | null
          transaction_amount: number | null
          affiliate_id: string | null
          affiliate_link_id: string | null
          affiliate_commission_rate: number | null
          coupon_code: string | null
          shipping_ibge_code: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_term: string | null
          whatsapp_sent_approved: string | null
          whatsapp_sent_shipped: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          customer_cpf?: string | null
          shipping_address?: Json | null
          items?: Json | null
          subtotal?: number | null
          shipping_price?: number | null
          discount?: number | null
          total?: number | null
          amount?: number | null
          payment_method?: string | null
          payment_id?: string | null
          payment_status?: string | null
          shipping_method?: string | null
          tracking_code?: string | null
          estimated_delivery?: string | null
          status?: string | null
          status_history?: Json | null
          metadata?: Json | null
          payer_email?: string | null
          raw?: Json | null
          auth_user_id?: string | null
          refund_status?: string | null
          tracking_token?: string | null
          nfe_key?: string | null
          nfe_number?: number | null
          nfe_series?: number | null
          nfe_status?: string | null
          nfe_xml?: string | null
          nfe_danfe_url?: string | null
          nfe_emitted_at?: string | null
          processing_started_at?: string | null
          processing_finished_at?: string | null
          shipping_service_id?: number | null
          shipping_carrier?: string | null
          shipping_service_name?: string | null
          shipping_quoted_cents?: number | null
          shipping_charged_cents?: number | null
          shipping_actual_cents?: number | null
          shipping_source?: string | null
          shipping_rate_quote_id?: string | null
          payment_method_id?: string | null
          transaction_amount?: number | null
          affiliate_id?: string | null
          affiliate_link_id?: string | null
          affiliate_commission_rate?: number | null
          coupon_code?: string | null
          shipping_ibge_code?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          whatsapp_sent_approved?: string | null
          whatsapp_sent_shipped?: string | null
        }
        Update: {
          id?: string | null
          created_at?: string | null
          updated_at?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          customer_cpf?: string | null
          shipping_address?: Json | null
          items?: Json | null
          subtotal?: number | null
          shipping_price?: number | null
          discount?: number | null
          total?: number | null
          amount?: number | null
          payment_method?: string | null
          payment_id?: string | null
          payment_status?: string | null
          shipping_method?: string | null
          tracking_code?: string | null
          estimated_delivery?: string | null
          status?: string | null
          status_history?: Json | null
          metadata?: Json | null
          payer_email?: string | null
          raw?: Json | null
          auth_user_id?: string | null
          refund_status?: string | null
          tracking_token?: string | null
          nfe_key?: string | null
          nfe_number?: number | null
          nfe_series?: number | null
          nfe_status?: string | null
          nfe_xml?: string | null
          nfe_danfe_url?: string | null
          nfe_emitted_at?: string | null
          processing_started_at?: string | null
          processing_finished_at?: string | null
          shipping_service_id?: number | null
          shipping_carrier?: string | null
          shipping_service_name?: string | null
          shipping_quoted_cents?: number | null
          shipping_charged_cents?: number | null
          shipping_actual_cents?: number | null
          shipping_source?: string | null
          shipping_rate_quote_id?: string | null
          payment_method_id?: string | null
          transaction_amount?: number | null
          affiliate_id?: string | null
          affiliate_link_id?: string | null
          affiliate_commission_rate?: number | null
          coupon_code?: string | null
          shipping_ibge_code?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          whatsapp_sent_approved?: string | null
          whatsapp_sent_shipped?: string | null
        }
        Relationships: []
      }
      shipping_tags: {
        Row: {
          id: string
          order_id: string | null
          tracking_code: string
          service: string
          status: string
          recipient_name: string | null
          recipient_document: string | null
          recipient_phone: string | null
          recipient_email: string | null
          recipient_address: Json | null
          weight_grams: number | null
          height_cm: number | null
          width_cm: number | null
          length_cm: number | null
          declared_value: number | null
          linked_at: string | null
          shipped_at: string | null
          last_tracking_status: string | null
          last_tracking_date: string | null
          tracking_history: Json | null
          label_pdf_url: string | null
          sigep_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          tracking_code?: string
          service?: string
          status?: string
          recipient_name?: string | null
          recipient_document?: string | null
          recipient_phone?: string | null
          recipient_email?: string | null
          recipient_address?: Json | null
          weight_grams?: number | null
          height_cm?: number | null
          width_cm?: number | null
          length_cm?: number | null
          declared_value?: number | null
          linked_at?: string | null
          shipped_at?: string | null
          last_tracking_status?: string | null
          last_tracking_date?: string | null
          tracking_history?: Json | null
          label_pdf_url?: string | null
          sigep_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          order_id?: string | null
          tracking_code?: string | null
          service?: string | null
          status?: string | null
          recipient_name?: string | null
          recipient_document?: string | null
          recipient_phone?: string | null
          recipient_email?: string | null
          recipient_address?: Json | null
          weight_grams?: number | null
          height_cm?: number | null
          width_cm?: number | null
          length_cm?: number | null
          declared_value?: number | null
          linked_at?: string | null
          shipped_at?: string | null
          last_tracking_status?: string | null
          last_tracking_date?: string | null
          tracking_history?: Json | null
          label_pdf_url?: string | null
          sigep_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          id: number
          mp_public_key: string | null
          mp_access_token: string | null
          mp_sandbox: boolean
          min_installments: number
          max_installments: number
          free_installments: number
          enabled_methods: string[]
          updated_at: string
        }
        Insert: {
          id?: number
          mp_public_key?: string | null
          mp_access_token?: string | null
          mp_sandbox?: boolean
          min_installments?: number
          max_installments?: number
          free_installments?: number
          enabled_methods?: string[]
          updated_at?: string
        }
        Update: {
          id?: number | null
          mp_public_key?: string | null
          mp_access_token?: string | null
          mp_sandbox?: boolean | null
          min_installments?: number | null
          max_installments?: number | null
          free_installments?: number | null
          enabled_methods?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          id: string
          order_id: string
          user_id: string
          reason: string
          requested_amount: number | null
          status: string
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id?: string
          user_id?: string
          reason?: string
          requested_amount?: number | null
          status?: string
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          order_id?: string | null
          user_id?: string | null
          reason?: string | null
          requested_amount?: number | null
          status?: string | null
          admin_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          id: string
          link_id: string
          affiliate_id: string
          ip_address: string | null
          user_agent: string | null
          referrer: string | null
          country: string | null
          city: string | null
          device_type: string | null
          session_id: string | null
          converted: boolean | null
          converted_at: string | null
          order_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          link_id?: string
          affiliate_id?: string
          ip_address?: string | null
          user_agent?: string | null
          referrer?: string | null
          country?: string | null
          city?: string | null
          device_type?: string | null
          session_id?: string | null
          converted?: boolean | null
          converted_at?: string | null
          order_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          link_id?: string | null
          affiliate_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          referrer?: string | null
          country?: string | null
          city?: string | null
          device_type?: string | null
          session_id?: string | null
          converted?: boolean | null
          converted_at?: string | null
          order_id?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      home_featured_manual: {
        Row: {
          slot: string
          product_id: string
          position: number
          created_at: string
        }
        Insert: {
          slot?: string
          product_id?: string
          position?: number
          created_at?: string
        }
        Update: {
          slot?: string | null
          product_id?: string | null
          position?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          id: number
          loja_aberta: boolean
          endereco_rua: string
          endereco_numero: string
          endereco_bairro: string
          endereco_cidade: string
          endereco_uf: string
          endereco_cep: string
          horario_semana: string
          horario_sabado: string
          foto_url: string
          telefone: string
          whatsapp: string
          email: string
          cnpj: string
          updated_at: string
        }
        Insert: {
          id?: number
          loja_aberta?: boolean
          endereco_rua?: string
          endereco_numero?: string
          endereco_bairro?: string
          endereco_cidade?: string
          endereco_uf?: string
          endereco_cep?: string
          horario_semana?: string
          horario_sabado?: string
          foto_url?: string
          telefone?: string
          whatsapp?: string
          email?: string
          cnpj?: string
          updated_at?: string
        }
        Update: {
          id?: number | null
          loja_aberta?: boolean | null
          endereco_rua?: string | null
          endereco_numero?: string | null
          endereco_bairro?: string | null
          endereco_cidade?: string | null
          endereco_uf?: string | null
          endereco_cep?: string | null
          horario_semana?: string | null
          horario_sabado?: string | null
          foto_url?: string | null
          telefone?: string | null
          whatsapp?: string | null
          email?: string | null
          cnpj?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          auth_user_id: string | null
          email: string | null
          name: string | null
          phone: string | null
          cpf: string | null
          birth_date: string | null
          created_at: string
          updated_at: string
          blocked: boolean
          blocked_at: string | null
          blocked_reason: string | null
          loyalty_points: number
          loyalty_tier: string
          whatsapp_opt_in: boolean | null
          whatsapp_opt_in_at: string | null
          whatsapp_opt_in_source: string | null
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          email?: string | null
          name?: string | null
          phone?: string | null
          cpf?: string | null
          birth_date?: string | null
          created_at?: string
          updated_at?: string
          blocked?: boolean
          blocked_at?: string | null
          blocked_reason?: string | null
          loyalty_points?: number
          loyalty_tier?: string
          whatsapp_opt_in?: boolean | null
          whatsapp_opt_in_at?: string | null
          whatsapp_opt_in_source?: string | null
        }
        Update: {
          id?: string | null
          auth_user_id?: string | null
          email?: string | null
          name?: string | null
          phone?: string | null
          cpf?: string | null
          birth_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          blocked?: boolean | null
          blocked_at?: string | null
          blocked_reason?: string | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          whatsapp_opt_in?: boolean | null
          whatsapp_opt_in_at?: string | null
          whatsapp_opt_in_source?: string | null
        }
        Relationships: []
      }
      affiliate_settings: {
        Row: {
          id: string
          default_commission_rate: number | null
          cookie_duration_days: number | null
          min_payout_amount: number | null
          auto_approve_affiliates: boolean | null
          payout_day: number | null
          support_email: string | null
          created_at: string | null
          updated_at: string | null
          release_delay_days: number
        }
        Insert: {
          id?: string
          default_commission_rate?: number | null
          cookie_duration_days?: number | null
          min_payout_amount?: number | null
          auto_approve_affiliates?: boolean | null
          payout_day?: number | null
          support_email?: string | null
          created_at?: string | null
          updated_at?: string | null
          release_delay_days?: number
        }
        Update: {
          id?: string | null
          default_commission_rate?: number | null
          cookie_duration_days?: number | null
          min_payout_amount?: number | null
          auto_approve_affiliates?: boolean | null
          payout_day?: number | null
          support_email?: string | null
          created_at?: string | null
          updated_at?: string | null
          release_delay_days?: number | null
        }
        Relationships: []
      }
      affiliate_tiers: {
        Row: {
          id: string
          name: string
          commission_rate: number
          min_sales_amount: number
          icon: string | null
          color: string | null
          benefits: string[] | null
          created_at: string | null
          is_active: boolean | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          name?: string
          commission_rate?: number
          min_sales_amount?: number
          icon?: string | null
          color?: string | null
          benefits?: string[] | null
          created_at?: string | null
          is_active?: boolean | null
          sort_order?: number | null
        }
        Update: {
          id?: string | null
          name?: string | null
          commission_rate?: number | null
          min_sales_amount?: number | null
          icon?: string | null
          color?: string | null
          benefits?: string[] | null
          created_at?: string | null
          is_active?: boolean | null
          sort_order?: number | null
        }
        Relationships: []
      }
      affiliate_links: {
        Row: {
          id: string
          affiliate_id: string
          code: string
          product_id: string | null
          product_name: string | null
          product_image: string | null
          product_price: number | null
          clicks: number | null
          conversions: number | null
          last_clicked_at: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          affiliate_id?: string
          code?: string
          product_id?: string | null
          product_name?: string | null
          product_image?: string | null
          product_price?: number | null
          clicks?: number | null
          conversions?: number | null
          last_clicked_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          affiliate_id?: string | null
          code?: string | null
          product_id?: string | null
          product_name?: string | null
          product_image?: string | null
          product_price?: number | null
          clicks?: number | null
          conversions?: number | null
          last_clicked_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      affiliate_tier_history: {
        Row: {
          id: string
          affiliate_id: string
          from_tier_id: string | null
          to_tier_id: string | null
          from_tier_name: string | null
          to_tier_name: string | null
          reason: string | null
          sales_amount: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          affiliate_id?: string
          from_tier_id?: string | null
          to_tier_id?: string | null
          from_tier_name?: string | null
          to_tier_name?: string | null
          reason?: string | null
          sales_amount?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          affiliate_id?: string | null
          from_tier_id?: string | null
          to_tier_id?: string | null
          from_tier_name?: string | null
          to_tier_name?: string | null
          reason?: string | null
          sales_amount?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      ai_image_jobs: {
        Row: {
          id: string
          status: string
          prompt: string
          product_id: string | null
          product_name: string | null
          product_brand: string | null
          product_description: string | null
          caption: string | null
          modo: string | null
          result_url: string | null
          error: string | null
          created_at: string
          updated_at: string
          quality: string
        }
        Insert: {
          id?: string
          status?: string
          prompt?: string
          product_id?: string | null
          product_name?: string | null
          product_brand?: string | null
          product_description?: string | null
          caption?: string | null
          modo?: string | null
          result_url?: string | null
          error?: string | null
          created_at?: string
          updated_at?: string
          quality?: string
        }
        Update: {
          id?: string | null
          status?: string | null
          prompt?: string | null
          product_id?: string | null
          product_name?: string | null
          product_brand?: string | null
          product_description?: string | null
          caption?: string | null
          modo?: string | null
          result_url?: string | null
          error?: string | null
          created_at?: string | null
          updated_at?: string | null
          quality?: string | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          user_id: string
          email: string | null
          created_at: string
          role: string
          is_active: boolean
        }
        Insert: {
          user_id?: string
          email?: string | null
          created_at?: string
          role?: string
          is_active?: boolean
        }
        Update: {
          user_id?: string | null
          email?: string | null
          created_at?: string | null
          role?: string | null
          is_active?: boolean | null
        }
        Relationships: []
      }
      product_image_suggestions: {
        Row: {
          id: string
          product_id: string
          image_url: string
          source: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id?: string
          image_url?: string
          source?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          product_id?: string | null
          image_url?: string | null
          source?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipping_quotes: {
        Row: {
          id: string
          order_id: string | null
          order_number: number | null
          carrier: string
          service: string
          service_code: string
          price: number
          final_price: number
          discount: number | null
          estimated_days: number | null
          weight_grams: number | null
          height_cm: number | null
          width_cm: number | null
          length_cm: number | null
          recipient_name: string | null
          recipient_phone: string | null
          recipient_email: string | null
          recipient_postal_code: string | null
          recipient_address: Json | null
          status: string
          tracking_code: string | null
          tracking_url: string | null
          shipped_at: string | null
          delivered_at: string | null
          label_url: string | null
          label_pdf_url: string | null
          shipment_id_external: string | null
          created_at: string
          updated_at: string
          label_printed_at: string | null
          declaration_printed_at: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          order_number?: number | null
          carrier?: string
          service?: string
          service_code?: string
          price?: number
          final_price?: number
          discount?: number | null
          estimated_days?: number | null
          weight_grams?: number | null
          height_cm?: number | null
          width_cm?: number | null
          length_cm?: number | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_email?: string | null
          recipient_postal_code?: string | null
          recipient_address?: Json | null
          status?: string
          tracking_code?: string | null
          tracking_url?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          label_url?: string | null
          label_pdf_url?: string | null
          shipment_id_external?: string | null
          created_at?: string
          updated_at?: string
          label_printed_at?: string | null
          declaration_printed_at?: string | null
        }
        Update: {
          id?: string | null
          order_id?: string | null
          order_number?: number | null
          carrier?: string | null
          service?: string | null
          service_code?: string | null
          price?: number | null
          final_price?: number | null
          discount?: number | null
          estimated_days?: number | null
          weight_grams?: number | null
          height_cm?: number | null
          width_cm?: number | null
          length_cm?: number | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_email?: string | null
          recipient_postal_code?: string | null
          recipient_address?: Json | null
          status?: string | null
          tracking_code?: string | null
          tracking_url?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          label_url?: string | null
          label_pdf_url?: string | null
          shipment_id_external?: string | null
          created_at?: string | null
          updated_at?: string | null
          label_printed_at?: string | null
          declaration_printed_at?: string | null
        }
        Relationships: []
      }
      zernio_accounts: {
        Row: {
          id: number
          platform: string
          account_id: string
          label: string
          phone_number: string | null
          mode: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          platform?: string
          account_id?: string
          label?: string
          phone_number?: string | null
          mode?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number | null
          platform?: string | null
          account_id?: string | null
          label?: string | null
          phone_number?: string | null
          mode?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          brand: string | null
          brand_slug: string | null
          price: number
          original_price: number | null
          description: string | null
          category: string | null
          category_slug: string | null
          subcategory: string | null
          images: string[]
          tags: string[]
          in_stock: boolean
          quantity: number
          sku: string | null
          featured: boolean
          is_new: boolean
          is_active: boolean
          slug: string | null
          external_ids: Json
          created_at: string
          updated_at: string
          weight_grams: number | null
          height_cm: number | null
          width_cm: number | null
          length_cm: number | null
          ncm: string | null
          ean_barcode: string | null
          variations: Json
          cost: number | null
          pricing_mode: string
          target_margin: number | null
          cfop: string | null
          cst_icms: string | null
          csosn: string | null
          origem: number | null
          cst_pis_cofins: string | null
          aliquota_icms: number | null
          aliquota_pis: number | null
          aliquota_cofins: number | null
          unidade: string | null
          cest: string | null
          cst_ibscbs: string | null
          cclasstrib: string | null
          aliquota_ibs_estadual: number | null
          aliquota_ibs_municipal: number | null
          aliquota_cbs: number | null
          codigo_beneficio_fiscal: string | null
        }
        Insert: {
          id?: string
          name?: string
          brand?: string | null
          brand_slug?: string | null
          price?: number
          original_price?: number | null
          description?: string | null
          category?: string | null
          category_slug?: string | null
          subcategory?: string | null
          images?: string[]
          tags?: string[]
          in_stock?: boolean
          quantity?: number
          sku?: string | null
          featured?: boolean
          is_new?: boolean
          is_active?: boolean
          slug?: string | null
          external_ids?: Json
          created_at?: string
          updated_at?: string
          weight_grams?: number | null
          height_cm?: number | null
          width_cm?: number | null
          length_cm?: number | null
          ncm?: string | null
          ean_barcode?: string | null
          variations?: Json
          cost?: number | null
          pricing_mode?: string
          target_margin?: number | null
          cfop?: string | null
          cst_icms?: string | null
          csosn?: string | null
          origem?: number | null
          cst_pis_cofins?: string | null
          aliquota_icms?: number | null
          aliquota_pis?: number | null
          aliquota_cofins?: number | null
          unidade?: string | null
          cest?: string | null
          cst_ibscbs?: string | null
          cclasstrib?: string | null
          aliquota_ibs_estadual?: number | null
          aliquota_ibs_municipal?: number | null
          aliquota_cbs?: number | null
          codigo_beneficio_fiscal?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          brand?: string | null
          brand_slug?: string | null
          price?: number | null
          original_price?: number | null
          description?: string | null
          category?: string | null
          category_slug?: string | null
          subcategory?: string | null
          images?: string[] | null
          tags?: string[] | null
          in_stock?: boolean | null
          quantity?: number | null
          sku?: string | null
          featured?: boolean | null
          is_new?: boolean | null
          is_active?: boolean | null
          slug?: string | null
          external_ids?: Json | null
          created_at?: string | null
          updated_at?: string | null
          weight_grams?: number | null
          height_cm?: number | null
          width_cm?: number | null
          length_cm?: number | null
          ncm?: string | null
          ean_barcode?: string | null
          variations?: Json | null
          cost?: number | null
          pricing_mode?: string | null
          target_margin?: number | null
          cfop?: string | null
          cst_icms?: string | null
          csosn?: string | null
          origem?: number | null
          cst_pis_cofins?: string | null
          aliquota_icms?: number | null
          aliquota_pis?: number | null
          aliquota_cofins?: number | null
          unidade?: string | null
          cest?: string | null
          cst_ibscbs?: string | null
          cclasstrib?: string | null
          aliquota_ibs_estadual?: number | null
          aliquota_ibs_municipal?: number | null
          aliquota_cbs?: number | null
          codigo_beneficio_fiscal?: string | null
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          id: string
          customer_id: string
          admin_email: string | null
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_id?: string
          admin_email?: string | null
          note?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          customer_id?: string | null
          admin_email?: string | null
          note?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          product_id?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          user_id?: string | null
          product_id?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      affiliate_payouts: {
        Row: {
          id: string
          affiliate_id: string
          amount: number
          period_start: string | null
          period_end: string | null
          status: string | null
          pix_key: string | null
          pix_key_type: string | null
          transaction_id: string | null
          notes: string | null
          created_at: string | null
          paid_at: string | null
        }
        Insert: {
          id?: string
          affiliate_id?: string
          amount?: number
          period_start?: string | null
          period_end?: string | null
          status?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          transaction_id?: string | null
          notes?: string | null
          created_at?: string | null
          paid_at?: string | null
        }
        Update: {
          id?: string | null
          affiliate_id?: string | null
          amount?: number | null
          period_start?: string | null
          period_end?: string | null
          status?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          transaction_id?: string | null
          notes?: string | null
          created_at?: string | null
          paid_at?: string | null
        }
        Relationships: []
      }
      nfe_settings: {
        Row: {
          id: string
          cnpj: string
          inscricao_estadual: string
          inscricao_municipal: string | null
          razao_social: string
          nome_fantasia: string | null
          endereco: Json
          ambiente_sefaz: string
          estado_uf: string
          certificado_path: string | null
          certificado_senha: string | null
          webservice_url: string | null
          nfe_last_number: number | null
          created_at: string | null
          updated_at: string | null
          nfe_serie: number | null
          crt: number | null
          ncm_padrao: string | null
          cfop_padrao: string | null
          cst_icms_padrao: string | null
          csosn_padrao: string | null
          origem_padrao: number | null
          cst_pis_cofins_padrao: string | null
          icms_aliquota: number | null
          pis_aliquota: number | null
          cofins_aliquota: number | null
          unidade_padrao: string | null
          cest_padrao: string | null
          modalidade_frete: number | null
          cst_ibscbs_padrao: string | null
          cclasstrib_padrao: string | null
          aliquota_ibs_estadual: number | null
          aliquota_ibs_municipal: number | null
          aliquota_cbs: number | null
          codigo_beneficio_fiscal_padrao: string | null
        }
        Insert: {
          id?: string
          cnpj?: string
          inscricao_estadual?: string
          inscricao_municipal?: string | null
          razao_social?: string
          nome_fantasia?: string | null
          endereco?: Json
          ambiente_sefaz?: string
          estado_uf?: string
          certificado_path?: string | null
          certificado_senha?: string | null
          webservice_url?: string | null
          nfe_last_number?: number | null
          created_at?: string | null
          updated_at?: string | null
          nfe_serie?: number | null
          crt?: number | null
          ncm_padrao?: string | null
          cfop_padrao?: string | null
          cst_icms_padrao?: string | null
          csosn_padrao?: string | null
          origem_padrao?: number | null
          cst_pis_cofins_padrao?: string | null
          icms_aliquota?: number | null
          pis_aliquota?: number | null
          cofins_aliquota?: number | null
          unidade_padrao?: string | null
          cest_padrao?: string | null
          modalidade_frete?: number | null
          cst_ibscbs_padrao?: string | null
          cclasstrib_padrao?: string | null
          aliquota_ibs_estadual?: number | null
          aliquota_ibs_municipal?: number | null
          aliquota_cbs?: number | null
          codigo_beneficio_fiscal_padrao?: string | null
        }
        Update: {
          id?: string | null
          cnpj?: string | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          razao_social?: string | null
          nome_fantasia?: string | null
          endereco?: Json | null
          ambiente_sefaz?: string | null
          estado_uf?: string | null
          certificado_path?: string | null
          certificado_senha?: string | null
          webservice_url?: string | null
          nfe_last_number?: number | null
          created_at?: string | null
          updated_at?: string | null
          nfe_serie?: number | null
          crt?: number | null
          ncm_padrao?: string | null
          cfop_padrao?: string | null
          cst_icms_padrao?: string | null
          csosn_padrao?: string | null
          origem_padrao?: number | null
          cst_pis_cofins_padrao?: string | null
          icms_aliquota?: number | null
          pis_aliquota?: number | null
          cofins_aliquota?: number | null
          unidade_padrao?: string | null
          cest_padrao?: string | null
          modalidade_frete?: number | null
          cst_ibscbs_padrao?: string | null
          cclasstrib_padrao?: string | null
          aliquota_ibs_estadual?: number | null
          aliquota_ibs_municipal?: number | null
          aliquota_cbs?: number | null
          codigo_beneficio_fiscal_padrao?: string | null
        }
        Relationships: []
      }
      store_credits: {
        Row: {
          id: string
          user_id: string
          amount: number
          balance: number
          origin: string
          return_request_id: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          amount?: number
          balance?: number
          origin?: string
          return_request_id?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          user_id?: string | null
          amount?: number | null
          balance?: number | null
          origin?: string | null
          return_request_id?: string | null
          expires_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_ratings: {
        Row: {
          product_id: string | null
          avg_rating: number | null
          review_count: number | null
        }
        Insert: {
          product_id?: string | null
          avg_rating?: number | null
          review_count?: number | null
        }
        Update: {
          product_id?: string | null
          avg_rating?: number | null
          review_count?: number | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          id: string
          code: string
          description: string | null
          discount_type: string
          discount_value: number
          minimum_order_value: number | null
          maximum_discount: number | null
          usage_limit: number | null
          usage_count: number
          usage_limit_per_customer: number
          applies_to_products: string[] | null
          applies_to_categories: string[] | null
          applies_to_brands: string[] | null
          excluded_products: string[] | null
          customer_ids: string[] | null
          first_purchase_only: boolean
          starts_at: string
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          minimum_order_value?: number | null
          maximum_discount?: number | null
          usage_limit?: number | null
          usage_count?: number
          usage_limit_per_customer?: number
          applies_to_products?: string[] | null
          applies_to_categories?: string[] | null
          applies_to_brands?: string[] | null
          excluded_products?: string[] | null
          customer_ids?: string[] | null
          first_purchase_only?: boolean
          starts_at?: string
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          code?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          minimum_order_value?: number | null
          maximum_discount?: number | null
          usage_limit?: number | null
          usage_count?: number | null
          usage_limit_per_customer?: number | null
          applies_to_products?: string[] | null
          applies_to_categories?: string[] | null
          applies_to_brands?: string[] | null
          excluded_products?: string[] | null
          customer_ids?: string[] | null
          first_purchase_only?: boolean | null
          starts_at?: string | null
          expires_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipping_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string | null
          key?: string | null
          value?: Json | null
          description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipping_tags_stats: {
        Row: {
          status: string | null
          service: string | null
          count: number | null
        }
        Insert: {
          status?: string | null
          service?: string | null
          count?: number | null
        }
        Update: {
          status?: string | null
          service?: string | null
          count?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          wa_message_id: string | null
          content: string | null
          sender: string
          message_type: string
          read: boolean
          created_at: string
          zernio_message_id: string | null
        }
        Insert: {
          id?: string
          conversation_id?: string
          wa_message_id?: string | null
          content?: string | null
          sender?: string
          message_type?: string
          read?: boolean
          created_at?: string
          zernio_message_id?: string | null
        }
        Update: {
          id?: string | null
          conversation_id?: string | null
          wa_message_id?: string | null
          content?: string | null
          sender?: string | null
          message_type?: string | null
          read?: boolean | null
          created_at?: string | null
          zernio_message_id?: string | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          id: string
          user_id: string
          label: string | null
          recipient_name: string
          cep: string
          street: string
          number: string
          complement: string | null
          neighborhood: string
          city: string
          state: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          label?: string | null
          recipient_name?: string
          cep?: string
          street?: string
          number?: string
          complement?: string | null
          neighborhood?: string
          city?: string
          state?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          user_id?: string | null
          label?: string | null
          recipient_name?: string | null
          cep?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_action_logs: {
        Row: {
          id: number
          user_id: string
          action: string
          entity_type: string
          entity_id: string | null
          before_data: Json | null
          after_data: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          before_data?: Json | null
          after_data?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: number | null
          user_id?: string | null
          action?: string | null
          entity_type?: string | null
          entity_id?: string | null
          before_data?: Json | null
          after_data?: Json | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      affiliate_sales: {
        Row: {
          id: string
          affiliate_id: string
          link_id: string | null
          shopify_order_id: string | null
          order_number: string | null
          order_total: number
          commission_rate: number
          commission_amount: number
          status: string | null
          payout_id: string | null
          created_at: string | null
          confirmed_at: string | null
          paid_at: string | null
          order_id: string | null
          commission_base: number | null
        }
        Insert: {
          id?: string
          affiliate_id?: string
          link_id?: string | null
          shopify_order_id?: string | null
          order_number?: string | null
          order_total?: number
          commission_rate?: number
          commission_amount?: number
          status?: string | null
          payout_id?: string | null
          created_at?: string | null
          confirmed_at?: string | null
          paid_at?: string | null
          order_id?: string | null
          commission_base?: number | null
        }
        Update: {
          id?: string | null
          affiliate_id?: string | null
          link_id?: string | null
          shopify_order_id?: string | null
          order_number?: string | null
          order_total?: number | null
          commission_rate?: number | null
          commission_amount?: number | null
          status?: string | null
          payout_id?: string | null
          created_at?: string | null
          confirmed_at?: string | null
          paid_at?: string | null
          order_id?: string | null
          commission_base?: number | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          id: string
          profile_id: string | null
          social_account_id: string | null
          platform: string
          content: string
          image_url: string | null
          zernio_post_id: string | null
          status: string
          scheduled_for: string | null
          published_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          social_account_id?: string | null
          platform?: string
          content?: string
          image_url?: string | null
          zernio_post_id?: string | null
          status?: string
          scheduled_for?: string | null
          published_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          profile_id?: string | null
          social_account_id?: string | null
          platform?: string | null
          content?: string | null
          image_url?: string | null
          zernio_post_id?: string | null
          status?: string | null
          scheduled_for?: string | null
          published_at?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_notifications: {
        Row: {
          id: string
          affiliate_id: string
          type: string
          title: string
          message: string | null
          is_read: boolean | null
          read_at: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          affiliate_id?: string
          type?: string
          title?: string
          message?: string | null
          is_read?: boolean | null
          read_at?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          affiliate_id?: string | null
          type?: string | null
          title?: string | null
          message?: string | null
          is_read?: boolean | null
          read_at?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          image: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          image?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          name?: string | null
          slug?: string | null
          description?: string | null
          image?: string | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          id: string
          order_id: string
          user_id: string
          reason: string
          resolution: string
          items: Json
          description: string | null
          status: string
          reverse_tracking_code: string | null
          reverse_label_url: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id?: string
          user_id?: string
          reason?: string
          resolution?: string
          items?: Json
          description?: string | null
          status?: string
          reverse_tracking_code?: string | null
          reverse_label_url?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          order_id?: string | null
          user_id?: string | null
          reason?: string | null
          resolution?: string | null
          items?: Json | null
          description?: string | null
          status?: string | null
          reverse_tracking_code?: string | null
          reverse_label_url?: string | null
          admin_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          id: string
          user_id: string | null
          full_name: string
          email: string
          phone: string | null
          cpf: string | null
          instagram: string | null
          youtube: string | null
          tiktok: string | null
          website: string | null
          pix_key: string | null
          pix_key_type: string | null
          affiliate_code: string
          current_tier_id: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
          approved_at: string | null
          accepted_terms: boolean | null
          accepted_terms_at: string | null
          address_street: string | null
          address_number: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_city: string | null
          address_state: string | null
          address_zip: string | null
          birth_date: string | null
          custom_commission_rate: number | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name?: string
          email?: string
          phone?: string | null
          cpf?: string | null
          instagram?: string | null
          youtube?: string | null
          tiktok?: string | null
          website?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          affiliate_code?: string
          current_tier_id?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          approved_at?: string | null
          accepted_terms?: boolean | null
          accepted_terms_at?: string | null
          address_street?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          birth_date?: string | null
          custom_commission_rate?: number | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          full_name?: string | null
          email?: string | null
          phone?: string | null
          cpf?: string | null
          instagram?: string | null
          youtube?: string | null
          tiktok?: string | null
          website?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          affiliate_code?: string | null
          current_tier_id?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          approved_at?: string | null
          accepted_terms?: boolean | null
          accepted_terms_at?: string | null
          address_street?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          birth_date?: string | null
          custom_commission_rate?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          link: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          link?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string | null
          user_id?: string | null
          type?: string | null
          title?: string | null
          message?: string | null
          link?: string | null
          read?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          channel: string
          customer_name: string | null
          customer_phone: string | null
          status: string
          priority: string
          tags: string[]
          last_message: string | null
          last_message_at: string | null
          unread: boolean
          created_at: string
          updated_at: string
          session_id: string | null
          replied_by: string
          zernio_conversation_id: string | null
          zernio_account_id: string | null
        }
        Insert: {
          id?: string
          channel?: string
          customer_name?: string | null
          customer_phone?: string | null
          status?: string
          priority?: string
          tags?: string[]
          last_message?: string | null
          last_message_at?: string | null
          unread?: boolean
          created_at?: string
          updated_at?: string
          session_id?: string | null
          replied_by?: string
          zernio_conversation_id?: string | null
          zernio_account_id?: string | null
        }
        Update: {
          id?: string | null
          channel?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          status?: string | null
          priority?: string | null
          tags?: string[] | null
          last_message?: string | null
          last_message_at?: string | null
          unread?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          session_id?: string | null
          replied_by?: string | null
          zernio_conversation_id?: string | null
          zernio_account_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_coupon_usage: { Args: {"p_code":"string"}; Returns: void }
      search_products_pt: { Args: {"query_text":"string","limit_rows":"number"}; Returns: { id: string; name: string; brand_slug: string; category_slug: string; price: number; stock_quantity: number; images: string[]; is_buyable: boolean; rank: number }[] }
      close_affiliate_payout: { Args: {"p_affiliate_id":"string","p_cutoff":"string","p_min_amount":"number","p_notes":"string"}; Returns: { out_payout_id: string; out_sales_count: number; out_amount: number; out_period_start: string; out_period_end: string; out_skipped_reason: string | null }[] }
      sync_orders_to_auth_user: { Args: {}; Returns: void }
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
    ? DefaultSchema["Tables"][TableName] extends {
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
    ? DefaultSchema["Tables"][TableName] extends {
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
> = DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  PublicCompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  // @ts-expect-error template Supabase: nunca indexado se CompositeTypes for {}
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeName]
  : never
