// Core action types for the immutable ledger
export type ActionType = 
  | 'roast_completed'
  | 'consumption'
  | 'green_purchase'
  | 'green_adjustment'
  | 'roasted_adjustment'
  | 'roast_scheduled'
  | 'roast_edited'
  | 'roast_deleted'
  | 'brew_logged'
  | 'equipment_added'
  | 'equipment_updated';

export type EntityType =
  | 'roasted_coffee'
  | 'green_coffee'
  | 'roast_schedule'
  | 'brew'
  | 'equipment';

// Immutable ledger entry interface
export interface LedgerEntry {
  id: string;
  user_id: string;
  timestamp: string;
  action_type: ActionType;
  entity_type: EntityType;
  entity_id: string | null;
  amount_change: number | null;
  metadata: Record<string, any>;
  balance_after: number | null;
  created_at: string;
}

// Coffee types
export type RoastLevel = 
  | 'Light'
  | 'Light/City'
  | 'City'
  | 'City+'
  | 'City/City+'
  | 'Full City'
  | 'Full City+'
  | 'Vienna'
  | 'French';

export interface RoastedCoffee {
  id: string;
  name: string;
  roast_date: string;
  roast_level: RoastLevel;
  remaining: number;
  initial: number;
  green_weight: number;
  weight_loss: number;
  batch_number: number;
  roast_profile?: RoastProfile;
  notes?: string;
}

export interface GreenCoffee {
  id: string;
  name: string;
  amount: number;
  roasts_available: number;
  origin?: string;
  processing_method?: string;
  varietal?: string;
  farm?: string;
  elevation?: number;
}

export interface RoastSchedule {
  id: string;
  date: string;
  coffee: string;
  green_weight: number;
  roast_level: RoastLevel;
  completed: boolean;
  notes?: string;
}

export interface RoastProfile {
  equipment: string;
  start_temp?: number;
  first_crack_time?: string;
  first_crack_temp?: number;
  end_temp?: number;
  total_time: string;
  fan_settings?: string;
  heat_settings?: string;
  detailed_progression?: string;
}

// Brew logging types
export interface BrewLog {
  id: string;
  timestamp: string;
  coffee_name: string;
  amount: number;
  coffee_age_days: number;
  grinder_model?: string;
  grind_setting?: number;
  brew_method: string;
  water_temp?: number;
  brew_time?: string;
  notes?: string;
  rating?: BrewRating;
}

export interface BrewRating {
  rating: number; // 1-5
  extraction_quality: 'under' | 'good' | 'over';
  taste_notes?: string;
  body_rating?: number;
  acidity_rating?: number;
  sweetness_rating?: number;
  would_repeat: boolean;
}

// Equipment types
export interface Equipment {
  id: string;
  type: 'grinder' | 'roaster' | 'brewer';
  brand: string;
  model: string;
  settings_schema: Record<string, any>;
  is_active: boolean;
}

// AI recommendation types
export interface AIRecommendation {
  type: 'brew_recipe' | 'roast_profile' | 'extraction_troubleshoot' | 'batch_comparison';
  recommendation: any;
  confidence?: number;
  reasoning?: string;
}

export interface BrewRecipeRecommendation {
  coffee_amount: number;
  water_amount: number;
  grind_setting: number;
  water_temp: number;
  steps: BrewStep[];
  expected_time: string;
  expected_profile: string;
  reasoning: string;
}

export interface BrewStep {
  time: string;
  action: string;
  water_amount?: number;
  running_total?: number;
}

export interface RoastProfileRecommendation {
  target_level: RoastLevel;
  green_weight: number;
  expected_roasted_weight: number;
  expected_weight_loss: number;
  profile: {
    preheat_temp?: number;
    start_temp: number;
    first_crack_target_time: string;
    first_crack_target_temp: number;
    development_time: string;
    end_temp: number;
    total_time: string;
    fan_profile: string;
    heat_profile: string;
  };
  tips: string[];
  reasoning: string;
}

// User preferences
export interface UserPreferences {
  user_id: string;
  daily_consumption: number;
  default_roast_size: number;
  default_brew_ratio: number;
  preferred_units: 'grams' | 'ounces';
  timezone: string;
  created_at: string;
  updated_at: string;
}