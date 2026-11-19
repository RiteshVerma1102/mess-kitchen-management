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
      foodflow_attendance: {
        Row: {
          created_at: string
          device_uuid: string | null
          hall: string
          id: string
          institution_id: string
          is_demo: boolean
          meal_type: string
          served_at: string
          student_code: string
          student_id: string | null
          student_name: string
        }
        Insert: {
          created_at?: string
          device_uuid?: string | null
          hall?: string
          id?: string
          institution_id: string
          is_demo?: boolean
          meal_type: string
          served_at?: string
          student_code?: string
          student_id?: string | null
          student_name: string
        }
        Update: {
          created_at?: string
          device_uuid?: string | null
          hall?: string
          id?: string
          institution_id?: string
          is_demo?: boolean
          meal_type?: string
          served_at?: string
          student_code?: string
          student_id?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_attendance_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foodflow_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "foodflow_students"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_calendar_events: {
        Row: {
          attendance_factor: number
          created_at: string
          description: string
          event_date: string
          id: string
          institution_id: string
          is_demo: boolean
          title: string
        }
        Insert: {
          attendance_factor?: number
          created_at?: string
          description?: string
          event_date: string
          id?: string
          institution_id: string
          is_demo?: boolean
          title: string
        }
        Update: {
          attendance_factor?: number
          created_at?: string
          description?: string
          event_date?: string
          id?: string
          institution_id?: string
          is_demo?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_calendar_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_forecasts: {
        Row: {
          confidence: number
          created_at: string
          expected_students: number
          forecast_date: string
          id: string
          institution_id: string
          is_demo: boolean
          meal_type: string
          method: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          expected_students?: number
          forecast_date: string
          id?: string
          institution_id: string
          is_demo?: boolean
          meal_type: string
          method?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          expected_students?: number
          forecast_date?: string
          id?: string
          institution_id?: string
          is_demo?: boolean
          meal_type?: string
          method?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_forecasts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_halls: {
        Row: {
          capacity: number
          created_at: string
          id: string
          institution_id: string
          is_demo: boolean
          name: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          institution_id: string
          is_demo?: boolean
          name: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          institution_id?: string
          is_demo?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_halls_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_institutions: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          name: string
          timezone: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: string
          name: string
          timezone?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      foodflow_inventory: {
        Row: {
          category: string
          created_at: string
          expiry_date: string | null
          id: string
          institution_id: string
          is_demo: boolean
          minimum_quantity: number
          name: string
          quantity: number
          supplier_name: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          institution_id: string
          is_demo?: boolean
          minimum_quantity?: number
          name: string
          quantity?: number
          supplier_name?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          institution_id?: string
          is_demo?: boolean
          minimum_quantity?: number
          name?: string
          quantity?: number
          supplier_name?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_inventory_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_kitchen_tasks: {
        Row: {
          assigned_to: string
          completed_quantity: number
          created_at: string
          dish_name: string
          id: string
          institution_id: string
          is_demo: boolean
          meal_type: string
          planned_quantity: number
          status: string
          task_date: string
        }
        Insert: {
          assigned_to?: string
          completed_quantity?: number
          created_at?: string
          dish_name: string
          id?: string
          institution_id: string
          is_demo?: boolean
          meal_type: string
          planned_quantity?: number
          status?: string
          task_date: string
        }
        Update: {
          assigned_to?: string
          completed_quantity?: number
          created_at?: string
          dish_name?: string
          id?: string
          institution_id?: string
          is_demo?: boolean
          meal_type?: string
          planned_quantity?: number
          status?: string
          task_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_kitchen_tasks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_meal_plans: {
        Row: {
          created_at: string
          dishes: string[]
          expected_servings: number
          id: string
          institution_id: string
          is_demo: boolean
          meal_type: string
          service_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dishes?: string[]
          expected_servings?: number
          id?: string
          institution_id: string
          is_demo?: boolean
          meal_type: string
          service_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dishes?: string[]
          expected_servings?: number
          id?: string
          institution_id?: string
          is_demo?: boolean
          meal_type?: string
          service_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_meal_plans_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          institution_id: string | null
          institution_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string | null
          institution_id?: string | null
          institution_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          institution_id?: string | null
          institution_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_purchase_order_items: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          item_name: string
          purchase_order_id: string
          quantity: number
          unit: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          item_name: string
          purchase_order_id: string
          quantity?: number
          unit?: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          item_name?: string
          purchase_order_id?: string
          quantity?: number
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "foodflow_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_purchase_orders: {
        Row: {
          created_at: string
          expected_date: string | null
          id: string
          institution_id: string
          is_demo: boolean
          item_summary: string
          order_number: string
          status: string
          supplier_name: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          expected_date?: string | null
          id?: string
          institution_id: string
          is_demo?: boolean
          item_summary: string
          order_number: string
          status?: string
          supplier_name: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          expected_date?: string | null
          id?: string
          institution_id?: string
          is_demo?: boolean
          item_summary?: string
          order_number?: string
          status?: string
          supplier_name?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_purchase_orders_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_recipes: {
        Row: {
          category: string
          cost_per_serving: number
          created_at: string
          id: string
          ingredients: Json
          institution_id: string
          instructions: string
          is_demo: boolean
          name: string
          servings: number
          updated_at: string
        }
        Insert: {
          category?: string
          cost_per_serving?: number
          created_at?: string
          id?: string
          ingredients?: Json
          institution_id: string
          instructions?: string
          is_demo?: boolean
          name: string
          servings?: number
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_serving?: number
          created_at?: string
          id?: string
          ingredients?: Json
          institution_id?: string
          instructions?: string
          is_demo?: boolean
          name?: string
          servings?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_recipes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_service_actuals: {
        Row: {
          created_at: string
          dish_name: string
          id: string
          institution_id: string
          is_demo: boolean
          leftover_quantity: number
          meal_type: string
          prepared_quantity: number
          served_quantity: number
          service_date: string
          spoiled_quantity: number
          unit: string
        }
        Insert: {
          created_at?: string
          dish_name: string
          id?: string
          institution_id: string
          is_demo?: boolean
          leftover_quantity?: number
          meal_type: string
          prepared_quantity?: number
          served_quantity?: number
          service_date: string
          spoiled_quantity?: number
          unit?: string
        }
        Update: {
          created_at?: string
          dish_name?: string
          id?: string
          institution_id?: string
          is_demo?: boolean
          leftover_quantity?: number
          meal_type?: string
          prepared_quantity?: number
          served_quantity?: number
          service_date?: string
          spoiled_quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_service_actuals_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_stock_movements: {
        Row: {
          id: string
          institution_id: string
          inventory_item_id: string | null
          is_demo: boolean
          item_name: string
          moved_at: string
          quantity_delta: number
          reason: string
          unit: string
        }
        Insert: {
          id?: string
          institution_id: string
          inventory_item_id?: string | null
          is_demo?: boolean
          item_name: string
          moved_at?: string
          quantity_delta: number
          reason?: string
          unit?: string
        }
        Update: {
          id?: string
          institution_id?: string
          inventory_item_id?: string | null
          is_demo?: boolean
          item_name?: string
          moved_at?: string
          quantity_delta?: number
          reason?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_stock_movements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foodflow_stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "foodflow_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_students: {
        Row: {
          created_at: string
          dietary_notes: string
          full_name: string
          hall: string
          id: string
          institution_id: string
          is_demo: boolean
          meal_plan: string
          status: string
          student_code: string
        }
        Insert: {
          created_at?: string
          dietary_notes?: string
          full_name: string
          hall?: string
          id?: string
          institution_id: string
          is_demo?: boolean
          meal_plan?: string
          status?: string
          student_code: string
        }
        Update: {
          created_at?: string
          dietary_notes?: string
          full_name?: string
          hall?: string
          id?: string
          institution_id?: string
          is_demo?: boolean
          meal_plan?: string
          status?: string
          student_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_suppliers: {
        Row: {
          category: string
          contact_name: string
          created_at: string
          email: string
          id: string
          institution_id: string
          is_demo: boolean
          name: string
          phone: string
          status: string
        }
        Insert: {
          category?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          institution_id: string
          is_demo?: boolean
          name: string
          phone?: string
          status?: string
        }
        Update: {
          category?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          institution_id?: string
          is_demo?: boolean
          name?: string
          phone?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_suppliers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_user_roles: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          role: Database["public"]["Enums"]["foodflow_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          role: Database["public"]["Enums"]["foodflow_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          role?: Database["public"]["Enums"]["foodflow_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_user_roles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      foodflow_waste_entries: {
        Row: {
          created_at: string
          dish_name: string
          id: string
          institution_id: string
          is_demo: boolean
          meal_type: string
          prepared_quantity: number
          record_date: string
          served_quantity: number
          unit: string
          waste_cost: number
          wasted_quantity: number
        }
        Insert: {
          created_at?: string
          dish_name: string
          id?: string
          institution_id: string
          is_demo?: boolean
          meal_type: string
          prepared_quantity?: number
          record_date?: string
          served_quantity?: number
          unit?: string
          waste_cost?: number
          wasted_quantity?: number
        }
        Update: {
          created_at?: string
          dish_name?: string
          id?: string
          institution_id?: string
          is_demo?: boolean
          meal_type?: string
          prepared_quantity?: number
          record_date?: string
          served_quantity?: number
          unit?: string
          waste_cost?: number
          wasted_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "foodflow_waste_entries_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "foodflow_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      foodflow_adjust_inventory: {
        Args: {
          _delta: number
          _institution_id: string
          _inventory_id: string
          _reason: string
        }
        Returns: Json
      }
      foodflow_assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["foodflow_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      foodflow_assign_role_by_email: {
        Args: {
          _role: Database["public"]["Enums"]["foodflow_role"]
          _target_email: string
        }
        Returns: undefined
      }
      foodflow_complete_setup_for_current_user: {
        Args: { _institution_name: string }
        Returns: string
      }
      foodflow_create_institution: { Args: { _name: string }; Returns: string }
      foodflow_current_institution_id: { Args: never; Returns: string }
      foodflow_delete_inventory_item: {
        Args: { _inventory_id: string }
        Returns: boolean
      }
      foodflow_has_any_role: {
        Args: {
          _institution_id: string
          _roles: Database["public"]["Enums"]["foodflow_role"][]
        }
        Returns: boolean
      }
      foodflow_has_role: {
        Args: {
          _institution_id: string
          _role: Database["public"]["Enums"]["foodflow_role"]
        }
        Returns: boolean
      }
      foodflow_import_demo_inventory: {
        Args: { _institution_id: string }
        Returns: boolean
      }
      foodflow_list_team: { Args: never; Returns: Json }
      foodflow_remove_role: {
        Args: {
          _role: Database["public"]["Enums"]["foodflow_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      foodflow_role:
        | "institution_admin"
        | "mess_manager"
        | "kitchen_staff"
        | "attendance_operator"
        | "viewer"
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
      foodflow_role: [
        "institution_admin",
        "mess_manager",
        "kitchen_staff",
        "attendance_operator",
        "viewer",
      ],
    },
  },
} as const
