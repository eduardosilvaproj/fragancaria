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
      admins: {
        Row: {
          user_id: string
          email: string | null
          created_at: string
        }
        Insert: {
          user_id?: string
          email?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string | null
          email?: string | null
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
          user_id: string | null
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
          user_id?: string | null
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
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
