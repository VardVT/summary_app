import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Project, UserProfile, UserRole, VesselGroupProgress } from '../types';
import { DEFAULT_DIRECTORY_USERS } from '../context/AuthContext';

const DEFAULT_VESSEL_DB_URL = 'https://zfawytyfeaxvrvtjvsun.supabase.co';
const DEFAULT_VESSEL_DB_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYXd5dHlmZWF4dnJ2dGp2c3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTM0MjUsImV4cCI6MjA5OTg2OTQyNX0.HmhPEmHT5eaWcCRW9Z4Ii5bUlWN3cLUNDs8DZ3le5Bs';

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
      message: 'Chưa kết nối Supabase (đang dùng danh mục nội bộ)' 
    };
  }

  try {
    // 1. Query 'profiles' table in Supabase
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .limit(100);

    if (!profileErr && profiles) {
      if (profiles.length > 0) {
        const mapped: UserProfile[] = profiles.map((p: any) => {
          const rawPos = (p.position || p.role || '').toString().toLowerCase();
          let derivedRole: UserRole = 'engineer';
          if (rawPos.includes('admin')) derivedRole = 'admin';
          else if (rawPos.includes('manager') || rawPos.includes('lead') || rawPos.includes('senior')) derivedRole = 'lead';
          else if (rawPos.includes('viewer') || rawPos.includes('inspect')) derivedRole = 'viewer';

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
            themeColor: p.theme_color || undefined,
            appAccess: p.app_access !== false,
            canManageAppPermissions:
              typeof p.can_manage_app_permissions === 'boolean' ? p.can_manage_app_permissions : undefined,
            appPermissions:
              p.app_permissions && typeof p.app_permissions === 'object' ? p.app_permissions : undefined,
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
          message: `Đã kết nối Supabase (zfawytyfeaxvrvtjvsun). RLS đang bật, hiển thị danh mục nhân sự VARD.`,
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

export interface FetchVesselsResult {
  vessels: Project[];
  requiresAuth: boolean;
  error?: string;
}

const DEFAULT_GROUP_DENSITIES: Record<string, number> = {
  '3D drawing': 65,
  '2D drawing': 10,
  'Iso generating': 15,
  MTO: 10,
};

function normalizeVi(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase();
}

function getGroupFromSectionName(headerName: string): string | null {
  const n = normalizeVi(headerName);
  if (!n || n.includes('live comment')) return null;
  if (n.includes('checking') || n.includes('coordination') || n.includes('general')) return null;
  if (n === 'mto') return 'MTO';
  if (n.includes('iso')) return 'Iso generating';
  if (n.includes('2d')) return '2D drawing';
  if (n.includes('3d pipe drawing') || n.includes('3d drawing')) return '3D drawing';
  return null;
}

function computeVesselProgress(
  sections: Array<{ id: string; header_name: string }>,
  tasks: Array<{ section_id: string; percent_complete: number | null }>,
  groupWeights?: Record<string, unknown> | null,
): { overallProgress: number; totalTasks: number; groupProgress: VesselGroupProgress[] } {
  const densities: Record<string, number> = { ...DEFAULT_GROUP_DENSITIES };
  if (groupWeights && typeof groupWeights === 'object') {
    for (const key of Object.keys(densities)) {
      const n = Number(groupWeights[key]);
      if (Number.isFinite(n) && n >= 0) densities[key] = n;
    }
  }

  const groupStats: Record<string, { totalTasks: number; totalPercentSum: number }> = {
    '3D drawing': { totalTasks: 0, totalPercentSum: 0 },
    '2D drawing': { totalTasks: 0, totalPercentSum: 0 },
    'Iso generating': { totalTasks: 0, totalPercentSum: 0 },
    MTO: { totalTasks: 0, totalPercentSum: 0 },
  };

  const tasksBySection = new Map<string, Array<{ percent_complete: number | null }>>();
  for (const t of tasks) {
    if (!t.section_id) continue;
    const arr = tasksBySection.get(t.section_id);
    if (arr) arr.push(t);
    else tasksBySection.set(t.section_id, [t]);
  }

  for (const sec of sections) {
    const group = getGroupFromSectionName(sec.header_name);
    if (!group) continue;
    const secTasks = tasksBySection.get(sec.id) || [];
    if (secTasks.length === 0) continue;
    let sum = 0;
    for (const t of secTasks) {
      sum += Number(t.percent_complete) || 0;
    }
    groupStats[group].totalTasks += secTasks.length;
    groupStats[group].totalPercentSum += sum;
  }

  let weightedSum = 0;
  let totalDensity = 0;
  const labelMap: Record<string, string> = {
    '3D drawing': '3D Drawing',
    'Iso generating': 'ISO Generating',
    '2D drawing': '2D Drawing',
    MTO: 'MTO',
  };

  const orderedKeys = ['3D drawing', 'Iso generating', '2D drawing', 'MTO'];
  const groupProgress: VesselGroupProgress[] = orderedKeys.map(key => {
    const g = groupStats[key];
    const avgPercent = g.totalTasks > 0 ? Math.round(g.totalPercentSum / g.totalTasks) : 0;
    if (g.totalTasks > 0) {
      const density = densities[key];
      weightedSum += avgPercent * density;
      totalDensity += density;
    }
    return {
      name: labelMap[key] || key,
      avgPercent,
      total: g.totalTasks,
    };
  });

  const overallProgress = totalDensity > 0 ? Math.round(weightedSum / totalDensity) : 0;
  return { overallProgress, totalTasks: tasks.length, groupProgress };
}

function isLikelyJwt(token?: string | null): token is string {
  return Boolean(token && typeof token === 'string' && token.split('.').length === 3);
}

function findStoredSupabaseJwt(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const preferred = localStorage.getItem('sb-zfawytyfeaxvrvtjvsun-auth-token');
    const candidates: string[] = [];
    if (preferred) candidates.push(preferred);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.*-auth-token$/.test(k) && k !== 'sb-zfawytyfeaxvrvtjvsun-auth-token') {
        const val = localStorage.getItem(k);
        if (val) candidates.push(val);
      }
    }
    for (const raw of candidates) {
      try {
        const parsed = JSON.parse(raw);
        const token = parsed?.access_token || parsed?.currentSession?.access_token;
        if (isLikelyJwt(token)) return token;
      } catch {
        // ignore invalid json
      }
    }
  } catch {
    // ignore storage access errors
  }
  return null;
}

async function fetchRestPaged<T>(
  baseUrl: string,
  anonKey: string,
  authToken: string,
  pathWithQuery: string,
): Promise<{ data: T[]; error?: string }> {
  const PAGE = 1000;
  const all: T[] = [];
  for (let page = 0; page < 20; page++) {
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const res = await fetch(`${baseUrl}/rest/v1/${pathWithQuery}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${authToken}`,
        Range: `${from}-${to}`,
        'Range-Unit': 'items',
      },
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return { data: all, error: msg || `HTTP ${res.status}` };
    }
    const rows = (await res.json()) as T[];
    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return { data: all };
}

export async function fetchDatabaseVessels(sessionAccessToken?: string | null): Promise<FetchVesselsResult> {
  const dbUrl = (isValidHttpUrl(supabaseUrl) ? supabaseUrl : DEFAULT_VESSEL_DB_URL).trim().replace(/\/$/, '');
  const dbAnonKey = (isKeyValid ? supabaseAnonKey : DEFAULT_VESSEL_DB_ANON_KEY).trim();

  let jwtToken: string | null = isLikelyJwt(sessionAccessToken) ? sessionAccessToken : null;
  if (!jwtToken && supabase && isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getSession();
      if (isLikelyJwt(data.session?.access_token)) {
        jwtToken = data.session!.access_token;
      }
    } catch {
      // ignore
    }
  }
  if (!jwtToken) {
    jwtToken = findStoredSupabaseJwt();
  }

  try {
    let rawProjects: any[] = [];
    let rawSections: Array<{ id: string; header_name: string; project_id: string }> = [];
    let rawTasks: Array<{ project_id: string; section_id: string; percent_complete: number | null }> = [];

    if (supabase && isSupabaseConfigured && jwtToken) {
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('id, name, ship_id, department, status, start_date, end_date, created_at, group_weights')
        .order('created_at', { ascending: false });

      if (projErr) {
        return { vessels: [], requiresAuth: false, error: projErr.message };
      }
      rawProjects = projData || [];

      if (rawProjects.length > 0) {
        const { data: secData } = await supabase
          .from('sections')
          .select('id, header_name, project_id')
          .range(0, 4999);
        rawSections = (secData as any[]) || [];

        const PAGE = 1000;
        for (let page = 0; page < 20; page++) {
          const from = page * PAGE;
          const to = from + PAGE - 1;
          const { data: taskData, error: taskErr } = await supabase
            .from('tasks')
            .select('project_id, section_id, percent_complete')
            .order('id', { ascending: true })
            .range(from, to);
          if (taskErr || !taskData || taskData.length === 0) break;
          rawTasks.push(...(taskData as any[]));
          if (taskData.length < PAGE) break;
        }
      }
    } else {
      const authHeaderToken = jwtToken || dbAnonKey;
      const projRes = await fetchRestPaged<any>(
        dbUrl,
        dbAnonKey,
        authHeaderToken,
        'projects?select=id,name,ship_id,department,status,start_date,end_date,created_at,group_weights&order=created_at.desc',
      );
      if (projRes.error) {
        return { vessels: [], requiresAuth: !jwtToken, error: projRes.error };
      }
      rawProjects = projRes.data;

      if (rawProjects.length > 0) {
        const [secRes, taskRes] = await Promise.all([
          fetchRestPaged<{ id: string; header_name: string; project_id: string }>(
            dbUrl,
            dbAnonKey,
            authHeaderToken,
            'sections?select=id,header_name,project_id&order=sort_order.asc',
          ),
          fetchRestPaged<{ project_id: string; section_id: string; percent_complete: number | null }>(
            dbUrl,
            dbAnonKey,
            authHeaderToken,
            'tasks?select=project_id,section_id,percent_complete&order=id.asc',
          ),
        ]);
        rawSections = secRes.data || [];
        rawTasks = taskRes.data || [];
      }
    }

    const sectionsByProject = new Map<string, Array<{ id: string; header_name: string }>>();
    for (const s of rawSections) {
      const list = sectionsByProject.get(s.project_id);
      if (list) list.push(s);
      else sectionsByProject.set(s.project_id, [s]);
    }

    const tasksByProject = new Map<string, Array<{ section_id: string; percent_complete: number | null }>>();
    for (const t of rawTasks) {
      const list = tasksByProject.get(t.project_id);
      if (list) list.push(t);
      else tasksByProject.set(t.project_id, [t]);
    }

    const vessels: Project[] = rawProjects.map((p: any) => {
      const code = String(p.ship_id || p.name || 'VESSEL').trim();
      const rawName = String(p.name || '').trim();
      const dept = String(p.department || 'Piping').trim();
      const status = String(p.status || 'In Progress').trim();
      const displayName = rawName && rawName !== code ? rawName : `${dept} · ${status}`;

      const pSections = sectionsByProject.get(p.id) || [];
      const pTasks = tasksByProject.get(p.id) || [];
      const stats = computeVesselProgress(pSections, pTasks, p.group_weights);

      return {
        id: String(p.id),
        code,
        name: displayName,
        vesselType: `${dept} Engineering`,
        shipyard: `VARD · ${dept}`,
        dwtOrCapacity: [p.start_date, p.end_date].filter(Boolean).join(' → ') || status,
        progressPercentage: stats.overallProgress,
        activeSection: `${dept} Engineering`,
        status,
        department: dept,
        startDate: p.start_date || null,
        endDate: p.end_date || null,
        totalTasks: stats.totalTasks,
        groupProgress: stats.groupProgress,
      };
    });

    return {
      vessels,
      requiresAuth: !jwtToken && vessels.length === 0,
    };
  } catch (err: any) {
    console.warn('[Supabase] Failed to fetch vessels:', err);
    return {
      vessels: [],
      requiresAuth: !jwtToken,
      error: err?.message || 'Unable to load vessels from database',
    };
  }
}



