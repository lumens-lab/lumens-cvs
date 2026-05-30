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
      accounts: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          number_mask: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          number_mask?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          number_mask?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          month_key: string
          period: string
          start_date: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          month_key: string
          period?: string
          start_date?: string | null
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          month_key?: string
          period?: string
          start_date?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_signals: {
        Row: {
          call_id: string
          created_at: string
          from_user: string
          id: string
          kind: string
          payload: Json
          to_user: string
        }
        Insert: {
          call_id: string
          created_at?: string
          from_user: string
          id?: string
          kind: string
          payload: Json
          to_user: string
        }
        Update: {
          call_id?: string
          created_at?: string
          from_user?: string
          id?: string
          kind?: string
          payload?: Json
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          callee_id: string
          caller_id: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          created_at: string
          exp: string
          holder: string
          id: string
          last4: string
          num_enc: string | null
          theme: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exp: string
          holder: string
          id?: string
          last4: string
          num_enc?: string | null
          theme?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exp?: string
          holder?: string
          id?: string
          last4?: string
          num_enc?: string | null
          theme?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          budget: number | null
          color: string
          created_at: string
          icon: string
          id: string
          kind: string
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind: string
          name: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind?: string
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          created_at: string
          from_user: string
          id: string
          status: string
          to_user: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          status?: string
          to_user: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          status?: string
          to_user?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          confirmed: boolean
          contact_user_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          confirmed?: boolean
          contact_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          confirmed?: boolean
          contact_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_at: string
          last_preview: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_at?: string
          last_preview?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_at?: string
          last_preview?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      debit_orders: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          category_slug: string | null
          created_at: string
          id: string
          name: string
          next_date: string
          period: string
          remind_days_before: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          category_slug?: string | null
          created_at?: string
          id?: string
          name: string
          next_date: string
          period?: string
          remind_days_before?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          category_slug?: string | null
          created_at?: string
          id?: string
          name?: string
          next_date?: string
          period?: string
          remind_days_before?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      domicile_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
          wallet_uid: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
          wallet_uid: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
          wallet_uid?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          ciphertext: string
          conversation_id: string
          created_at: string
          id: string
          kind: string
          nonce: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          ciphertext: string
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          nonce: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          ciphertext?: string
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          nonce?: string
          recipient_id?: string
          sender_id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          cover_url: string | null
          created_at: string
          currency: string | null
          display_name: string | null
          dob: string | null
          id: string
          language: string | null
          phone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string | null
          display_name?: string | null
          dob?: string | null
          id: string
          language?: string | null
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string | null
          display_name?: string | null
          dob?: string | null
          id?: string
          language?: string | null
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device: string | null
          id: string
          subscription: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          subscription: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          subscription?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      txs: {
        Row: {
          amt: number
          cat: string
          created_at: string
          date: string
          ibg: string | null
          ic: string | null
          icon: string
          id: string
          items: Json | null
          merchant: string | null
          name: string
          note: string | null
          receipt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amt: number
          cat: string
          created_at?: string
          date: string
          ibg?: string | null
          ic?: string | null
          icon?: string
          id?: string
          items?: Json | null
          merchant?: string | null
          name: string
          note?: string | null
          receipt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amt?: number
          cat?: string
          created_at?: string
          date?: string
          ibg?: string | null
          ic?: string | null
          icon?: string
          id?: string
          items?: Json | null
          merchant?: string | null
          name?: string
          note?: string | null
          receipt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_contact_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      decline_contact_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      gen_wallet_uid: { Args: never; Returns: string }
      get_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_or_create_domicile_wallet: {
        Args: { preferred_currency?: string }
        Returns: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
          wallet_uid: string
        }
        SetofOptions: {
          from: "*"
          to: "domicile_wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_contact_requests: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          direction: string
          display_name: string
          from_user: string
          id: string
          status: string
          to_user: string
          username: string
        }[]
      }
      search_profiles: {
        Args: { q: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      send_contact_request: { Args: { to_user_id: string }; Returns: string }
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
