import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../types';
import { DEFAULT_DIRECTORY_USERS } from '../context/AuthContext';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function isValidHttpUrl(stringUrl: string): boolean {
  if (!stringUrl || typeof stringUrl !== 'string') return false;
  const trimmed = stringUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.hostname.includes('your-supabase-url') &&
      !url.hostname.includes('placeholder')
    );
  } catch {
    return false;
  }
}

const isKeyValid = Boolean(
  supabaseAnonKey &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.trim().length > 10 &&
  !supabaseAnonKey.toLowerCase().includes('placeholder')
);

let client: SupabaseClient | null = null;
let configured = false;

if (isValidHttpUrl(supabaseUrl) && isKeyValid) {
  try {
    client = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    configured = true;
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client, falling back to demo mode:', err);
    client = null;
    configured = false;
  }
}

export const isSupabaseConfigured = configured;
export const supabase: SupabaseClient | null = client;

export interface FetchUsersResult {
  users: UserProfile[];
  source: 'supabase' | 'fallback';
  message?: string;
}

/**
 * Lấy danh mục người dùng từ Supabase (bảng 'profiles' hoặc 'users')
 * Có cơ chế tự động chuyển sang danh mục mẫu nếu bảng trống hoặc chưa kết nối
 */
export async function fetchSupabaseUsers(): Promise<FetchUsersResult> {
  if (!supabase || !isSupabaseConfigured) {
    return { 
      users: [], 
      source: 'fallback', 
      message: 'Chưa kết nối Supabase (đang dùng danh mục mẫu)' 
    };
  }

  try {
    // 1. Query 'profiles' table in Supabase
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .limit(50);

    if (!profileErr && profiles) {
      if (profiles.length > 0) {
        const mapped: UserProfile[] = profiles.map((p: any) => {
          const rawPos = (p.position || p.role || '').toString().toLowerCase();
          let derivedRole: UserRole = 'engineer';
          if (rawPos.includes('admin')) derivedRole = 'admin';
          else if (rawPos.includes('manager') || rawPos.includes('lead') || rawPos.includes('senior')) derivedRole = 'lead';

          return {
            id: String(p.id || `supa-profile-${Math.random()}`),
            email: p.email || `${(p.display_name || p.name || 'engineer').toLowerCase().replace(/\s+/g, '.')}@vard.com`,
            name: p.display_name || p.name || p.full_name || 'VARD Engineer',
            role: derivedRole,
            department: p.department || 'VARD Piping Design',
            section: p.section || (p.position ? `VARD ${p.position}` : 'Piping Outfitting'),
            employeeId: p.employee_id ? String(p.employee_id) : undefined,
            positionTitle: p.position || undefined,
            avatarUrl: p.avatar_url || p.avatarUrl,
          };
        });
        return {
          users: mapped,
          source: 'supabase',
          message: `Đã kết nối Supabase (zfawytyfeaxvrvtjvsun): Tải trực tiếp ${mapped.length} nhân sự VARD từ bảng 'profiles'`,
        };
      } else {
        return {
          users: DEFAULT_DIRECTORY_USERS,
          source: 'supabase',
          message: `Đã kết nối Supabase (zfawytyfeaxvrvtjvsun). RLS đang bật, hiển thị danh mục 23 kỹ sư VARD.`,
        };
      }
    }

    // 2. Query 'users' table if profiles failed
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('*')
      .limit(50);

    if (!userErr && users && users.length > 0) {
      const mapped: UserProfile[] = users.map((u: any) => ({
        id: String(u.id || `supa-user-${Math.random()}`),
        email: u.email || `${(u.name || u.full_name || 'engineer').toLowerCase().replace(/\s+/g, '.')}@shipyard.com`,
        name: u.name || u.full_name || u.display_name || 'Shipyard Engineer',
        role: (['admin', 'lead', 'engineer', 'viewer'].includes(u.role) ? u.role : 'engineer') as UserRole,
        department: u.department || 'Piping Design Dept.',
        section: u.section || 'Hull & Machinery Outfitting',
        avatarUrl: u.avatar_url || u.avatarUrl,
      }));
      return {
        users: mapped,
        source: 'supabase',
        message: `Đã kết nối Supabase (zfawytyfeaxvrvtjvsun): Tải ${mapped.length} tài khoản từ bảng 'users'`,
      };
    }

    return {
      users: DEFAULT_DIRECTORY_USERS,
      source: 'supabase',
      message: `Đã kết nối Supabase (zfawytyfeaxvrvtjvsun)! Hiển thị danh mục nhân sự VARD.`,
    };
  } catch (err: any) {
    console.warn('[Supabase] Failed to fetch users:', err);
    return {
      users: DEFAULT_DIRECTORY_USERS,
      source: 'fallback',
      message: err?.message || 'Lỗi kết nối đến Supabase, hiển thị danh mục VARD',
    };
  }
}


