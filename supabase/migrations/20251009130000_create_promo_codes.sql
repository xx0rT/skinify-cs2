/*
  # Create Promo Codes System

  1. New Tables
    - `promo_codes` - Promotional discount codes management
      - `id` (uuid, primary key)
      - `code` (text, unique) - The promo code string
      - `discount_type` (text) - 'percentage' or 'fixed'
      - `discount_value` (numeric) - Discount amount
      - `max_uses` (integer) - Maximum number of uses
      - `current_uses` (integer) - Current usage count
      - `valid_from` (timestamp) - Start date
      - `valid_until` (timestamp) - End date
      - `is_active` (boolean) - Whether the code is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `promo_code_uses` - Track promo code usage
      - `id` (uuid, primary key)
      - `promo_code_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `order_id` (uuid) - Optional order reference
      - `discount_applied` (numeric) - Actual discount amount applied
      - `used_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Admins can manage promo codes
    - Users can view active promo codes
    - Track usage per user
*/

-- Promo Codes Table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses integer NOT NULL DEFAULT 100,
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can view active promo codes
CREATE POLICY "Anyone can view active promo codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true AND valid_from <= now() AND valid_until >= now());

-- Admins can manage all promo codes
CREATE POLICY "Admins can manage promo codes"
  ON promo_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  );

-- Promo Code Uses Table
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid,
  discount_applied numeric(10,2) NOT NULL,
  used_at timestamptz DEFAULT now()
);

ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Users can view their own promo code usage
CREATE POLICY "Users can view own promo usage"
  ON promo_code_uses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert promo code usage
CREATE POLICY "System can track promo usage"
  ON promo_code_uses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view all promo code usage
CREATE POLICY "Admins can view all promo usage"
  ON promo_code_uses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_promo ON promo_code_uses(promo_code_id);

-- Function to validate and apply promo code
CREATE OR REPLACE FUNCTION apply_promo_code(
  p_code text,
  p_user_id uuid,
  p_order_total numeric
) RETURNS jsonb AS $$
DECLARE
  v_promo promo_codes;
  v_discount numeric;
  v_uses_count integer;
BEGIN
  -- Get promo code
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE code = p_code
    AND is_active = true
    AND valid_from <= now()
    AND valid_until >= now();

  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired promo code');
  END IF;

  -- Check if user already used this code
  SELECT COUNT(*) INTO v_uses_count
  FROM promo_code_uses
  WHERE promo_code_id = v_promo.id
    AND user_id = p_user_id;

  IF v_uses_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You have already used this promo code');
  END IF;

  -- Check max uses
  IF v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code has reached maximum uses');
  END IF;

  -- Calculate discount
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := (p_order_total * v_promo.discount_value / 100);
  ELSE
    v_discount := v_promo.discount_value;
  END IF;

  -- Ensure discount doesn't exceed order total
  IF v_discount > p_order_total THEN
    v_discount := p_order_total;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'discount', v_discount,
    'promo_id', v_promo.id,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
