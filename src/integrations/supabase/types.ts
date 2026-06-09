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
      audit_events: {
        Row: {
          actor_id: string | null
          hash: string
          id: number
          kind: string
          meta: Json
          prev_hash: string
          ts: string
        }
        Insert: {
          actor_id?: string | null
          hash: string
          id?: number
          kind: string
          meta?: Json
          prev_hash: string
          ts?: string
        }
        Update: {
          actor_id?: string | null
          hash?: string
          id?: number
          kind?: string
          meta?: Json
          prev_hash?: string
          ts?: string
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
      e2ee_identities: {
        Row: {
          created_at: string
          identity_key: string
          registration_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          identity_key: string
          registration_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          identity_key?: string
          registration_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      e2ee_prekeys: {
        Row: {
          created_at: string
          key_id: number
          public_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          key_id: number
          public_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          key_id?: number
          public_key?: string
          user_id?: string
        }
        Relationships: []
      }
      e2ee_signed_prekeys: {
        Row: {
          created_at: string
          key_id: number
          public_key: string
          signature: string
          user_id: string
        }
        Insert: {
          created_at?: string
          key_id: number
          public_key: string
          signature: string
          user_id: string
        }
        Update: {
          created_at?: string
          key_id?: number
          public_key?: string
          signature?: string
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          last_at: string
          last_preview: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          last_at?: string
          last_preview?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          last_at?: string
          last_preview?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          ciphertext: string
          conversation_id: string | null
          created_at: string
          delivered_at: string | null
          group_id: string | null
          id: string
          kind: string
          nonce: string
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          status: string
        }
        Insert: {
          ciphertext: string
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          group_id?: string | null
          id?: string
          kind?: string
          nonce: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          ciphertext?: string
          conversation_id?: string | null
          created_at?: string
          delivered_at?: string | null
          group_id?: string | null
          id?: string
          kind?: string
          nonce?: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
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
      profiles_public: {
        Row: {
          avatar_url: string | null
          cover_url: string | null
          display_name: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          cover_url?: string | null
          display_name?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          cover_url?: string | null
          display_name?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_contact_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      add_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      audit_log: { Args: { p_kind: string; p_meta: Json }; Returns: undefined }
      audit_log_message: {
        Args: {
          p_ct_len: number
          p_envelope: string
          p_event: string
          p_group_id: string
          p_message_id: string
          p_peer_id: string
          p_scope: string
          p_success: boolean
        }
        Returns: undefined
      }
      audit_verify_chain: {
        Args: { p_limit?: number }
        Returns: {
          broken_at: number
          checked: number
        }[]
      }
      create_group: {
        Args: { p_member_ids: string[]; p_name: string }
        Returns: string
      }
      decline_contact_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      fetch_prekey_bundle: {
        Args: { p_user_id: string }
        Returns: {
          identity_key: string
          prekey_id: number
          prekey_public: string
          registration_id: number
          signed_prekey_id: number
          signed_prekey_public: string
          signed_prekey_signature: string
        }[]
      }
      gen_wallet_uid: { Args: never; Returns: string }
      get_contact_full_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          cover_url: string
          display_name: string
          dob: string
          email: string
          id: string
          phone: string
          username: string
        }[]
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          cover_url: string
          created_at: string
          currency: string
          display_name: string
          dob: string
          id: string
          language: string
          phone: string
          updated_at: string
          username: string
        }[]
      }
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
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
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
      list_my_groups: {
        Args: never
        Returns: {
          avatar_url: string
          id: string
          last_at: string
          last_preview: string
          member_count: number
          name: string
          owner_id: string
        }[]
      }
      mark_messages_delivered: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mark_messages_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      my_prekey_count: { Args: never; Returns: number }
      publish_prekey_bundle: {
        Args: {
          p_identity_key: string
          p_prekey_ids: number[]
          p_prekey_publics: string[]
          p_registration_id: number
          p_signed_prekey_id: number
          p_signed_prekey_public: string
          p_signed_prekey_signature: string
        }
        Returns: undefined
      }
      remove_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      rename_group: {
        Args: { p_group_id: string; p_name: string }
        Returns: undefined
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      touch_conversation_preview: {
        Args: { p_conversation_id: string; p_preview: string }
        Returns: undefined
      }
      touch_group_preview: {
        Args: { p_group_id: string; p_preview: string }
        Returns: undefined
      }
      wallet_deposit: {
        Args: { p_amount: number }
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
