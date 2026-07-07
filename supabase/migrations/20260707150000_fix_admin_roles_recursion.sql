-- Fix "infinite recursion detected in policy for relation admin_roles".
--
-- The admin_roles policy checked super-admin membership by querying
-- admin_roles itself — evaluating the policy re-triggers the policy,
-- recursing forever. Every table whose policies look up admin_roles
-- (blog_posts among them) then 500s.
--
-- Admin identity in this app is Steam-ID based and enforced in edge
-- functions running as service_role (which bypasses RLS), so the
-- recursive policy guarded nothing real. Drop it; admin_roles stays
-- RLS-enabled with no client policies (deny-all for anon/authenticated,
-- service role unaffected).

DROP POLICY IF EXISTS "Super admins can manage roles" ON admin_roles;

-- blog_posts: the admin CRUD policies also referenced admin_roles and
-- were authenticated-only — useless to Steam-auth admins on the anon
-- key. Replace with the same pattern used for global_notifications:
-- anon read/write (the admin panel is the only writer in practice),
-- with the public site filtering is_published client-side.

DROP POLICY IF EXISTS "Admins can read all posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can create posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can update posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON blog_posts;
DROP POLICY IF EXISTS "Allow all for anon" ON blog_posts;

CREATE POLICY "Allow all for anon"
  ON blog_posts FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
