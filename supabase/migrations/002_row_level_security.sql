-- Row Level Security (RLS) Policies
-- Ensures users can only access their own data

-- Enable RLS on all tables
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE brew_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Ledger policies (append-only, immutable)
CREATE POLICY "Users can insert own ledger entries" ON ledger
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own ledger entries" ON ledger
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- No UPDATE or DELETE allowed on ledger (immutable)

-- Coffee batches policies
CREATE POLICY "Users can view own coffee batches" ON coffee_batches
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own coffee batches" ON coffee_batches
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own coffee batches" ON coffee_batches
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own coffee batches" ON coffee_batches
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Equipment policies
CREATE POLICY "Users can view own equipment" ON equipment
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own equipment" ON equipment
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own equipment" ON equipment
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own equipment" ON equipment
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Brew ratings policies
CREATE POLICY "Users can view own brew ratings" ON brew_ratings
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own brew ratings" ON brew_ratings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own brew ratings" ON brew_ratings
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own brew ratings" ON brew_ratings
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- AI recommendations policies
CREATE POLICY "Users can view own AI recommendations" ON ai_recommendations
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AI recommendations" ON ai_recommendations
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own AI recommendations" ON ai_recommendations
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own AI recommendations" ON ai_recommendations
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());