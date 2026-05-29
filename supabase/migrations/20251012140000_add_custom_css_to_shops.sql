/*
  # Add Custom CSS Support to User Shops

  1. Changes
    - Add `custom_css` column to user_shops table
    - Allow users to write custom CSS for their shop pages
    - Add constraint to limit CSS size (max 50KB)

  2. Security
    - CSS is stored as text
    - Sanitization should be handled in frontend
    - Size limit prevents abuse

  3. Notes
    - Custom CSS will be injected into shop pages
    - Users can fully customize their shop appearance
    - Should be wrapped in a scoped style tag
*/

-- Add custom_css column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_shops'
    AND column_name = 'custom_css'
  ) THEN
    ALTER TABLE user_shops ADD COLUMN custom_css text;

    -- Add constraint to limit CSS size (50KB max)
    ALTER TABLE user_shops ADD CONSTRAINT custom_css_size_limit
      CHECK (length(custom_css) <= 51200);

    RAISE NOTICE 'Added custom_css column to user_shops';
  ELSE
    RAISE NOTICE 'custom_css column already exists';
  END IF;
END $$;

-- Create index for shops with custom CSS
CREATE INDEX IF NOT EXISTS idx_user_shops_has_custom_css
  ON user_shops ((custom_css IS NOT NULL AND custom_css != ''))
  WHERE is_active = true;
