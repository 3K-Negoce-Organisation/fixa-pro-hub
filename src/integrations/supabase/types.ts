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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      blog_categories: {
        Row: {
          id: string
          site_id: string
          slug: string
          name: string
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          slug: string
          name: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          slug?: string
          name?: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          id: string
          site_id: string
          slug: string
          title: string
          excerpt: string | null
          content: string
          cover_image_url: string | null
          cover_image_pinterest_url: string | null
          author_name: string
          category_id: string | null
          audience: string
          meta_title: string | null
          meta_description: string | null
          cta_type: string
          cta_label: string | null
          cta_url: string | null
          is_published: boolean
          published_at: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          slug: string
          title: string
          excerpt?: string | null
          content?: string
          cover_image_url?: string | null
          cover_image_pinterest_url?: string | null
          author_name?: string
          category_id?: string | null
          audience?: string
          meta_title?: string | null
          meta_description?: string | null
          cta_type?: string
          cta_label?: string | null
          cta_url?: string | null
          is_published?: boolean
          published_at?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          slug?: string
          title?: string
          excerpt?: string | null
          content?: string
          cover_image_url?: string | null
          cover_image_pinterest_url?: string | null
          author_name?: string
          category_id?: string | null
          audience?: string
          meta_title?: string | null
          meta_description?: string | null
          cta_type?: string
          cta_label?: string | null
          cta_url?: string | null
          is_published?: boolean
          published_at?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_themes: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          site_id: string
          theme_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          site_id: string
          theme_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          site_id?: string
          theme_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_themes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          box_quantity: number | null
          code_alsafix: string | null
          created_at: string
          designation_fr: string | null
          id: string
          order_id: string
          product_description: string | null
          product_handle: string | null
          product_id: string
          product_image: string | null
          product_title: string
          quantity: number
          snapshot_purchase_price_ht: number | null
          snapshot_unite_de_vente: number | null
          unit_price_ht: number
          unit_price_ttc: number
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          box_quantity?: number | null
          code_alsafix?: string | null
          created_at?: string
          designation_fr?: string | null
          id?: string
          order_id: string
          product_description?: string | null
          product_handle?: string | null
          product_id: string
          product_image?: string | null
          product_title: string
          quantity: number
          snapshot_purchase_price_ht?: number | null
          snapshot_unite_de_vente?: number | null
          unit_price_ht: number
          unit_price_ttc: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          box_quantity?: number | null
          code_alsafix?: string | null
          created_at?: string
          designation_fr?: string | null
          id?: string
          order_id?: string
          product_description?: string | null
          product_handle?: string | null
          product_id?: string
          product_image?: string | null
          product_title?: string
          quantity?: number
          snapshot_purchase_price_ht?: number | null
          snapshot_unite_de_vente?: number | null
          unit_price_ht?: number
          unit_price_ttc?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          carrier: string | null
          created_at: string
          documents: Json | null
          id: string
          is_archived: boolean
          notes: string | null
          order_number: string
          shipping_address: string | null
          shipping_city: string | null
          shipping_name: string | null
          shipping_postal_code: string | null
          shopify_order_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_ht: number
          total_ttc: number
          tracking_number: string | null
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          documents?: Json | null
          id?: string
          is_archived?: boolean
          notes?: string | null
          order_number: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          shopify_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_ht: number
          total_ttc: number
          tracking_number?: string | null
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          documents?: Json | null
          id?: string
          is_archived?: boolean
          notes?: string | null
          order_number?: string
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          shopify_order_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_ht?: number
          total_ttc?: number
          tracking_number?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          box_quantity: number | null
          box_weight: number | null
          category: string | null
          code_alsafix: string | null
          created_at: string | null
          description: string | null
          designation_fr: string | null
          diameter_mm: number | null
          drive_type: string | null
          handle: string
          head_diameter_mm: number | null
          id: string
          images: Json | null
          is_active: boolean | null
          is_promo: boolean | null
          length_mm: number | null
          material: string | null
          price_ht: number
          price_ttc: number
          promo_discount_percent: number | null
          promo_end_date: string | null
          promo_gift_product_id: string | null
          promo_gift_quantity: number | null
          promo_label: string | null
          promo_price_ht: number | null
          purchase_price_ht: number | null
          unite_de_vente: number
          site_id: string | null
          specifications: Json | null
          stock: number | null
          tags: string[] | null
          thickness_to_fix_mm: number | null
          thread_length_mm: number | null
          title: string
          updated_at: string | null
          usage: string | null
          variants: Json | null
        }
        Insert: {
          box_quantity?: number | null
          box_weight?: number | null
          category?: string | null
          code_alsafix?: string | null
          created_at?: string | null
          description?: string | null
          designation_fr?: string | null
          diameter_mm?: number | null
          drive_type?: string | null
          handle: string
          head_diameter_mm?: number | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_promo?: boolean | null
          length_mm?: number | null
          material?: string | null
          price_ht: number
          price_ttc: number
          promo_discount_percent?: number | null
          promo_end_date?: string | null
          promo_gift_product_id?: string | null
          promo_gift_quantity?: number | null
          promo_label?: string | null
          promo_price_ht?: number | null
          purchase_price_ht?: number | null
          unite_de_vente?: number
          site_id?: string | null
          specifications?: Json | null
          stock?: number | null
          tags?: string[] | null
          thickness_to_fix_mm?: number | null
          thread_length_mm?: number | null
          title: string
          updated_at?: string | null
          usage?: string | null
          variants?: Json | null
        }
        Update: {
          box_quantity?: number | null
          box_weight?: number | null
          category?: string | null
          code_alsafix?: string | null
          created_at?: string | null
          description?: string | null
          designation_fr?: string | null
          diameter_mm?: number | null
          drive_type?: string | null
          handle?: string
          head_diameter_mm?: number | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_promo?: boolean | null
          length_mm?: number | null
          material?: string | null
          price_ht?: number
          price_ttc?: number
          promo_discount_percent?: number | null
          promo_end_date?: string | null
          promo_gift_product_id?: string | null
          promo_gift_quantity?: number | null
          promo_label?: string | null
          promo_price_ht?: number | null
          purchase_price_ht?: number | null
          unite_de_vente?: number
          site_id?: string | null
          specifications?: Json | null
          stock?: number | null
          tags?: string[] | null
          thickness_to_fix_mm?: number | null
          thread_length_mm?: number | null
          title?: string
          updated_at?: string | null
          usage?: string | null
          variants?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_postal_code: string | null
          company_name: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          marketing_consent: boolean | null
          marketing_consent_date: string | null
          newsletter_consent: boolean | null
          newsletter_consent_date: string | null
          phone: string | null
          same_as_billing: boolean | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_postal_code: string | null
          siret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_postal_code?: string | null
          company_name?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          marketing_consent?: boolean | null
          marketing_consent_date?: string | null
          newsletter_consent?: boolean | null
          newsletter_consent_date?: string | null
          phone?: string | null
          same_as_billing?: boolean | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_postal_code?: string | null
          siret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_postal_code?: string | null
          company_name?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          marketing_consent?: boolean | null
          marketing_consent_date?: string | null
          newsletter_consent?: boolean | null
          newsletter_consent_date?: string | null
          phone?: string | null
          same_as_billing?: boolean | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_postal_code?: string | null
          siret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_assets: {
        Row: {
          created_at: string
          id: string
          is_selected: boolean | null
          name: string
          site_id: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_selected?: boolean | null
          name: string
          site_id: string
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_selected?: boolean | null
          name?: string
          site_id?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_themes: {
        Row: {
          accent_color: string | null
          background_color: string | null
          border_color: string | null
          border_radius: string | null
          border_width: string | null
          button_primary_bg: string | null
          button_primary_text: string | null
          button_secondary_bg: string | null
          button_secondary_text: string | null
          card_bg: string | null
          card_border: string | null
          card_shadow: string | null
          card_text: string | null
          created_at: string
          custom_css: string | null
          error_color: string | null
          favicon_url: string | null
          focus_ring_color: string | null
          font_family: string | null
          footer_bg: string | null
          footer_border: string | null
          footer_link: string | null
          footer_link_hover: string | null
          footer_text: string | null
          header_bg: string | null
          header_border: string | null
          header_link: string | null
          header_link_hover: string | null
          header_text: string | null
          heading_font: string | null
          id: string
          info_color: string | null
          input_bg: string | null
          input_border: string | null
          input_focus_border: string | null
          input_placeholder: string | null
          input_text: string | null
          is_active: boolean | null
          link_color: string | null
          link_hover_color: string | null
          logo_url: string | null
          muted_color: string | null
          name: string | null
          nav_active_bg: string | null
          nav_active_text: string | null
          nav_bg: string | null
          nav_hover_bg: string | null
          nav_hover_text: string | null
          nav_text: string | null
          primary_color: string | null
          secondary_color: string | null
          shadow_lg: string | null
          shadow_md: string | null
          shadow_sm: string | null
          site_id: string | null
          success_color: string | null
          text_color: string | null
          updated_at: string
          warning_color: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          border_color?: string | null
          border_radius?: string | null
          border_width?: string | null
          button_primary_bg?: string | null
          button_primary_text?: string | null
          button_secondary_bg?: string | null
          button_secondary_text?: string | null
          card_bg?: string | null
          card_border?: string | null
          card_shadow?: string | null
          card_text?: string | null
          created_at?: string
          custom_css?: string | null
          error_color?: string | null
          favicon_url?: string | null
          focus_ring_color?: string | null
          font_family?: string | null
          footer_bg?: string | null
          footer_border?: string | null
          footer_link?: string | null
          footer_link_hover?: string | null
          footer_text?: string | null
          header_bg?: string | null
          header_border?: string | null
          header_link?: string | null
          header_link_hover?: string | null
          header_text?: string | null
          heading_font?: string | null
          id?: string
          info_color?: string | null
          input_bg?: string | null
          input_border?: string | null
          input_focus_border?: string | null
          input_placeholder?: string | null
          input_text?: string | null
          is_active?: boolean | null
          link_color?: string | null
          link_hover_color?: string | null
          logo_url?: string | null
          muted_color?: string | null
          name?: string | null
          nav_active_bg?: string | null
          nav_active_text?: string | null
          nav_bg?: string | null
          nav_hover_bg?: string | null
          nav_hover_text?: string | null
          nav_text?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          shadow_lg?: string | null
          shadow_md?: string | null
          shadow_sm?: string | null
          site_id?: string | null
          success_color?: string | null
          text_color?: string | null
          updated_at?: string
          warning_color?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          border_color?: string | null
          border_radius?: string | null
          border_width?: string | null
          button_primary_bg?: string | null
          button_primary_text?: string | null
          button_secondary_bg?: string | null
          button_secondary_text?: string | null
          card_bg?: string | null
          card_border?: string | null
          card_shadow?: string | null
          card_text?: string | null
          created_at?: string
          custom_css?: string | null
          error_color?: string | null
          favicon_url?: string | null
          focus_ring_color?: string | null
          font_family?: string | null
          footer_bg?: string | null
          footer_border?: string | null
          footer_link?: string | null
          footer_link_hover?: string | null
          footer_text?: string | null
          header_bg?: string | null
          header_border?: string | null
          header_link?: string | null
          header_link_hover?: string | null
          header_text?: string | null
          heading_font?: string | null
          id?: string
          info_color?: string | null
          input_bg?: string | null
          input_border?: string | null
          input_focus_border?: string | null
          input_placeholder?: string | null
          input_text?: string | null
          is_active?: boolean | null
          link_color?: string | null
          link_hover_color?: string | null
          logo_url?: string | null
          muted_color?: string | null
          name?: string | null
          nav_active_bg?: string | null
          nav_active_text?: string | null
          nav_bg?: string | null
          nav_hover_bg?: string | null
          nav_hover_text?: string | null
          nav_text?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          shadow_lg?: string | null
          shadow_md?: string | null
          shadow_sm?: string | null
          site_id?: string | null
          success_color?: string | null
          text_color?: string | null
          updated_at?: string
          warning_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_themes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          slug: string
          storefront_public: boolean
          stripe_mode: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          storefront_public?: boolean
          stripe_mode?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          storefront_public?: boolean
          stripe_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_settings: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          customer_number: string | null
          email: string
          id: string
          name: string
          phone: string | null
          postal_code: string | null
          status_email: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          customer_number?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          postal_code?: string | null
          status_email?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          customer_number?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          postal_code?: string | null
          status_email?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_carts: {
        Row: {
          created_at: string
          id: string
          items: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "pending"
        | "paid"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
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
    Enums: {
      app_role: ["admin", "user"],
      order_status: [
        "pending",
        "paid",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
