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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      books: {
        Row: {
          author: string | null
          condition: string
          created_at: string
          genre: string | null
          house_rules: string[] | null
          id: string
          lender_notes: string | null
          lent_out: boolean | null
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          condition?: string
          created_at?: string
          genre?: string | null
          house_rules?: string[] | null
          id?: string
          lender_notes?: string | null
          lent_out?: boolean | null
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          condition?: string
          created_at?: string
          genre?: string | null
          house_rules?: string[] | null
          id?: string
          lender_notes?: string | null
          lent_out?: boolean | null
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_neighbors: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          federation_key: string
          id: string
          join_url: string
          name: string
          search_endpoint: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          federation_key: string
          id?: string
          join_url: string
          name: string
          search_endpoint: string
          slug: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          federation_key?: string
          id?: string
          join_url?: string
          name?: string
          search_endpoint?: string
          slug?: string
        }
        Relationships: []
      }
      community_steward_requests: {
        Row: {
          co_stewards: Json | null
          created_at: string
          email: string
          id: string
          name: string
          questions: string | null
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          co_stewards?: Json | null
          created_at?: string
          email: string
          id?: string
          name: string
          questions?: string | null
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          co_stewards?: Json | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          questions?: string | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          connection_context: string | null
          cross_streets: string | null
          email: string
          id: string
          intro: string | null
          name: string
          phone_number: string | null
          referral_source: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["join_request_status"]
          user_id: string | null
          voucher_id: string | null
        }
        Insert: {
          connection_context?: string | null
          cross_streets?: string | null
          email: string
          id?: string
          intro?: string | null
          name: string
          phone_number?: string | null
          referral_source?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["join_request_status"]
          user_id?: string | null
          voucher_id?: string | null
        }
        Update: {
          connection_context?: string | null
          cross_streets?: string | null
          email?: string
          id?: string
          intro?: string | null
          name?: string
          phone_number?: string | null
          referral_source?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["join_request_status"]
          user_id?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          intro_text: string | null
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          vouched_at: string | null
          vouched_by: string | null
          zip_code: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          intro_text?: string | null
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          vouched_at?: string | null
          vouched_by?: string | null
          zip_code?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          intro_text?: string | null
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          vouched_at?: string | null
          vouched_by?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_vouched_by_fkey"
            columns: ["vouched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      supplies: {
        Row: {
          category: string
          condition: string
          contact_email: string | null
          created_at: string
          cross_streets: string | null
          date_available: string | null
          description: string
          house_rules: string[] | null
          id: string
          illustration_url: string | null
          image_url: string | null
          images: string[] | null
          lender_notes: string | null
          lent_out: boolean | null
          location: string | null
          name: string
          neighborhood: string | null
          owner_id: string
          party_types: string[] | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          category: string
          condition: string
          contact_email?: string | null
          created_at?: string
          cross_streets?: string | null
          date_available?: string | null
          description: string
          house_rules?: string[] | null
          id?: string
          illustration_url?: string | null
          image_url?: string | null
          images?: string[] | null
          lender_notes?: string | null
          lent_out?: boolean | null
          location?: string | null
          name: string
          neighborhood?: string | null
          owner_id: string
          party_types?: string[] | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          category?: string
          condition?: string
          contact_email?: string | null
          created_at?: string
          cross_streets?: string | null
          date_available?: string | null
          description?: string
          house_rules?: string[] | null
          id?: string
          illustration_url?: string | null
          image_url?: string | null
          images?: string[] | null
          lender_notes?: string | null
          lent_out?: boolean | null
          location?: string | null
          name?: string
          neighborhood?: string | null
          owner_id?: string
          party_types?: string[] | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_requests: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_contact: string
          sender_name: string
          status: string
          supply_id: string
          supply_name: string
          supply_owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_contact: string
          sender_name: string
          status?: string
          supply_id: string
          supply_name: string
          supply_owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_contact?: string
          sender_name?: string
          status?: string
          supply_id?: string
          supply_name?: string
          supply_owner_id?: string
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      check_join_request_rate_limit: {
        Args: { request_email: string }
        Returns: boolean
      }
      get_books_with_owners: {
        Args: never
        Returns: {
          author: string
          condition: string
          created_at: string
          genre: string
          house_rules: string[]
          id: string
          lender_notes: string
          lent_out: boolean
          owner_email: string
          owner_id: string
          owner_name: string
          title: string
          updated_at: string
        }[]
      }
      get_public_illustrations: {
        Args: never
        Returns: {
          illustration_url: string
        }[]
      }
      get_public_profile: {
        Args: { profile_id: string }
        Returns: {
          id: string
          name: string
          vouched_at: string
          zip_code: string
        }[]
      }
      get_supplies_with_owners: {
        Args: never
        Returns: {
          category: string
          condition: string
          contact_email: string
          created_at: string
          cross_streets: string
          date_available: string
          description: string
          house_rules: string[]
          id: string
          illustration_url: string
          image_url: string
          images: string[]
          lender_notes: string
          lent_out: boolean
          location: string
          name: string
          neighborhood: string
          owner_id: string
          owner_name: string
          owner_zip_code: string
          party_types: string[]
          updated_at: string
        }[]
      }
      get_supply_owner_info: {
        Args: { owner_id_param: string }
        Returns: {
          name: string
          zip_code: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_steward: { Args: { user_id: string }; Returns: boolean }
      is_user_vouched: { Args: { user_id: string }; Returns: boolean }
      search_supplies_public: {
        Args: { search_query: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "member" | "steward"
      join_request_status: "pending" | "vouched" | "rejected"
      user_role: "member" | "steward"
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
      app_role: ["member", "steward"],
      join_request_status: ["pending", "vouched", "rejected"],
      user_role: ["member", "steward"],
    },
  },
} as const
