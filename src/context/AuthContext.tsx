import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole, Capability } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getStoredOverrideForUser, TEAM_UPDATED_EVENT } from '../services/teamDirectoryService';

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
    'manage_users',
    'manage_app_permissions',
    'edit_data',
    'view_drawings',
    'export_reports',
    'edit_line_list',
    'view_mto',
    'approve_transmittals',
    'manage_projects',
  ],
  lead: [
    'manage_users',
    'manage_app_permissions',
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

function mergeUserOverrides(profileUser: UserProfile): UserProfile {
  const stored = getStoredOverrideForUser(profileUser.id, profileUser.email);
  return {
    ...profileUser,
    canManageAppPermissions:
      typeof stored?.canManageAppPermissions === 'boolean'
        ? stored.canManageAppPermissions
        : typeof profileUser.canManageAppPermissions === 'boolean'
        ? profileUser.canManageAppPermissions
        : profileUser.role === 'admin' || profileUser.role === 'lead',
    appPermissions: stored?.appPermissions ?? profileUser.appPermissions ?? {},
  };
}

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
  {
    id: 'b053d95e-4e81-41de-be4e-f61763c7dd5d',
    email: 'phan.trong.khoi@vard.com',
    name: 'Phan Trọng Khôi',
    role: 'admin',
    department: 'VARD Engineering Center',
    section: 'Chief Piping Architect',
    employeeId: '4614',
    positionTitle: 'Admin',
  },
  {
    id: 'aa997a89-2199-478f-b413-fbf9f43f0cb2',
    email: 'nguyen.tran.hung@vard.com',
    name: 'Nguyễn Trần Hưng',
    role: 'lead',
    department: 'VARD Engineering Center',
    section: 'Piping Department Manager',
    employeeId: '2107',
    positionTitle: 'Manager',
  },
  {
    id: '0bd01893-c952-402b-a28a-6869b2dca971',
    email: 'nguyen.van.huy@vard.com',
    name: 'Nguyễn Văn Huy',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Piping Detailer',
    employeeId: '2995',
    positionTitle: 'Engineer',
  },
  {
    id: '0c2e07dd-7769-4f43-b36b-e6669910d65b',
    email: 'ngo.thinh.duy@vard.com',
    name: 'Ngô Thịnh Duy',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Offshore Piping Specialist',
    employeeId: '8000',
    positionTitle: 'Engineer',
  },
  {
    id: '24616a5c-f95b-423e-8f0c-eb1d81f14ae4',
    email: 'lam.thi.thuy.trang@vard.com',
    name: 'Lâm Thị Thúy Trang',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Line List & Spool Specialist',
    employeeId: '4006',
    positionTitle: 'Engineer',
  },
  {
    id: '3190ee0e-61e4-4fa2-aada-e0e0a51c9ae8',
    email: 'pham.le.thanh.an@vard.com',
    name: 'Phạm Lê Thành An',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Piping Layout Engineer',
    employeeId: '8000',
    positionTitle: 'Engineer',
  },
  {
    id: '403693b3-e903-4626-a47b-1c5c062db20b',
    email: 'hoang.manh.thang@vard.com',
    name: 'Hoàng Mạnh Thắng',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'HVAC & Piping Detailer',
    employeeId: '4426',
    positionTitle: 'Engineer',
  },
  {
    id: '4d9e92b5-6313-4650-803b-ba2d7eaae8ee',
    email: 'tran.van.chuyen@vard.com',
    name: 'Trần Văn Chuyển',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Iso Drawing & Spool Specialist',
    employeeId: '2742',
    positionTitle: 'Engineer',
  },
  {
    id: '4f4bba55-4030-4375-a187-84e1b0cd93a5',
    email: 'nguyen.dong.hop@vard.com',
    name: 'Nguyễn Đồng Hợp',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Offshore Outfitting Detailer',
    employeeId: '3750',
    positionTitle: 'Engineer',
  },
  {
    id: '6bef59d0-a174-44a0-a648-db531c3905cf',
    email: 'nguyen.danh.duy@vard.com',
    name: 'Nguyễn Danh Duy',
    role: 'lead',
    department: 'VARD Piping Design',
    section: 'Senior Piping Engineer',
    employeeId: '2511',
    positionTitle: 'Senior',
  },
  {
    id: '6e26a2e1-0de0-4fff-a416-73d845e2e8e0',
    email: 'dang.duy.hoang@vard.com',
    name: 'Đặng Duy Hoàng',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Pipe Support Specialist',
    employeeId: '4256',
    positionTitle: 'Engineer',
  },
  {
    id: '99b866db-398b-4226-a5e0-0c33a2e269ea',
    email: 'nguyen.huy.thinh@vard.com',
    name: 'Nguyễn Huy Thịnh',
    role: 'lead',
    department: 'VARD Piping Design',
    section: 'Senior Outfitting Specialist',
    employeeId: '2524',
    positionTitle: 'Senior',
  },
  {
    id: 'a9c35b98-2c48-483f-8b36-7c087966efad',
    email: 'tran.duc.huy@vard.com',
    name: 'Trần Đức Huy',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: '3D Routing & Clash Specialist',
    employeeId: '4378',
    positionTitle: 'Engineer',
  },
  {
    id: 'ad72c550-246e-460c-8827-a9a3f2c57a79',
    email: 'to.my.bon@vard.com',
    name: 'Tô Mỹ Bổn',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Materials & MTO Engineer',
    employeeId: '3809',
    positionTitle: 'Engineer',
  },
  {
    id: 'bc29c0f3-da2d-4e0e-a246-13d8fa1bb74c',
    email: 'nguyen.van.thao@vard.com',
    name: 'Nguyễn Văn Thảo',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Machinery Piping Detailer',
    employeeId: '3436',
    positionTitle: 'Engineer',
  },
  {
    id: 'bedfeb59-091f-4090-a0b7-79e51c8ca9a6',
    email: 'nguyen.ba.xuan.ky@vard.com',
    name: 'Nguyễn Bá Xuân Kỳ',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Pipe Stress Analysis',
    employeeId: '8000',
    positionTitle: 'Engineer',
  },
  {
    id: 'bf34025b-ab93-45e1-8373-bd7a78ef3fbf',
    email: 'tran.nguyen.phuoc@vard.com',
    name: 'Trần Nguyễn Phước',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'P&ID & System Diagrams',
    employeeId: '4551',
    positionTitle: 'Engineer',
  },
  {
    id: 'c786b196-0f85-4392-b37e-30678d2b2ec7',
    email: 'tran.quoc@vard.com',
    name: 'Trần Quốc',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Outfitting & Spooling',
    employeeId: '2861',
    positionTitle: 'Engineer',
  },
  {
    id: 'c96b6410-2c9c-4cf7-88c0-d667c4fa10ca',
    email: 'ho.thanh.tuat@vard.com',
    name: 'Hồ Thanh Tuất',
    role: 'lead',
    department: 'VARD Piping Design',
    section: 'Senior Outfitting Lead',
    employeeId: '2698',
    positionTitle: 'Senior',
  },
  {
    id: 'cfbdaef4-aea0-4974-b76b-95292eb6bf1e',
    email: 'le.chau@vard.com',
    name: 'Lê Châu',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Valves & Fittings Specialist',
    employeeId: '2982',
    positionTitle: 'Engineer',
  },
  {
    id: 'da986daa-b3fc-4739-bcc8-f076c8bb8ef8',
    email: 'nguyen.hung.phat@vard.com',
    name: 'Nguyễn Hưng Phát',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Offshore Piping Outfitting',
    employeeId: '8000',
    positionTitle: 'Engineer',
  },
  {
    id: 'e86f0c28-6792-4252-84c6-b09e25d2d1d0',
    email: 'nguyen.van.anh@vard.com',
    name: 'Nguyễn Văn Ánh',
    role: 'lead',
    department: 'VARD Piping Design',
    section: 'Senior Piping Detailer',
    employeeId: '2313',
    positionTitle: 'Senior',
  },
  {
    id: 'fb8dbe88-d157-4791-b7cc-154dfdddbdd0',
    email: 'tran.thi.ngoc.bich@vard.com',
    name: 'Trần Thị Ngọc Bích',
    role: 'engineer',
    department: 'VARD Piping Design',
    section: 'Piping Document Controller',
    employeeId: '4455',
    positionTitle: 'Engineer',
  },
];

const DEFAULT_DEMO_USERS: Record<UserRole, UserProfile> = {
  admin: DEFAULT_DIRECTORY_USERS[1],
  lead: DEFAULT_DIRECTORY_USERS[2],
  engineer: DEFAULT_DIRECTORY_USERS[3],
  viewer: DEFAULT_DIRECTORY_USERS[0],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole>('viewer');
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

        let remoteAppPermissions = dirEntry?.appPermissions;
        let remoteCanManagePerms = dirEntry?.canManageAppPermissions;

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
            if (profile.app_permissions && typeof profile.app_permissions === 'object') {
              remoteAppPermissions = profile.app_permissions;
            }
            if (typeof profile.can_manage_app_permissions === 'boolean') {
              remoteCanManagePerms = profile.can_manage_app_permissions;
            }
          }
        } catch (err) {
          console.warn('Could not load profile from profiles table:', err);
        }

        setRole(derivedRole);
        setUser(
          mergeUserOverrides({
            id: authUser.id,
            email: authUser.email || 'engineer@vard.com',
            name: userName,
            role: derivedRole,
            department: dept,
            section: sec,
            employeeId: empId,
            positionTitle: posTitle,
            avatarUrl: avatar,
            appPermissions: remoteAppPermissions,
            canManageAppPermissions: remoteCanManagePerms,
          }),
        );
      };

      // Get initial session from Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          loadProfileForUser(session.user);
        } else {
          setUser(null);
          setRole('viewer');
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session?.user) {
          loadProfileForUser(session.user);
        } else {
          setUser(null);
          setRole('viewer');
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
              const merged = mergeUserOverrides(parsed);
              setRole(merged.role || 'lead');
              setUser(merged);
              setSession({ access_token: `token_${merged.id}_demo`, refresh_token: 'demo_refresh_67890' });
              setLoading(false);
              return;
            }
          } catch {
            // fallback to default demo users
          }
        }
        const savedDemoRole = (localStorage.getItem('piping_shell_demo_role') as UserRole) || 'lead';
        const demoUser = mergeUserOverrides(DEFAULT_DEMO_USERS[savedDemoRole] || DEFAULT_DEMO_USERS.lead);
        setRole(demoUser.role);
        setUser(demoUser);
        setSession({ access_token: 'demo_token_12345', refresh_token: 'demo_refresh_67890' });
      } else {
        setUser(null);
        setSession(null);
        setRole('viewer');
      }
      setLoading(false);
    }
  }, [isDemoMode]);

  // Keep current user's permission overrides synchronized when directory/permissions change
  useEffect(() => {
    const syncPermissions = () => {
      setUser(prev => {
        if (!prev) return prev;
        const next = mergeUserOverrides(prev);
        if (isDemoMode) {
          try {
            localStorage.setItem('piping_shell_user_profile', JSON.stringify(next));
          } catch {
            // ignore quota errors
          }
        }
        return next;
      });
    };
    window.addEventListener(TEAM_UPDATED_EVENT, syncPermissions);
    return () => window.removeEventListener(TEAM_UPDATED_EVENT, syncPermissions);
  }, [isDemoMode]);

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: new Error(error.message) };
      if (data?.user?.id) {
        const { data: p } = await supabase
          .from('profiles')
          .select('app_access')
          .eq('id', data.user.id)
          .maybeSingle();
        if (p && p.app_access === false) {
          await supabase.auth.signOut();
          return { error: new Error('Tài khoản của bạn đã bị khóa quyền truy cập. Vui lòng liên hệ Lead hoặc Admin.') };
        }
      }
      return { error: null };
    } else {
      // Demo mode sign in logic: check persisted local directory first
      const cleanEmail = email.toLowerCase().trim();
      try {
        const rawDir = localStorage.getItem('piping_shell_team_directory_v1');
        if (rawDir) {
          const parsedDir = JSON.parse(rawDir);
          if (Array.isArray(parsedDir)) {
            const matched = parsedDir.find((m: any) => String(m.email || '').toLowerCase().trim() === cleanEmail);
            if (matched) {
              if (matched.appAccess === false) {
                return { error: new Error('Tài khoản này đã bị tắt quyền truy cập (Access Off). Liên hệ Lead hoặc Admin để mở lại.') };
              }
              const targetRole: UserRole = (['admin', 'lead', 'engineer', 'viewer'].includes(matched.role) ? matched.role : 'engineer');
              const profileUser: UserProfile = mergeUserOverrides({
                id: matched.id,
                email: matched.email,
                name: matched.displayName || matched.name || matched.email,
                role: targetRole,
                department: matched.department || 'VARD Piping Design',
                section: matched.section || `VARD ${matched.position || targetRole}`,
                employeeId: matched.employeeId || undefined,
                positionTitle: matched.position || undefined,
                avatarUrl: matched.avatarUrl || undefined,
                themeColor: matched.themeColor || undefined,
                appAccess: true,
                canManageAppPermissions: matched.canManageAppPermissions,
                appPermissions: matched.appPermissions,
              });
              localStorage.removeItem('piping_shell_logged_out');
              setRole(targetRole);
              setUser(profileUser);
              setSession({ access_token: `demo_token_${Date.now()}`, refresh_token: 'demo_refresh' });
              localStorage.setItem('piping_shell_demo_role', targetRole);
              localStorage.setItem('piping_shell_user_profile', JSON.stringify(profileUser));
              return { error: null };
            }
          }
        }
      } catch {
        // fallback below
      }

      localStorage.removeItem('piping_shell_logged_out');
      let targetRole: UserRole = 'lead';

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
    setRole('viewer');
    localStorage.removeItem('piping_shell_user_profile');
    localStorage.setItem('piping_shell_logged_out', 'true');
  };

  const setDemoRole = (newRole: UserRole) => {
    const demoUser = mergeUserOverrides(DEFAULT_DEMO_USERS[newRole]);
    setRole(newRole);
    setUser(demoUser);
    setSession({ access_token: `demo_token_${Date.now()}`, refresh_token: 'demo_refresh' });
    localStorage.removeItem('piping_shell_logged_out');
    localStorage.setItem('piping_shell_demo_role', newRole);
    localStorage.setItem('piping_shell_user_profile', JSON.stringify(demoUser));
  };

  const setUserDirectly = (targetUser: UserProfile) => {
    const mergedUser = mergeUserOverrides(targetUser);
    setRole(mergedUser.role);
    setUser(mergedUser);
    setSession({ access_token: `token_${mergedUser.id}_${Date.now()}`, refresh_token: 'demo_refresh' });
    localStorage.removeItem('piping_shell_logged_out');
    localStorage.setItem('piping_shell_demo_role', mergedUser.role);
    localStorage.setItem('piping_shell_user_profile', JSON.stringify(mergedUser));
  };

  const loginAsViewer = () => {
    const viewerUser = mergeUserOverrides({
      id: 'viewer-guest-id',
      email: 'viewer@vard.com',
      name: 'Guest Viewer (Không cần mật khẩu)',
      role: 'viewer',
      department: 'VARD Inspection',
      section: 'Project Viewer',
      positionTitle: 'Viewer',
    });
    setRole('viewer');
    setUser(viewerUser);
    setSession({ access_token: `token_viewer_${Date.now()}`, refresh_token: 'demo_refresh' });
    localStorage.removeItem('piping_shell_logged_out');
    localStorage.setItem('piping_shell_demo_role', 'viewer');
    localStorage.setItem('piping_shell_user_profile', JSON.stringify(viewerUser));
  };

  const baseCaps = user ? ROLE_CAPABILITIES[role] || [] : [];
  const hasPermManager = Boolean(
    user &&
      (typeof user.canManageAppPermissions === 'boolean'
        ? user.canManageAppPermissions
        : baseCaps.includes('manage_app_permissions')),
  );
  const caps: Capability[] = user
    ? hasPermManager
      ? Array.from(new Set([...baseCaps, 'manage_app_permissions']))
      : baseCaps.filter(c => c !== 'manage_app_permissions')
    : [];

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
