// TypeScript definitions for Supabase database schema
// Generated to match our migration files

export interface Database {
  public: {
    Tables: {
      ledger: {
        Row: {
          id: string;
          user_id: string;
          timestamp: string;
          action_type: 'roast_completed' | 'consumption' | 'green_purchase' | 'green_adjustment' | 'roasted_adjustment' | 'roast_scheduled' | 'roast_edited' | 'roast_deleted' | 'brew_logged' | 'equipment_added' | 'equipment_updated';
          entity_type: 'roasted_coffee' | 'green_coffee' | 'roast_schedule' | 'brew' | 'equipment';
          entity_id: string | null;
          amount_change: number | null;
          metadata: Record<string, any>;
          balance_after: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          timestamp?: string;
          action_type: 'roast_completed' | 'consumption' | 'green_purchase' | 'green_adjustment' | 'roasted_adjustment' | 'roast_scheduled' | 'roast_edited' | 'roast_deleted' | 'brew_logged' | 'equipment_added' | 'equipment_updated';
          entity_type: 'roasted_coffee' | 'green_coffee' | 'roast_schedule' | 'brew' | 'equipment';
          entity_id?: string | null;
          amount_change?: number | null;
          metadata?: Record<string, any>;
          balance_after?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          timestamp?: string;
          action_type?: 'roast_completed' | 'consumption' | 'green_purchase' | 'green_adjustment' | 'roasted_adjustment' | 'roast_scheduled' | 'roast_edited' | 'roast_deleted' | 'brew_logged' | 'equipment_added' | 'equipment_updated';
          entity_type?: 'roasted_coffee' | 'green_coffee' | 'roast_schedule' | 'brew' | 'equipment';
          entity_id?: string | null;
          amount_change?: number | null;
          metadata?: Record<string, any>;
          balance_after?: number | null;
          created_at?: string;
        };
      };
      coffee_batches: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'roasted' | 'green';
          origin: string | null;
          processing_method: string | null;
          varietal: string | null;
          farm: string | null;
          elevation: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'roasted' | 'green';
          origin?: string | null;
          processing_method?: string | null;
          varietal?: string | null;
          farm?: string | null;
          elevation?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'roasted' | 'green';
          origin?: string | null;
          processing_method?: string | null;
          varietal?: string | null;
          farm?: string | null;
          elevation?: number | null;
          created_at?: string;
        };
      };
      equipment: {
        Row: {
          id: string;
          user_id: string;
          type: 'grinder' | 'roaster' | 'brewer';
          brand: string;
          model: string;
          settings_schema: Record<string, any>;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'grinder' | 'roaster' | 'brewer';
          brand: string;
          model: string;
          settings_schema?: Record<string, any>;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'grinder' | 'roaster' | 'brewer';
          brand?: string;
          model?: string;
          settings_schema?: Record<string, any>;
          is_active?: boolean;
          created_at?: string;
        };
      };
      brew_ratings: {
        Row: {
          id: string;
          user_id: string;
          ledger_entry_id: string;
          rating: number | null;
          extraction_quality: 'under' | 'good' | 'over' | null;
          taste_notes: string | null;
          body_rating: number | null;
          acidity_rating: number | null;
          sweetness_rating: number | null;
          would_repeat: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ledger_entry_id: string;
          rating?: number | null;
          extraction_quality?: 'under' | 'good' | 'over' | null;
          taste_notes?: string | null;
          body_rating?: number | null;
          acidity_rating?: number | null;
          sweetness_rating?: number | null;
          would_repeat?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ledger_entry_id?: string;
          rating?: number | null;
          extraction_quality?: 'under' | 'good' | 'over' | null;
          taste_notes?: string | null;
          body_rating?: number | null;
          acidity_rating?: number | null;
          sweetness_rating?: number | null;
          would_repeat?: boolean | null;
          created_at?: string;
        };
      };
      user_preferences: {
        Row: {
          user_id: string;
          daily_consumption: number;
          default_roast_size: number;
          default_brew_ratio: number;
          preferred_units: 'grams' | 'ounces';
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          daily_consumption?: number;
          default_roast_size?: number;
          default_brew_ratio?: number;
          preferred_units?: 'grams' | 'ounces';
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          daily_consumption?: number;
          default_roast_size?: number;
          default_brew_ratio?: number;
          preferred_units?: 'grams' | 'ounces';
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_recommendations: {
        Row: {
          id: string;
          user_id: string;
          recommendation_type: 'brew_recipe' | 'roast_profile' | 'extraction_troubleshoot' | 'batch_comparison';
          input_context: Record<string, any>;
          recommendation: Record<string, any>;
          was_helpful: boolean | null;
          user_feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recommendation_type: 'brew_recipe' | 'roast_profile' | 'extraction_troubleshoot' | 'batch_comparison';
          input_context: Record<string, any>;
          recommendation: Record<string, any>;
          was_helpful?: boolean | null;
          user_feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recommendation_type?: 'brew_recipe' | 'roast_profile' | 'extraction_troubleshoot' | 'batch_comparison';
          input_context?: Record<string, any>;
          recommendation?: Record<string, any>;
          was_helpful?: boolean | null;
          user_feedback?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      current_coffee_inventory: {
        Row: {
          coffee_id: string;
          name: string;
          current_amount: number;
          roast_date: string;
          roast_level: string;
          initial_amount: number;
          green_weight: number;
          weight_loss: number;
          batch_number: number;
          roast_profile: Record<string, any> | null;
          notes: string | null;
          freshness_status: string;
          age_days: number;
          stock_level: string;
        };
      };
    };
    Functions: {
      calculate_roasted_inventory: {
        Args: { p_user_id: string };
        Returns: Array<{
          coffee_id: string;
          name: string;
          current_amount: number;
          roast_date: string;
          roast_level: string;
          initial_amount: number;
          green_weight: number;
          weight_loss: number;
          batch_number: number;
          roast_profile: Record<string, any> | null;
          notes: string | null;
        }>;
      };
      calculate_green_inventory: {
        Args: { p_user_id: string };
        Returns: Array<{
          coffee_id: string;
          name: string;
          current_amount: number;
          roasts_available: number;
          origin: string | null;
          processing_method: string | null;
          varietal: string | null;
          farm: string | null;
          elevation: number | null;
        }>;
      };
      get_brew_history: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: Array<{
          id: string;
          timestamp: string;
          coffee_name: string;
          amount: number;
          coffee_age_days: number;
          grinder_model: string | null;
          grind_setting: number | null;
          brew_method: string;
          water_temp: number | null;
          brew_time: string | null;
          notes: string | null;
          rating: number | null;
          extraction_quality: string | null;
          taste_notes: string | null;
          would_repeat: boolean | null;
        }>;
      };
      get_roast_schedule: {
        Args: { p_user_id: string };
        Returns: Array<{
          id: string;
          scheduled_date: string;
          coffee_name: string;
          green_weight: number;
          target_roast_level: string;
          completed: boolean;
          completed_date: string | null;
          notes: string | null;
        }>;
      };
      get_user_equipment: {
        Args: { p_user_id: string };
        Returns: Array<{
          id: string;
          type: string;
          brand: string;
          model: string;
          settings_schema: Record<string, any>;
          is_active: boolean;
          created_at: string;
        }>;
      };
      get_next_batch_number: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_consumption_analytics: {
        Args: { p_user_id: string; p_days?: number };
        Returns: Array<{
          date: string;
          total_consumed: number;
          brew_count: number;
          avg_rating: number | null;
        }>;
      };
    };
  };
}