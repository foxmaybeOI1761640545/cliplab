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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      action_tasks: {
        Row: {
          animation_id: string | null
          clip_id: string | null
          created_at: string
          due_date: string | null
          episode_id: string | null
          id: string
          is_demo: boolean
          lesson_id: string | null
          notes: string | null
          priority: string
          status: string
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          animation_id?: string | null
          clip_id?: string | null
          created_at?: string
          due_date?: string | null
          episode_id?: string | null
          id?: string
          is_demo?: boolean
          lesson_id?: string | null
          notes?: string | null
          priority?: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          animation_id?: string | null
          clip_id?: string | null
          created_at?: string
          due_date?: string | null
          episode_id?: string | null
          id?: string
          is_demo?: boolean
          lesson_id?: string | null
          notes?: string | null
          priority?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_tasks_animation_id_fkey"
            columns: ["animation_id"]
            isOneToOne: false
            referencedRelation: "animations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_tasks_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_tasks_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_tasks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      animations: {
        Row: {
          aliases: string | null
          created_at: string
          id: string
          is_demo: boolean
          name: string
          notes: string | null
          production_info: string | null
          synopsis: string | null
          theme_tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          aliases?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          notes?: string | null
          production_info?: string | null
          synopsis?: string | null
          theme_tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          aliases?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          notes?: string | null
          production_info?: string | null
          synopsis?: string | null
          theme_tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clips: {
        Row: {
          animation_id: string
          created_at: string
          discussion_goal: string | null
          end_seconds: number | null
          episode_id: string | null
          est_class_minutes: number | null
          grade: string
          highlight_notes: string | null
          id: string
          is_demo: boolean
          name: string
          play_minutes: number | null
          questions: string | null
          stage: string | null
          start_seconds: number | null
          status: string
          summary: string | null
          teaching_notes: string | null
          themes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          animation_id: string
          created_at?: string
          discussion_goal?: string | null
          end_seconds?: number | null
          episode_id?: string | null
          est_class_minutes?: number | null
          grade?: string
          highlight_notes?: string | null
          id?: string
          is_demo?: boolean
          name: string
          play_minutes?: number | null
          questions?: string | null
          stage?: string | null
          start_seconds?: number | null
          status?: string
          summary?: string | null
          teaching_notes?: string | null
          themes?: string[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          animation_id?: string
          created_at?: string
          discussion_goal?: string | null
          end_seconds?: number | null
          episode_id?: string | null
          est_class_minutes?: number | null
          grade?: string
          highlight_notes?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          play_minutes?: number | null
          questions?: string | null
          stage?: string | null
          start_seconds?: number | null
          status?: string
          summary?: string | null
          teaching_notes?: string | null
          themes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clips_animation_id_fkey"
            columns: ["animation_id"]
            isOneToOne: false
            referencedRelation: "animations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clips_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          animation_id: string
          created_at: string
          duration_seconds: number | null
          episode_number: number | null
          id: string
          is_demo: boolean
          notes: string | null
          season: number | null
          source_url: string | null
          synopsis: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          animation_id: string
          created_at?: string
          duration_seconds?: number | null
          episode_number?: number | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          season?: number | null
          source_url?: string | null
          synopsis?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          animation_id?: string
          created_at?: string
          duration_seconds?: number | null
          episode_number?: number | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          season?: number | null
          source_url?: string | null
          synopsis?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_animation_id_fkey"
            columns: ["animation_id"]
            isOneToOne: false
            referencedRelation: "animations"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_items: {
        Row: {
          clip_id: string | null
          created_at: string
          discussion: string | null
          id: string
          lesson_id: string
          minutes: number
          position: number
          questions: string | null
          stage: string
          summary: string | null
          themes: string[]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clip_id?: string | null
          created_at?: string
          discussion?: string | null
          id?: string
          lesson_id: string
          minutes?: number
          position?: number
          questions?: string | null
          stage: string
          summary?: string | null
          themes?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          clip_id?: string | null
          created_at?: string
          discussion?: string | null
          id?: string
          lesson_id?: string
          minutes?: number
          position?: number
          questions?: string | null
          stage?: string
          summary?: string | null
          themes?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_items_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_items_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          created_at: string
          grade: string
          id: string
          is_demo: boolean
          notes: string | null
          objectives: string | null
          theme: string | null
          title: string
          total_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grade?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          objectives?: string | null
          theme?: string | null
          title: string
          total_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          is_demo?: boolean
          notes?: string | null
          objectives?: string | null
          theme?: string | null
          title?: string
          total_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          animation_id: string | null
          clip_id: string | null
          copyright_notes: string | null
          copyright_status: string
          created_at: string
          episode_id: string | null
          id: string
          is_demo: boolean
          platform: string | null
          play_notes: string | null
          play_status: string
          updated_at: string
          url: string | null
          user_id: string
          verified_at: string | null
          verifier: string | null
        }
        Insert: {
          animation_id?: string | null
          clip_id?: string | null
          copyright_notes?: string | null
          copyright_status?: string
          created_at?: string
          episode_id?: string | null
          id?: string
          is_demo?: boolean
          platform?: string | null
          play_notes?: string | null
          play_status?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          verified_at?: string | null
          verifier?: string | null
        }
        Update: {
          animation_id?: string | null
          clip_id?: string | null
          copyright_notes?: string | null
          copyright_status?: string
          created_at?: string
          episode_id?: string | null
          id?: string
          is_demo?: boolean
          platform?: string | null
          play_notes?: string | null
          play_status?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          verified_at?: string | null
          verifier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_animation_id_fkey"
            columns: ["animation_id"]
            isOneToOne: false
            referencedRelation: "animations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
