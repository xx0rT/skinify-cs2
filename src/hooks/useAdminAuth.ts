import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

interface AdminAuth {
  isAdmin: boolean;
  role: string | null;
  permissions: string[];
  loading: boolean;
  error: string | null;
  checkAdmin: () => Promise<void>;
}

// Encoded admin Steam IDs (Base64 encoded for basic obfuscation)
const ENCODED_ADMIN_IDS = [
  'NzY1NjExOTgwMjE3MjM2NDA=', // 76561198021723640
  'NzY1NjExOTgxNTY5ODUzNTQ=', // 76561198156985354
];

// Decode and check if Steam ID is an admin
const isAdminSteamId = (steamId: string): boolean => {
  try {
    return ENCODED_ADMIN_IDS.some(encodedId => {
      const decoded = atob(encodedId);
      return decoded === steamId;
    });
  } catch (error) {
    console.error('[useAdminAuth] Error decoding admin IDs:', error);
    return false;
  }
};

export const useAdminAuth = (): AdminAuth => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const checkAdmin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if Steam user exists in authStore
      if (!user) {
        console.log('[useAdminAuth] No Steam user logged in');
        setIsAdmin(false);
        setRole(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      console.log('[useAdminAuth] Checking admin status for Steam user:', user.displayName, user.steamId);

      // Check if Steam ID matches any encoded admin IDs
      const adminCheck = isAdminSteamId(user.steamId);

      if (adminCheck) {
        console.log('[useAdminAuth] ✅ Admin verified via Steam ID!');
        setIsAdmin(true);
        setRole('super_admin');
        setPermissions(['all']);
      } else {
        console.log('[useAdminAuth] ❌ User is not an admin');
        setIsAdmin(false);
        setRole(null);
        setPermissions([]);
      }
    } catch (err) {
      console.error('[useAdminAuth] ❌ Error checking admin status:', err);
      setIsAdmin(false);
      setRole(null);
      setPermissions([]);
      setError('Error verifying admin status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[useAdminAuth] useEffect triggered, Steam user:', user?.displayName);
    checkAdmin();
  }, [user?.steamId]);

  return {
    isAdmin,
    role,
    permissions,
    loading,
    error,
    checkAdmin,
  };
};

export default useAdminAuth;
