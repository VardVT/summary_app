import { useEffect, useMemo, useState } from 'react';
import { AppAccessLevel } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { isSupabaseConfigured, supabase } from '../../../services/supabase';
import { TrainingPermissions } from '../types';

function isLikelyJwt(token?: string | null): boolean {
  return Boolean(token && typeof token === 'string' && token.split('.').length === 3);
}

export function useTrainingPermissions(accessLevel: AppAccessLevel = 'edit'): TrainingPermissions {
  const { user, role, session, isDemoMode } = useAuth();
  const [verifiedSessionUserId, setVerifiedSessionUserId] = useState<string | null>(() =>
    !isDemoMode && isLikelyJwt(session?.access_token) && user?.id ? user.id : null,
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || isDemoMode) {
      setVerifiedSessionUserId(null);
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setVerifiedSessionUserId(data.session?.user?.id ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!cancelled) {
        setVerifiedSessionUserId(nextSession?.user?.id ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [isDemoMode, session?.access_token, user?.id]);

  return useMemo(() => {
    const hasRealSession = Boolean(verifiedSessionUserId && user && !isDemoMode);
    const isGuest = !hasRealSession || role === 'viewer';
    const isLeadOrAdmin = !isGuest && (role === 'lead' || role === 'admin');
    const isEngineerOrAbove = !isGuest && (role === 'engineer' || isLeadOrAdmin);

    return {
      role: isGuest ? 'viewer' : role,
      isGuest,
      hasRealSupabaseSession: hasRealSession,
      canEdit: isLeadOrAdmin && accessLevel !== 'view',
      canViewAllProgress: isLeadOrAdmin,
      canViewDocuments: isEngineerOrAbove,
      canSaveProgress: isEngineerOrAbove,
    };
  }, [verifiedSessionUserId, user, role, isDemoMode, accessLevel]);
}
