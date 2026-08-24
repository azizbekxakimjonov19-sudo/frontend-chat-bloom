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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          details: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bonus_claims: {
        Row: {
          amount: number
          claimed_at: string | null
          created_at: string
          expires_at: string
          id: string
          next_spin_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          claimed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          next_spin_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          next_spin_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_notifications: {
        Row: {
          attempts: number
          created_at: string
          id: number
          last_error: string | null
          sent_at: string | null
          telegram_id: number
          text: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: number
          last_error?: string | null
          sent_at?: string | null
          telegram_id: number
          text: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: number
          last_error?: string | null
          sent_at?: string | null
          telegram_id?: number
          text?: string
        }
        Relationships: []
      }
      bot_users: {
        Row: {
          channel_verified: boolean
          chat_id: number | null
          created_at: string
          first_name: string | null
          lang: string
          last_bot_message_id: number | null
          last_name: string | null
          phone: string | null
          referrer_telegram_id: number | null
          state: string
          telegram_id: number
          updated_at: string
          username: string | null
        }
        Insert: {
          channel_verified?: boolean
          chat_id?: number | null
          created_at?: string
          first_name?: string | null
          lang?: string
          last_bot_message_id?: number | null
          last_name?: string | null
          phone?: string | null
          referrer_telegram_id?: number | null
          state?: string
          telegram_id: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          channel_verified?: boolean
          chat_id?: number | null
          created_at?: string
          first_name?: string | null
          lang?: string
          last_bot_message_id?: number | null
          last_name?: string | null
          phone?: string | null
          referrer_telegram_id?: number | null
          state?: string
          telegram_id?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          payment_details: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          telegram_id: number
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method: string
          payment_details?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          telegram_id: number
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          payment_details?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          telegram_id?: number
          user_id?: string
        }
        Relationships: []
      }
      history: {
        Row: {
          amount: number
          drawn_at: string
          id: string
          jackpot_id: string
          participants_count: number
          winner_name: string
          winner_photo: string | null
          winner_telegram_id: number
          winner_username: string | null
        }
        Insert: {
          amount: number
          drawn_at?: string
          id?: string
          jackpot_id: string
          participants_count: number
          winner_name: string
          winner_photo?: string | null
          winner_telegram_id: number
          winner_username?: string | null
        }
        Update: {
          amount?: number
          drawn_at?: string
          id?: string
          jackpot_id?: string
          participants_count?: number
          winner_name?: string
          winner_photo?: string | null
          winner_telegram_id?: number
          winner_username?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          claimed_at: string | null
          created_at: string
          days: number
          ends_at: string
          id: string
          payout: number
          percent: number
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          claimed_at?: string | null
          created_at?: string
          days: number
          ends_at: string
          id?: string
          payout: number
          percent: number
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          created_at?: string
          days?: number
          ends_at?: string
          id?: string
          payout?: number
          percent?: number
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      jackpots: {
        Row: {
          active: boolean
          drawing: boolean
          ends_at: string
          forced_winner_telegram_id: number | null
          frozen: boolean
          id: string
          is_free: boolean
          last_winner_amount: number | null
          last_winner_at: string | null
          last_winner_name: string | null
          last_winner_photo: string | null
          last_winner_telegram_id: number | null
          last_winner_tickets: number | null
          last_winner_username: string | null
          opened_at: string
          prize: number
          refund_percent: number
          sale_hours: number
          sort_order: number
          spin_minutes: number
          ticket_price: number
          title: string
          updated_at: string
          wait_hours: number
          winner_slots: number
        }
        Insert: {
          active?: boolean
          drawing?: boolean
          ends_at: string
          forced_winner_telegram_id?: number | null
          frozen?: boolean
          id: string
          is_free?: boolean
          last_winner_amount?: number | null
          last_winner_at?: string | null
          last_winner_name?: string | null
          last_winner_photo?: string | null
          last_winner_telegram_id?: number | null
          last_winner_tickets?: number | null
          last_winner_username?: string | null
          opened_at?: string
          prize: number
          refund_percent?: number
          sale_hours: number
          sort_order?: number
          spin_minutes?: number
          ticket_price: number
          title: string
          updated_at?: string
          wait_hours: number
          winner_slots?: number
        }
        Update: {
          active?: boolean
          drawing?: boolean
          ends_at?: string
          forced_winner_telegram_id?: number | null
          frozen?: boolean
          id?: string
          is_free?: boolean
          last_winner_amount?: number | null
          last_winner_at?: string | null
          last_winner_name?: string | null
          last_winner_photo?: string | null
          last_winner_telegram_id?: number | null
          last_winner_tickets?: number | null
          last_winner_username?: string | null
          opened_at?: string
          prize?: number
          refund_percent?: number
          sale_hours?: number
          sort_order?: number
          spin_minutes?: number
          ticket_price?: number
          title?: string
          updated_at?: string
          wait_hours?: number
          winner_slots?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ad_reward_count: number
          ad_reward_cycle_start: string
          balance: number
          banned: boolean
          created_at: string
          first_name: string
          id: string
          last_name: string | null
          photo_url: string | null
          referral_code: string | null
          referrer_telegram_id: number | null
          telegram_id: number
          updated_at: string
          username: string | null
          withdraw_balance: number
        }
        Insert: {
          ad_reward_count?: number
          ad_reward_cycle_start?: string
          balance?: number
          banned?: boolean
          created_at?: string
          first_name?: string
          id: string
          last_name?: string | null
          photo_url?: string | null
          referral_code?: string | null
          referrer_telegram_id?: number | null
          telegram_id: number
          updated_at?: string
          username?: string | null
          withdraw_balance?: number
        }
        Update: {
          ad_reward_count?: number
          ad_reward_cycle_start?: string
          balance?: number
          banned?: boolean
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string | null
          photo_url?: string | null
          referral_code?: string | null
          referrer_telegram_id?: number | null
          telegram_id?: number
          updated_at?: string
          username?: string | null
          withdraw_balance?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          amount: number
          id: number
          paid_at: string
          referee_telegram_id: number
          referrer_telegram_id: number
        }
        Insert: {
          amount?: number
          id?: number
          paid_at?: string
          referee_telegram_id: number
          referrer_telegram_id: number
        }
        Update: {
          amount?: number
          id?: number
          paid_at?: string
          referee_telegram_id?: number
          referrer_telegram_id?: number
        }
        Relationships: []
      }
      tickets: {
        Row: {
          created_at: string
          first_name: string
          id: string
          jackpot_id: string
          photo_url: string | null
          price: number
          round_ends_at: string
          round_opened_at: string
          status: Database["public"]["Enums"]["ticket_status"]
          telegram_id: number
          ticket_code: string
          user_id: string
          username: string | null
          won_amount: number | null
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          jackpot_id: string
          photo_url?: string | null
          price: number
          round_ends_at: string
          round_opened_at: string
          status?: Database["public"]["Enums"]["ticket_status"]
          telegram_id: number
          ticket_code: string
          user_id: string
          username?: string | null
          won_amount?: number | null
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          jackpot_id?: string
          photo_url?: string | null
          price?: number
          round_ends_at?: string
          round_opened_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          telegram_id?: number
          ticket_code?: string
          user_id?: string
          username?: string | null
          won_amount?: number | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
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
      withdraw_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          paid_at: string | null
          payment_details: string | null
          queue_number: number | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          telegram_id: number
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method: string
          paid_at?: string | null
          payment_details?: string | null
          queue_number?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          telegram_id: number
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          paid_at?: string | null
          payment_details?: string | null
          queue_number?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          telegram_id?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _ad_window_start: { Args: { _from?: string }; Returns: string }
      _next_ad_reset: { Args: { _from?: string }; Returns: string }
      admin_adjust_balance: {
        Args: { _delta: number; _note: string; _user_id: string }
        Returns: Json
      }
      admin_adjust_withdraw_balance: {
        Args: { _delta: number; _note: string; _user_id: string }
        Returns: Json
      }
      admin_create_jackpot:
        | {
            Args: {
              _id: string
              _prize?: number
              _refund_percent?: number
              _sale_hours?: number
              _spin_minutes?: number
              _ticket_price?: number
              _title: string
              _wait_hours?: number
              _winner_slots?: number
            }
            Returns: Json
          }
        | {
            Args: {
              _id: string
              _is_free?: boolean
              _prize?: number
              _refund_percent?: number
              _sale_hours?: number
              _spin_minutes?: number
              _ticket_price?: number
              _title: string
              _wait_hours?: number
              _winner_slots?: number
            }
            Returns: Json
          }
      admin_delete_jackpot: { Args: { _id: string }; Returns: Json }
      admin_get_user_auth_id: {
        Args: { _telegram_id: number }
        Returns: string
      }
      admin_list_deposit_requests: {
        Args: { _limit?: number; _status?: string }
        Returns: {
          admin_note: string
          amount: number
          created_at: string
          first_name: string
          id: string
          method: string
          payment_details: string
          resolved_at: string
          status: string
          telegram_id: number
          user_id: string
          username: string
        }[]
      }
      admin_list_withdraw_requests: {
        Args: { _limit?: number; _status?: string }
        Returns: {
          admin_note: string
          amount: number
          created_at: string
          first_name: string
          id: string
          method: string
          paid_at: string
          payment_details: string
          photo_url: string
          queue_number: number
          resolved_at: string
          status: string
          telegram_id: number
          user_id: string
          username: string
        }[]
      }
      admin_mark_withdraw_paid: { Args: { _id: string }; Returns: Json }
      admin_rename_jackpot: {
        Args: { _id: string; _title: string }
        Returns: Json
      }
      admin_resolve_deposit: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: Json
      }
      admin_resolve_withdraw: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: Json
      }
      admin_set_bonus_enabled: { Args: { _enabled: boolean }; Returns: Json }
      admin_set_earn_enabled: { Args: { _enabled: boolean }; Returns: Json }
      admin_toggle_ban: { Args: { _user_id: string }; Returns: Json }
      admin_update_jackpot: {
        Args: {
          _id: string
          _prize: number
          _refund_percent: number
          _reset?: boolean
          _sale_hours: number
          _spin_minutes: number
          _ticket_price: number
          _wait_hours: number
          _winner_slots?: number
        }
        Returns: Json
      }
      bot_mark_channel_verified: {
        Args: { _telegram_id: number }
        Returns: Json
      }
      bot_set_phone: {
        Args: { _phone: string; _telegram_id: number }
        Returns: undefined
      }
      bot_upsert_user: {
        Args: {
          _chat_id: number
          _first_name: string
          _last_name: string
          _referrer: number
          _telegram_id: number
          _username: string
        }
        Returns: undefined
      }
      buy_ticket: { Args: { _jackpot_id: string }; Returns: Json }
      claim_ad_reward: { Args: never; Returns: Json }
      claim_bonus: { Args: never; Returns: Json }
      claim_investment: { Args: { _id: string }; Returns: Json }
      create_investment: {
        Args: { _amount: number; _days: number }
        Returns: Json
      }
      cron_auto_draw: { Args: never; Returns: Json }
      draw_jackpot: { Args: { _id: string }; Returns: Json }
      enqueue_bot_notification: {
        Args: { _telegram_id: number; _text: string }
        Returns: undefined
      }
      get_ad_status: { Args: never; Returns: Json }
      get_bonus_status: { Args: never; Returns: Json }
      get_my_referral_stats: { Args: never; Returns: Json }
      get_recent_withdrawals: {
        Args: { _limit?: number }
        Returns: {
          amount: number
          first_name: string
          id: string
          photo_url: string
          resolved_at: string
          telegram_id: number
          username: string
        }[]
      }
      get_top_balances: {
        Args: { _limit?: number }
        Returns: {
          first_name: string
          photo_url: string
          telegram_id: number
          total_balance: number
          username: string
        }[]
      }
      get_top_referrers: {
        Args: { _limit?: number }
        Returns: {
          first_name: string
          photo_url: string
          referral_count: number
          telegram_id: number
          username: string
        }[]
      }
      get_total_withdrawn: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      play_minigame: { Args: { _game: string }; Returns: Json }
      request_deposit: {
        Args: { _amount: number; _details: string; _method: string }
        Returns: Json
      }
      request_withdraw: {
        Args: { _amount: number; _details: string; _method: string }
        Returns: Json
      }
      spin_bonus: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      request_status: "pending" | "approved" | "rejected"
      ticket_status: "active" | "won" | "refunded"
      tx_type:
        | "deposit"
        | "withdraw"
        | "ticket"
        | "win"
        | "refund"
        | "admin_add"
        | "admin_sub"
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
      request_status: ["pending", "approved", "rejected"],
      ticket_status: ["active", "won", "refunded"],
      tx_type: [
        "deposit",
        "withdraw",
        "ticket",
        "win",
        "refund",
        "admin_add",
        "admin_sub",
      ],
    },
  },
} as const
