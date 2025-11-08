-- Bean Ledger Database Schema
-- Immutable ledger architecture for coffee roasting and brewing management

-- Core immutable ledger table
CREATE TABLE ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    timestamp timestamptz DEFAULT now() NOT NULL,
    action_type text NOT NULL CHECK (action_type IN (
        'roast_completed',
        'consumption', 
        'green_purchase',
        'green_adjustment',
        'roasted_adjustment',
        'roast_scheduled',
        'roast_edited',
        'roast_deleted',
        'brew_logged',
        'equipment_added',
        'equipment_updated'
    )),
    entity_type text NOT NULL CHECK (entity_type IN (
        'roasted_coffee',
        'green_coffee', 
        'roast_schedule',
        'brew',
        'equipment'
    )),
    entity_id uuid,
    amount_change numeric,
    metadata jsonb NOT NULL DEFAULT '{}',
    balance_after numeric,
    created_at timestamptz DEFAULT now() NOT NULL,
    
    -- Ensure immutability
    CONSTRAINT ledger_immutable CHECK (created_at = timestamp)
);

-- Coffee batches (both green and roasted)
CREATE TABLE coffee_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('roasted', 'green')),
    origin text,
    processing_method text,
    varietal text,
    farm text,
    elevation numeric,
    created_at timestamptz DEFAULT now() NOT NULL,
    
    UNIQUE(user_id, name, type)
);

-- Equipment profiles
CREATE TABLE equipment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    type text NOT NULL CHECK (type IN ('grinder', 'roaster', 'brewer')),
    brand text NOT NULL,
    model text NOT NULL,
    settings_schema jsonb NOT NULL DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Detailed brew ratings and tasting notes
CREATE TABLE brew_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    ledger_entry_id uuid REFERENCES ledger(id) NOT NULL,
    rating numeric CHECK (rating >= 1 AND rating <= 5),
    extraction_quality text CHECK (extraction_quality IN ('under', 'good', 'over')),
    taste_notes text,
    body_rating numeric CHECK (body_rating >= 1 AND body_rating <= 5),
    acidity_rating numeric CHECK (acidity_rating >= 1 AND acidity_rating <= 5),
    sweetness_rating numeric CHECK (sweetness_rating >= 1 AND sweetness_rating <= 5),
    would_repeat boolean,
    created_at timestamptz DEFAULT now() NOT NULL,
    
    UNIQUE(ledger_entry_id)
);

-- User preferences and settings
CREATE TABLE user_preferences (
    user_id uuid PRIMARY KEY REFERENCES auth.users,
    daily_consumption numeric DEFAULT 40 NOT NULL,
    default_roast_size numeric DEFAULT 220 NOT NULL,
    default_brew_ratio numeric DEFAULT 15 NOT NULL,
    preferred_units text DEFAULT 'grams' CHECK (preferred_units IN ('grams', 'ounces')),
    timezone text DEFAULT 'UTC',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- AI recommendation history
CREATE TABLE ai_recommendations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    recommendation_type text NOT NULL CHECK (recommendation_type IN (
        'brew_recipe',
        'roast_profile',
        'extraction_troubleshoot',
        'batch_comparison'
    )),
    input_context jsonb NOT NULL,
    recommendation jsonb NOT NULL,
    was_helpful boolean,
    user_feedback text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_ledger_user_id ON ledger(user_id);
CREATE INDEX idx_ledger_action_type ON ledger(action_type);
CREATE INDEX idx_ledger_entity_id ON ledger(entity_id);
CREATE INDEX idx_ledger_timestamp ON ledger(timestamp DESC);

CREATE INDEX idx_coffee_batches_user_type ON coffee_batches(user_id, type);
CREATE INDEX idx_equipment_user_active ON equipment(user_id, is_active);
CREATE INDEX idx_brew_ratings_user ON brew_ratings(user_id);
CREATE INDEX idx_ai_recommendations_user_type ON ai_recommendations(user_id, recommendation_type);
CREATE INDEX idx_ai_recommendations_created ON ai_recommendations(created_at DESC);