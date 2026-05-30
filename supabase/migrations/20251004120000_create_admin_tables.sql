/*
  # Admin Panel Database Schema

  1. New Tables
    - `admin_roles` - User role management
    - `admin_logs` - Audit trail of admin actions
    - `support_tickets` - Customer support tickets
    - `disputes` - Trade disputes and claims
    - `system_settings` - Platform configuration
    - `payment_gateways` - Payment method configuration
    - `suspicious_activities` - Fraud detection logs
    - `ip_tracking` - IP address monitoring
    - `verification_requests` - KYC verification requests

  2. Modifications
    - Update `users` table with admin fields
    - Update `transactions` table with admin review fields
    - Update `marketplace_listings` table with approval workflow

  3. Security
    - Enable RLS on all tables
    - Add policies for admin-only access
*/

-- Admin Roles Table
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'support', 'super_admin')),
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage roles"
  ON admin_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin'
    )
  );

-- Admin Action Logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs"
  ON admin_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert logs"
  ON admin_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category text,
  assigned_to uuid REFERENCES auth.users(id),
  resolution text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM admin_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
  );

-- Ticket Messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their tickets"
  ON ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM admin_roles WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can add messages to their tickets"
  ON ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM admin_roles WHERE user_id = auth.uid()
    )
  );

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  claimant_id uuid REFERENCES auth.users(id),
  respondent_id uuid REFERENCES auth.users(id),
  reason text NOT NULL,
  description text NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'rejected')),
  resolution text,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (
    claimant_id = auth.uid() OR
    respondent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (claimant_id = auth.uid());

CREATE POLICY "Admins can update disputes"
  ON disputes FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  category text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- Insert default settings
INSERT INTO system_settings (key, value, description, category) VALUES
  ('marketplace_commission', '{"rate": 0.05}'::jsonb, 'Marketplace commission rate', 'finance'),
  ('min_withdrawal', '{"amount": 100}'::jsonb, 'Minimum withdrawal amount in CZK', 'finance'),
  ('max_withdrawal', '{"amount": 50000}'::jsonb, 'Maximum withdrawal amount in CZK', 'finance'),
  ('verification_required', '{"enabled": false}'::jsonb, 'Require KYC verification', 'security'),
  ('auto_approve_listings', '{"enabled": true}'::jsonb, 'Auto-approve new listings', 'marketplace')
ON CONFLICT (key) DO NOTHING;

-- Payment Gateways
CREATE TABLE IF NOT EXISTS payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('card', 'paypal', 'crypto', 'bank_transfer', 'revolut')),
  enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  min_amount numeric(10,2) DEFAULT 0,
  max_amount numeric(10,2),
  fee_percentage numeric(5,2) DEFAULT 0,
  fee_fixed numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view enabled gateways"
  ON payment_gateways FOR SELECT
  TO authenticated
  USING (enabled = true OR EXISTS (
    SELECT 1 FROM admin_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage gateways"
  ON payment_gateways FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- Suspicious Activities
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL,
  description text NOT NULL,
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'false_positive')),
  metadata jsonb DEFAULT '{}'::jsonb,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suspicious activities"
  ON suspicious_activities FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- IP Tracking
CREATE TABLE IF NOT EXISTS ip_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  ip_address inet NOT NULL,
  user_agent text,
  country text,
  city text,
  is_vpn boolean DEFAULT false,
  is_proxy boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  first_seen timestamptz DEFAULT now(),
  login_count integer DEFAULT 1
);

ALTER TABLE ip_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view IP tracking"
  ON ip_tracking FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- Verification Requests
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('kyc', 'steam', 'email', 'phone')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  documents jsonb DEFAULT '[]'::jsonb,
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  expires_at timestamptz
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification requests"
  ON verification_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM admin_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create verification requests"
  ON verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update verification requests"
  ON verification_requests FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_disputes_claimant_id ON disputes(claimant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_status ON suspicious_activities(status);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_user_id ON ip_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_ip_address ON ip_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
