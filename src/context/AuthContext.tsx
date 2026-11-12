import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole, Capability } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export interface AuthContextType {
  user: UserProfile | null;
  session: any | null;
  role: UserRole;
  caps: Capability[];
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setDemoRole: (role: UserRole) => void;
  setUserDirectly: (user: UserProfile) => void;
  loginAsViewer: () => void;
}

const ROLE_CAPABILITIES: Record<UserRole, Capability[]> = {
  admin: [
    'manage_apps',
    'edit_data',
    'view_drawings',
    'export_reports',
    'edit_line_list',
    'view_mto',
    'approve_transmittals',
    'manage_projects',
  ],
  lead: [
    'edit_data',
    'view_drawings',
    'export_reports',
    'edit_line_list',
    'view_mto',
    'approve_transmittals',
  ],
  engineer: [
    'view_drawings',
    'edit_line_list',
    'view_mto',
    'export_reports',
  ],
  viewer: [
    'view_drawings',
    'view_mto',
  ],
};

export const DEFAULT_DIRECTORY_USERS: UserProfile[] = [
  {
    id: 'viewer-guest-id',
    email: 'viewer@vard.com',
    name: 'Guest Viewer',
    role: 'viewer',
    department: 'VARD Inspection',
    section: 'Project Viewer',
    positionTitle: 'Viewer',
  },
];

const DEFAULT_DEMO_USERS: Record<UserRole, UserProfile> = {
  admin: DEFAULT_DIRECTORY_USERS[0],
  lead: DEFAULT_DIRECTORY_USERS[0],
  engineer: DEFAULT_DIRECTORY_USERS[0],
  viewer: DEFAULT_DIRECTORY_USERS[0],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole>('lead');
  const [loading, setLoading] = useState<boolean>(true);
  const isDemoMode = !isSupabaseConfigured;

  // Initialize Auth state
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const loadProfileForUser = async (authUser: any) => {
        // 1. Try to match from built-in directory first (most reliable)
        const dirEntry = DEFAULT_DIRECTORY_USERS.find(
          u => u.id === authUser.id || u.email.toLowerCase() === (authUser.email || '').toLowerCase()
        );

        let derivedRole: UserRole = dirEntry?.role || (authUser.user_metadata?.role as UserRole) || 'engineer';
        let userName = dirEntry?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'VARD Engineer';
        let dept = dirEntry?.department || authUser.user_metadata?.department || 'VARD Piping Design';
        let sec = dirEntry?.section || authUser.user_metadata?.section || 'Piping Section';
        let empId: string | undefined = dirEntry?.employeeId;
        let posTitle: string | undefined = dirEntry?.positionTitle;
        let avatar = authUser.user_metadata?.avatar_url;

        try {
          // As an authenticated user, profiles_select_authenticated policy allows reading profiles
          const { data: profile } = await supabase!
            .from('profiles')
            .select('*')
            .or(`id.eq.${authUser.id},email.eq.${authUser.email}`)
            .limit(1)
            .maybeSingle();

          if (profile) {
            userName = profile.display_name || profile.name || profile.full_name || userName;

            // Determine role from profile - check explicit role field first, then position keywords
            const rawPos = (profile.position || '').toString().toLowerCase();
            const rawRole = (profile.role || '').toString().toLowerCase();

            if (['admin', 'lead', 'engineer', 'viewer'].includes(rawRole)) {
              // Trust explicit role field in profiles table
              derivedRole = rawRole as UserRole;
            } else if (rawPos.includes('admin')) {
              derivedRole = 'admin';
            } else if (rawPos.includes('manager') || rawPos.includes('lead') || rawPos.includes('senior') || rawPos.includes('chief')) {
              derivedRole = 'lead';
            } else if (rawPos.includes('viewer') || rawPos.includes('inspect')) {
              derivedRole = 'viewer';
            }
            // If still can't determine from profile, keep the dirEntry role (already set above)

            dept = profile.department || dept;
            sec = profile.section || (profile.position ? `VARD ${profile.position}` : sec);
            empId = profile.employee_id ? String(profile.employee_id) : empId;
            posTitle = profile.position || posTitle;
            avatar = profile.avatar_url || avatar;
          }
        } catch (err) {
          console.warn('Could not load profile from profiles table:', err);
        }

        setRole(derivedRole);
        setUser({
          id: authUser.id,
          email: authUser.email || 'engineer@vard.com',
          name: userName,
          role: derivedRole,
          department: dept,
          section: sec,
          employeeId: empId,
          positionTitle: posTitle,
          avatarUrl: avatar,
        });
      };

      // Get initial session from Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          loadProfileForUser(session.user);
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session?.user) {
          loadProfileForUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Demo Mode Initial State: check localStorage for saved profile or role
      const isLoggedOut = localStorage.getItem('piping_shell_logged_out') === 'true';

      if (!isLoggedOut) {
        const savedProfileStr = localStorage.getItem('piping_shell_user_profile');
        if (savedProfileStr) {
          try {
            const parsed = JSON.parse(savedProfileStr) as UserProfile;
            if (parsed && parsed.email) {
              setRole(parsed.role || 'lead');
              setUser(parsed);
              setSession({ access_token: `token_${parsed.id}_demo`, refresh_token: 'demo_refresh_67890' });
              setLoading(false);
              return;
            }
          } catch {
            // fallback to default demo users
          }
        }
        const savedDemoRole = (localStorage.getItem('piping_shell_demo_role') as UserRole) || 'lead';
        const demoUser = DEFAULT_DEMO_USERS[savedDemoRole] || DEFAULT_DEMO_USERS.lead;
        setRole(demoUser.role);
        setUser(demoUser);
        setSession({ access_token: 'demo_token_12345', refresh_token: 'demo_refresh_67890' });
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    }
  }, [isDemoMode]);

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } else {
      // Demo mode sign in logic
      localStorage.removeItem('piping_shell_logged_out');
      let targetRole: UserRole = 'lead';
      const cleanEmail = email.toLowerCase().trim();

      if (cleanEmail.includes('admin')) targetRole = 'admin';
      else if (cleanEmail.includes('lead')) targetRole = 'lead';
      else if (cleanEmail.includes('viewer') || cleanEmail.includes('inspect')) targetRole = 'viewer';
      else targetRole = 'engineer';

      const demoUser = DEFAULT_DEMO_USERS[targetRole];
      setRole(targetRole);
      setUser(demoUser);
      setSession({ access_token: `demo_token_${Date.now()}`, refresh_token: 'demo_refresh' });
      localStorage.setItem('piping_shell_demo_role', targetRole);
      return { error: null };
    }
  };

  const signUp = async (email: string, password: string, name?: string, newRole: UserRole = 'engineer') => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || email.split('@')[0],
            role: newRole,
            department: 'Piping Design Dept.',
            section: 'Piping Section',
          },
        },
      });
      return { error: error ? new Error(error.message) : null };
    } else {
      // Demo mode sign up
      localStorage.removeItem('piping_shell_logged_out');
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        role: newRole,
        department: 'Piping Design Dept.',
        section: 'Piping Engineering',
      };
      setRole(newRole);
      setUser(newUser);
      setSession({ access_token: `demo_token_${Date.now()}`, refresh_token: 'demo_refresh' });
      localStorage.setItem('piping_shell_demo_role', newRole);
      return { error: null };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    localStorage.removeItem('piping_shell_user_profile');
    localStorage.setItem('piping_shell_logged_out', 'true');
  };

  const setDemoRole = (newRole: UserRole) => {
    const demoUser = DEFAULT_DEMO_USERS[newRole];
    setRole(newRole);
    setUser(demoUser);
    setSession({ access_token: `demo_token_${Date.now()}`, refresh_token: 'demo_refresh' });
    localStorage.removeItem('piping_shell_logged_out');
    localStorage.setItem('piping_shell_demo_role', newRole);
    localStorage.setItem('piping_shell_user_profile', JSON.stringify(demoUser));
  };

  const setUserDirectly = (targetUser: UserProfile) => {
    setRole(targetUser.role);
    setUser(targetUser);
    setSession({ access_token: `token_${targetUser.id}_${Date.now()}`, refresh_token: 'demo_refresh' });
    localStorage.removeItem('piping_shell_logged_out');
    localStorage.setItem('piping_shell_demo_role', targetUser.role);
    localStorage.setItem('piping_shell_user_profile', JSON.stringify(targetUser));
  };

  const loginAsViewer = () => {
    const viewerUser: UserProfile = {
      id: 'viewer-guest-id',
      email: 'viewer@vard.com',
      name: 'Guest Viewer (Không cần mật khẩu)',
      role: 'viewer',
      department: 'VARD Inspection',
      section: 'Project Viewer',
      positionTitle: 'Viewer',
    };
    setRole('viewer');
    setUser(viewerUser);
    setSession({ access_token: `token_viewer_${Date.now()}`, refresh_token: 'demo_refresh' });
    localStorage.removeItem('piping_shell_logged_out');
    localStorage.setItem('piping_shell_demo_role', 'viewer');
    localStorage.setItem('piping_shell_user_profile', JSON.stringify(viewerUser));
  };

  const caps = ROLE_CAPABILITIES[role] || [];

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        caps,
        loading,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        setDemoRole,
        setUserDirectly,
        loginAsViewer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
