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
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_image: string | null
          product_title: string
          quantity: number
          unit_price_ht: number
          unit_price_ttc: number
          variant_title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_image?: string | null
          product_title: string
          quantity: number
          unit_price_ht: number
          unit_price_ttc: number
          variant_title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_image?: string | null
          product_title?: string
          quantity?: number
          unit_price_ht?: number
          unit_price_ttc?: number
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
          promo_end_date: string | null
          promo_price_ht: number | null
          purchase_price_ht: number | null
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
          promo_end_date?: string | null
          promo_price_ht?: number | null
          purchase_price_ht?: number | null
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
          promo_end_date?: string | null
          promo_price_ht?: number | null
          purchase_price_ht?: number | null
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
          id: string
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
          id?: string
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
          id?: string
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
