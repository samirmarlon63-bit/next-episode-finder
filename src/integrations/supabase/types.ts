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
      anime_changes: {
        Row: {
          anime_id: string
          created_at: string
          id: string
          kind: string
          new_value: string | null
          old_value: string | null
          source_name: string | null
        }
        Insert: {
          anime_id: string
          created_at?: string
          id?: string
          kind: string
          new_value?: string | null
          old_value?: string | null
          source_name?: string | null
        }
        Update: {
          anime_id?: string
          created_at?: string
          id?: string
          kind?: string
          new_value?: string | null
          old_value?: string | null
          source_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anime_changes_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
        ]
      }
      animes: {
        Row: {
          airing_at: string | null
          anilist_id: number | null
          banner_url: string | null
          color: string | null
          cover_url: string | null
          created_at: string
          date_confirmed: boolean
          format: string | null
          genres: string[]
          id: string
          last_checked_at: string
          mal_id: number | null
          next_episode: number | null
          platforms: string[]
          popularity: number | null
          search_keys: string[]
          season: string | null
          season_year: number | null
          site_url: string | null
          source_name: string | null
          source_url: string | null
          start_date: string | null
          status: string | null
          studio: string | null
          synonyms: string[]
          synopsis: string | null
          title_english: string | null
          title_native: string | null
          title_romaji: string | null
          total_episodes: number | null
          updated_at: string
        }
        Insert: {
          airing_at?: string | null
          anilist_id?: number | null
          banner_url?: string | null
          color?: string | null
          cover_url?: string | null
          created_at?: string
          date_confirmed?: boolean
          format?: string | null
          genres?: string[]
          id?: string
          last_checked_at?: string
          mal_id?: number | null
          next_episode?: number | null
          platforms?: string[]
          popularity?: number | null
          search_keys?: string[]
          season?: string | null
          season_year?: number | null
          site_url?: string | null
          source_name?: string | null
          source_url?: string | null
          start_date?: string | null
          status?: string | null
          studio?: string | null
          synonyms?: string[]
          synopsis?: string | null
          title_english?: string | null
          title_native?: string | null
          title_romaji?: string | null
          total_episodes?: number | null
          updated_at?: string
        }
        Update: {
          airing_at?: string | null
          anilist_id?: number | null
          banner_url?: string | null
          color?: string | null
          cover_url?: string | null
          created_at?: string
          date_confirmed?: boolean
          format?: string | null
          genres?: string[]
          id?: string
          last_checked_at?: string
          mal_id?: number | null
          next_episode?: number | null
          platforms?: string[]
          popularity?: number | null
          search_keys?: string[]
          season?: string | null
          season_year?: number | null
          site_url?: string | null
          source_name?: string | null
          source_url?: string | null
          start_date?: string | null
          status?: string | null
          studio?: string | null
          synonyms?: string[]
          synopsis?: string | null
          title_english?: string | null
          title_native?: string | null
          title_romaji?: string | null
          total_episodes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      discoveries: {
        Row: {
          anime_id: string | null
          detected_at: string
          event_type: string | null
          id: string
          info: Json
          last_checked_at: string
          published_at: string | null
          source_id: string | null
          source_name: string
          status: string
          title: string | null
          url: string
        }
        Insert: {
          anime_id?: string | null
          detected_at?: string
          event_type?: string | null
          id?: string
          info?: Json
          last_checked_at?: string
          published_at?: string | null
          source_id?: string | null
          source_name: string
          status?: string
          title?: string | null
          url: string
        }
        Update: {
          anime_id?: string | null
          detected_at?: string
          event_type?: string | null
          id?: string
          info?: Json
          last_checked_at?: string
          published_at?: string | null
          source_id?: string | null
          source_name?: string
          status?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "discoveries_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discoveries_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      news_sources: {
        Row: {
          created_at: string
          enabled: boolean
          feed_url: string
          id: string
          kind: string
          last_checked_at: string | null
          last_error: string | null
          name: string
          trust: number
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feed_url: string
          id?: string
          kind?: string
          last_checked_at?: string | null
          last_error?: string | null
          name: string
          trust?: number
          url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feed_url?: string
          id?: string
          kind?: string
          last_checked_at?: string | null
          last_error?: string | null
          name?: string
          trust?: number
          url?: string
        }
        Relationships: []
      }
      sync_lock: {
        Row: {
          id: number
          locked_until: string
        }
        Insert: {
          id?: number
          locked_until?: string
        }
        Update: {
          id?: number
          locked_until?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          errors: Json
          finished_at: string | null
          id: string
          started_at: string
          stats: Json
          status: string
          trigger: string
        }
        Insert: {
          errors?: Json
          finished_at?: string | null
          id?: string
          started_at?: string
          stats?: Json
          status?: string
          trigger?: string
        }
        Update: {
          errors?: Json
          finished_at?: string | null
          id?: string
          started_at?: string
          stats?: Json
          status?: string
          trigger?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      acquire_sync_lock: { Args: { _seconds: number }; Returns: boolean }
      admin_exists: { Args: never; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      release_sync_lock: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    },
  },
} as const
