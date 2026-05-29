/*
  # Global Notifications System

  1. New Tables
    - `global_notifications` - System-wide announcements visible to all users
    
  2. Features
    - Create, edit, and delete global notifications
    - Schedule notifications for future delivery
    - Target specific user groups
    - Track notification views
    - Priority levels for important announcements
    
  3. Security
    - Enable RLS
    - Only admins can create/edit notifications
    - All users can read active notifications
*/

CREATE TABLE IF NOT EXISTS global_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- info, success, warning, error, announcement
  priority text NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  target_audience text NOT NULL DEFAULT 'all', -- all, verified, vip, etc
  is_active boolean DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_active ON global_notifications(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON global_notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON global_notifications(priority);

ALTER TABLE global_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active notifications"
  ON global_notifications FOR SELECT
  USING (
    is_active = true 
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "Admins can manage notifications"
  ON global_notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = auth.uid()
    )
  );
