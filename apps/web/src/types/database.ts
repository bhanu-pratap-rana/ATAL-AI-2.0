export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      assessment_responses: {
        Row: {
          chosen_option: string | null
          created_at: string
          focus_blur_count: number | null
          id: string
          is_correct: boolean | null
          item_id: string
          module: string
          rt_ms: number | null
          session_id: string
        }
        Insert: {
          chosen_option?: string | null
          created_at?: string
          focus_blur_count?: number | null
          id?: string
          is_correct?: boolean | null
          item_id: string
          module: string
          rt_ms?: number | null
          session_id: string
        }
        Update: {
          chosen_option?: string | null
          created_at?: string
          focus_blur_count?: number | null
          id?: string
          is_correct?: boolean | null
          item_id?: string
          module?: string
          rt_ms?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          started_at: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          started_at?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          started_at?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_code: string | null
          created_at: string | null
          id: string
          join_pin: string | null
          name: string
          subject: string | null
          teacher_id: string | null
        }
        Insert: {
          class_code?: string | null
          created_at?: string | null
          id?: string
          join_pin?: string | null
          name: string
          subject?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_code?: string | null
          created_at?: string | null
          id?: string
          join_pin?: string | null
          name?: string
          subject?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          student_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          student_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      school_staff_credentials: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          pin_hash: string
          rotated_at: string | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          pin_hash: string
          rotated_at?: string | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          pin_hash?: string
          rotated_at?: string | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_staff_credentials_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          block: string | null
          created_at: string | null
          district: string
          id: string
          school_code: string
          school_name: string
        }
        Insert: {
          address?: string | null
          block?: string | null
          created_at?: string | null
          district: string
          id?: string
          school_code: string
          school_name: string
        }
        Update: {
          address?: string | null
          block?: string | null
          created_at?: string | null
          district?: string
          id?: string
          school_code?: string
          school_name?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          class_name: string | null
          created_at: string | null
          gender: string
          name: string
          phone: string | null
          roll_number: string | null
          school_id: string | null
          school_name: string | null
          updated_at: string | null
          user_id: string
          village: string | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string | null
          gender: string
          name: string
          phone?: string | null
          roll_number?: string | null
          school_id?: string | null
          school_name?: string | null
          updated_at?: string | null
          user_id: string
          village?: string | null
        }
        Update: {
          class_name?: string | null
          created_at?: string | null
          gender?: string
          name?: string
          phone?: string | null
          roll_number?: string | null
          school_id?: string | null
          school_name?: string | null
          updated_at?: string | null
          user_id?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          created_at: string | null
          gender: string | null
          name: string
          phone: string | null
          school_code: string
          school_id: string
          subject: string | null
          updated_at: string | null
          user_id: string
          village: string | null
        }
        Insert: {
          created_at?: string | null
          gender?: string | null
          name: string
          phone?: string | null
          school_code: string
          school_id: string
          subject?: string | null
          updated_at?: string | null
          user_id: string
          village?: string | null
        }
        Update: {
          created_at?: string | null
          gender?: string | null
          name?: string
          phone?: string | null
          school_code?: string
          school_id?: string
          subject?: string | null
          updated_at?: string | null
          user_id?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      usernames: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_exists: {
        Args: { p_email: string }
        Returns: {
          email_exists: boolean
          user_role: string
        }[]
      }
      check_username_available: {
        Args: { p_username: string }
        Returns: boolean
      }
      generate_class_code: { Args: never; Returns: string }
      generate_join_pin: { Args: never; Returns: string }
      get_teacher_class_ids: { Args: { p_user_id: string }; Returns: string[] }
      get_teacher_student_ids: { Args: never; Returns: string[] }
      get_user_enrolled_class_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_user_id_by_username: { Args: { p_username: string }; Returns: string }
      is_class_teacher: { Args: { p_class_id: string }; Returns: boolean }
      is_enrolled_in_class: { Args: { p_class_id: string }; Returns: boolean }
      is_teacher: { Args: never; Returns: boolean }
      rotate_staff_pin: {
        Args: { p_new_pin: string; p_school_id: string }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      verify_staff_pin: {
        Args: { p_pin: string; p_school_id: string }
        Returns: {
          is_valid: boolean
          pin_id: string
          school_id: string
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
