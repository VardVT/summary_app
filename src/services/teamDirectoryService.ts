import { AppAccessLevel, AppConfig, UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { DEFAULT_DIRECTORY_USERS } from '../context/AuthContext';

export const TEAM_DIRECTORY_STORAGE_KEY = 'piping_shell_team_directory_v1';
export const APP_PERMISSIONS_STORAGE_KEY = 'piping_shell_app_permissions_v1';
export const TEAM_UPDATED_EVENT = 'piping-team-updated';

export const TEAM_POSITIONS = ['Admin', 'Manager', 'Senior', 'Engineer', 'Viewer'] as const;
export type TeamPosition = (typeof TEAM_POSITIONS)[number] | string;

export interface StoredPermissionOverride {
  appPermissions: Record<string, AppAccessLevel>;
  canManageAppPermissions?: boolean;
}

export interface TeamMemberRecord {
  id: string;
  email: string;
  displayName: string;
  employeeId: string;
  position: string;
  role: UserRole;
  department: string;
  section: string;
  themeColor: string;
  avatarUrl: string | null;
  appAccess: boolean;
  canManageAppPermissions: boolean;
  appPermissions: Record<string, AppAccessLevel>;
}

export interface CreateTeamMemberInput {
  email: string;
  displayName: string;
  employeeId?: string;
  position: string;
  department?: string;
  section?: string;
  themeColor?: string;
}

export interface UpdateTeamMemberInput {
  displayName?: string;
  employeeId?: string;
  position?: string;
  department?: string;
  section?: string;
  themeColor?: string;
}

export function deriveRoleFromPosition(position?: string | null, explicitRole?: string | null): UserRole {
  const rawRole = String(explicitRole || '').trim().toLowerCase();
  if (rawRole === 'admin' || rawRole === 'lead' || rawRole === 'engineer' || rawRole === 'viewer') {
    return rawRole;
  }
  const rawPos = String(position || '').trim().toLowerCase();
  if (rawPos.includes('admin')) return 'admin';
  if (rawPos.includes('manager') || rawPos.includes('lead') || rawPos.includes('senior') || rawPos.includes('chief')) {
    return 'lead';
  }
  if (rawPos.includes('viewer') || rawPos.includes('inspect')) return 'viewer';
  return 'engineer';
}

export function getDefaultAppAccessForRole(role: UserRole, app: Pick<AppConfig, 'id' | 'requiredCap'>): AppAccessLevel {
  if (role === 'admin' || role === 'lead') {
    return 'edit';
  }
  if (role === 'engineer') {
    if (!app.requiredCap) return 'edit';
    if (
      app.requiredCap === 'view_drawings' ||
      app.requiredCap === 'edit_line_list' ||
      app.requiredCap === 'view_mto' ||
      app.requiredCap === 'export_reports'
    ) {
      return 'edit';
    }
    return 'ban';
  }
  // viewer
  if (!app.requiredCap || app.requiredCap === 'view_drawings' || app.requiredCap === 'view_mto') {
    return 'view';
  }
  return 'ban';
}

function readPermissionOverrideStore(): Record<string, StoredPermissionOverride> {
  try {
    const raw = localStorage.getItem(APP_PERMISSIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePermissionOverrideStore(store: Record<string, StoredPermissionOverride>) {
  try {
    localStorage.setItem(APP_PERMISSIONS_STORAGE_KEY, JSON.stringify(store));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TEAM_UPDATED_EVENT));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function getStoredOverrideForUser(id?: string, email?: string): StoredPermissionOverride | null {
  const store = readPermissionOverrideStore();
  if (id && store[id]) return store[id];
  if (email && store[email.toLowerCase().trim()]) return store[email.toLowerCase().trim()];
  return null;
}

export function resolveEffectiveAppAccess(
  user: UserProfile | null,
  role: UserRole,
  app: Pick<AppConfig, 'id' | 'requiredCap'>,
): AppAccessLevel {
  if (!user) {
    // Unauthenticated visitors cannot enter APP-09 or write/admin modules
    return getDefaultAppAccessForRole('viewer', app);
  }
  const stored = getStoredOverrideForUser(user.id, user.email);
  const storedOverride = stored?.appPermissions?.[app.id];
  if (storedOverride === 'edit' || storedOverride === 'view' || storedOverride === 'ban') {
    return storedOverride;
  }
  const directOverride = user.appPermissions?.[app.id];
  if (directOverride === 'edit' || directOverride === 'view' || directOverride === 'ban') {
    return directOverride;
  }
  if (app.id === 'team-settings' && getUserCanManageAppPermissions(user, role)) {
    return 'edit';
  }
  return getDefaultAppAccessForRole(role, app);
}

export function getUserCanManageAppPermissions(user: UserProfile | null, role: UserRole): boolean {
  if (!user) return false;
  if (typeof user.canManageAppPermissions === 'boolean') {
    return user.canManageAppPermissions;
  }
  const stored = getStoredOverrideForUser(user.id, user.email);
  if (typeof stored?.canManageAppPermissions === 'boolean') {
    return stored.canManageAppPermissions;
  }
  return role === 'admin' || role === 'lead';
}

function normalizePosition(pos?: string | null): string {
  const p = String(pos || '').trim();
  if (!p || p.toLowerCase().includes('design')) return 'Engineer';
  return p;
}

function userProfileToMember(u: UserProfile): TeamMemberRecord {
  const pos = normalizePosition(
    u.positionTitle || (u.role === 'admin' ? 'Admin' : u.role === 'lead' ? 'Manager' : u.role === 'viewer' ? 'Viewer' : 'Engineer'),
  );
  const role = deriveRoleFromPosition(pos, u.role);
  const stored = getStoredOverrideForUser(u.id, u.email);
  return {
    id: u.id,
    email: u.email,
    displayName: u.name,
    employeeId: u.employeeId || '',
    position: pos,
    role,
    department: u.department || 'VARD Piping Design',
    section: u.section || `VARD ${pos}`,
    themeColor: u.themeColor || '#2563EB',
    avatarUrl: u.avatarUrl || null,
    appAccess: u.appAccess !== false,
    canManageAppPermissions:
      typeof u.canManageAppPermissions === 'boolean'
        ? u.canManageAppPermissions
        : typeof stored?.canManageAppPermissions === 'boolean'
        ? stored.canManageAppPermissions
        : role === 'admin' || role === 'lead',
    appPermissions: u.appPermissions || stored?.appPermissions || {},
  };
}

export function memberToUserProfile(m: TeamMemberRecord): UserProfile {
  const role = deriveRoleFromPosition(m.position, m.role);
  return {
    id: m.id,
    email: m.email,
    name: m.displayName || m.email,
    role,
    avatarUrl: m.avatarUrl || undefined,
    department: m.department || 'VARD Piping Design',
    section: m.section || `VARD ${m.position}`,
    employeeId: m.employeeId || undefined,
    positionTitle: m.position,
    themeColor: m.themeColor,
    appAccess: m.appAccess,
    canManageAppPermissions: m.canManageAppPermissions,
    appPermissions: m.appPermissions,
  };
}

function sortMembers(list: TeamMemberRecord[]): TeamMemberRecord[] {
  return [...list].sort((a, b) => {
    const aId = a.employeeId.trim();
    const bId = b.employeeId.trim();
    if (aId && bId) return aId.localeCompare(bId, undefined, { numeric: true });
    if (aId) return -1;
    if (bId) return 1;
    return (a.displayName || a.email).localeCompare(b.displayName || b.email);
  });
}

export function getLocalTeamDirectory(): TeamMemberRecord[] {
  try {
    const raw = localStorage.getItem(TEAM_DIRECTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sortMembers(
          parsed.map((item: any) => {
            const pos = normalizePosition(item.position);
            const role = deriveRoleFromPosition(pos, item.role);
            const stored = getStoredOverrideForUser(item.id, item.email);
            return {
              id: String(item.id),
              email: String(item.email || ''),
              displayName: String(item.displayName || item.name || item.email || ''),
              employeeId: String(item.employeeId || ''),
              position: pos,
              role,
              department: String(item.department || 'VARD Piping Design'),
              section: String(item.section || 'Piping Engineering'),
              themeColor: String(item.themeColor || '#2563EB'),
              avatarUrl: item.avatarUrl || null,
              appAccess: item.appAccess !== false,
              canManageAppPermissions:
                typeof item.canManageAppPermissions === 'boolean'
                  ? item.canManageAppPermissions
                  : typeof stored?.canManageAppPermissions === 'boolean'
                  ? stored.canManageAppPermissions
                  : role === 'admin' || role === 'lead',
              appPermissions: item.appPermissions || stored?.appPermissions || {},
            };
          }),
        );
      }
    }
  } catch {
    // ignore storage read errors
  }

  const seeded = sortMembers(DEFAULT_DIRECTORY_USERS.map(userProfileToMember));
  saveLocalTeamDirectory(seeded, false);
  return seeded;
}

function saveLocalTeamDirectory(members: TeamMemberRecord[], notify = true) {
  try {
    localStorage.setItem(TEAM_DIRECTORY_STORAGE_KEY, JSON.stringify(members));
    if (notify && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TEAM_UPDATED_EVENT));
    }
  } catch {
    // ignore quota errors
  }
}

export function resetLocalTeamDirectory(): TeamMemberRecord[] {
  writePermissionOverrideStore({});
  const seeded = sortMembers(DEFAULT_DIRECTORY_USERS.map(userProfileToMember));
  saveLocalTeamDirectory(seeded, true);
  return seeded;
}

async function hasActiveSupabaseSession(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session?.access_token && data.session?.user?.id);
  } catch {
    return false;
  }
}

export async function listTeamMembers(): Promise<{ members: TeamMemberRecord[]; mode: 'supabase' | 'local'; warning?: string }> {
  const isSupa = await hasActiveSupabaseSession();
  if (isSupa && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('employee_id', { ascending: true, nullsFirst: false });

    if (!error && Array.isArray(data)) {
      const mapped: TeamMemberRecord[] = data.map((p: any) => {
        const position = normalizePosition(p.position);
        const role = deriveRoleFromPosition(position);
        const stored = getStoredOverrideForUser(String(p.id), p.email);
        const remotePerms = p.app_permissions && typeof p.app_permissions === 'object' ? p.app_permissions : null;
        return {
          id: String(p.id),
          email: String(p.email || ''),
          displayName: String(p.display_name || p.email || 'VARD Engineer'),
          employeeId: p.employee_id ? String(p.employee_id) : '',
          position,
          role,
          department: 'VARD Piping Design',
          section: `VARD ${position}`,
          themeColor: p.theme_color || '#2563EB',
          avatarUrl: p.avatar_url || null,
          appAccess: p.app_access !== false,
          canManageAppPermissions:
            typeof p.can_manage_app_permissions === 'boolean'
              ? p.can_manage_app_permissions
              : typeof stored?.canManageAppPermissions === 'boolean'
              ? stored.canManageAppPermissions
              : role === 'admin' || role === 'lead',
          appPermissions: remotePerms || stored?.appPermissions || {},
        };
      });
      return { members: sortMembers(mapped), mode: 'supabase' };
    }

    return {
      members: getLocalTeamDirectory(),
      mode: 'local',
      warning: error?.message || 'Unable to read Supabase profiles; showing local directory.',
    };
  }

  return { members: getLocalTeamDirectory(), mode: 'local' };
}

export async function createTeamMember(
  input: CreateTeamMemberInput,
): Promise<{ mode: 'supabase' | 'local'; member?: TeamMemberRecord }> {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.displayName.trim();
  const cleanEmpId = (input.employeeId || '').trim();
  const cleanPosition = normalizePosition(input.position);
  const cleanColor = input.themeColor || '#2563EB';
  const derivedRole = deriveRoleFromPosition(cleanPosition);

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please enter a valid corporate email address.');
  }
  if (!cleanName) {
    throw new Error('Please enter a display name.');
  }

  const isSupa = await hasActiveSupabaseSession();
  if (isSupa && supabase) {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: cleanEmail,
        display_name: cleanName,
        employee_id: cleanEmpId || null,
        position: cleanPosition,
        theme_color: cleanColor,
      },
    });
    if (error) throw new Error(error.message || 'Failed to invoke create-user edge function.');
    if (data && data.error) throw new Error(data.error);
    return { mode: 'supabase' };
  }

  const current = getLocalTeamDirectory();
  if (current.some(m => m.email.toLowerCase() === cleanEmail)) {
    throw new Error(`An account with email ${cleanEmail} already exists.`);
  }

  const newMember: TeamMemberRecord = {
    id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: cleanEmail,
    displayName: cleanName,
    employeeId: cleanEmpId,
    position: cleanPosition,
    role: derivedRole,
    department: (input.department || 'VARD Piping Design').trim(),
    section: (input.section || `VARD ${cleanPosition}`).trim(),
    themeColor: cleanColor,
    avatarUrl: null,
    appAccess: true,
    canManageAppPermissions: derivedRole === 'admin' || derivedRole === 'lead',
    appPermissions: {},
  };

  saveLocalTeamDirectory(sortMembers([...current, newMember]), true);
  return { mode: 'local', member: newMember };
}

export async function updateTeamMember(
  memberId: string,
  patch: UpdateTeamMemberInput,
): Promise<{ mode: 'supabase' | 'local'; member?: TeamMemberRecord }> {
  const isSupa = await hasActiveSupabaseSession();
  if (isSupa && supabase) {
    const dbPatch: Record<string, any> = {};
    if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName.trim();
    if (patch.employeeId !== undefined) dbPatch.employee_id = patch.employeeId.trim() || null;
    if (patch.position !== undefined) dbPatch.position = normalizePosition(patch.position);
    if (patch.themeColor !== undefined) dbPatch.theme_color = patch.themeColor;

    const { error } = await supabase.from('profiles').update(dbPatch).eq('id', memberId);
    if (error) throw new Error(error.message || 'Failed to update profile in Supabase.');
    return { mode: 'supabase' };
  }

  const current = getLocalTeamDirectory();
  let updated: TeamMemberRecord | undefined;
  const next = current.map(m => {
    if (m.id !== memberId) return m;
    const nextPosition = patch.position !== undefined ? normalizePosition(patch.position) : m.position;
    const nextRole = deriveRoleFromPosition(nextPosition);
    updated = {
      ...m,
      displayName: patch.displayName !== undefined ? patch.displayName.trim() : m.displayName,
      employeeId: patch.employeeId !== undefined ? patch.employeeId.trim() : m.employeeId,
      position: nextPosition,
      role: nextRole,
      department: patch.department !== undefined ? patch.department.trim() : m.department,
      section: patch.section !== undefined ? patch.section.trim() : m.section,
      themeColor: patch.themeColor ?? m.themeColor,
    };
    return updated;
  });

  if (!updated) throw new Error('Member not found.');
  saveLocalTeamDirectory(sortMembers(next), true);
  return { mode: 'local', member: updated };
}

export async function updateMemberAppPermissions(
  memberId: string,
  email: string,
  appPermissions: Record<string, AppAccessLevel>,
  canManageAppPermissions?: boolean,
): Promise<{ mode: 'supabase' | 'local'; syncedRemote?: boolean }> {
  // Always persist in override store so shell enforces permissions instantly
  const store = readPermissionOverrideStore();
  const nextEntry: StoredPermissionOverride = {
    appPermissions: { ...appPermissions },
    canManageAppPermissions,
  };
  store[memberId] = nextEntry;
  if (email) {
    store[email.toLowerCase().trim()] = nextEntry;
  }
  writePermissionOverrideStore(store);

  const isSupa = await hasActiveSupabaseSession();
  if (isSupa && supabase) {
    try {
      const dbPatch: Record<string, any> = { app_permissions: appPermissions };
      if (typeof canManageAppPermissions === 'boolean') {
        dbPatch.can_manage_app_permissions = canManageAppPermissions;
      }
      const { error } = await supabase.from('profiles').update(dbPatch).eq('id', memberId);
      if (!error) {
        return { mode: 'supabase', syncedRemote: true };
      }
      // If remote profiles table lacks app_permissions column yet, keep local override cleanly
      return { mode: 'supabase', syncedRemote: false };
    } catch {
      return { mode: 'supabase', syncedRemote: false };
    }
  }

  const current = getLocalTeamDirectory();
  const next = current.map(m => {
    if (m.id !== memberId) return m;
    return {
      ...m,
      appPermissions: { ...appPermissions },
      canManageAppPermissions:
        typeof canManageAppPermissions === 'boolean' ? canManageAppPermissions : m.canManageAppPermissions,
    };
  });
  saveLocalTeamDirectory(next, true);
  return { mode: 'local', syncedRemote: false };
}

export async function setTeamMemberAccess(
  memberId: string,
  appAccess: boolean,
): Promise<{ mode: 'supabase' | 'local' }> {
  const isSupa = await hasActiveSupabaseSession();
  if (isSupa && supabase) {
    const { error } = await supabase.from('profiles').update({ app_access: appAccess }).eq('id', memberId);
    if (error) throw new Error(error.message || 'Failed to update app access in Supabase.');
    return { mode: 'supabase' };
  }

  const current = getLocalTeamDirectory();
  const next = current.map(m => (m.id === memberId ? { ...m, appAccess } : m));
  saveLocalTeamDirectory(next, true);
  return { mode: 'local' };
}

export async function deleteTeamMember(memberId: string): Promise<{ mode: 'supabase' | 'local' }> {
  const isSupa = await hasActiveSupabaseSession();
  if (isSupa && supabase) {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: memberId },
    });
    if (error) throw new Error(error.message || 'Failed to invoke delete-user edge function.');
    if (data && data.error) throw new Error(data.error);
    return { mode: 'supabase' };
  }

  const current = getLocalTeamDirectory();
  const next = current.filter(m => m.id !== memberId);
  saveLocalTeamDirectory(next, true);
  return { mode: 'local' };
}

async function prepareCompressedAvatarFile(file: File): Promise<{ file: File; dataUrl: string }> {
  if (!file) throw new Error('No image selected.');
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image is too large. Please select a file under 15 MB.');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const maxEdge = 256;
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to initialize image canvas.');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Failed to encode image.');
    return {
      file: new File([blob], 'avatar.jpg', { type: 'image/jpeg', lastModified: Date.now() }),
      dataUrl,
    };
  } finally {
    if (typeof bitmap.close === 'function') bitmap.close();
  }
}

export async function uploadTeamMemberAvatar(memberId: string, file: File): Promise<string> {
  const prepared = await prepareCompressedAvatarFile(file);
  const isSupa = await hasActiveSupabaseSession();

  if (isSupa && supabase) {
    const storagePath = `${memberId}/avatar.jpg`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(storagePath, prepared.file, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });
    if (upErr) throw new Error(upErr.message);

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    const avatarUrl = `${pub.publicUrl}?t=${Date.now()}`;
    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', memberId);
    if (dbErr) throw new Error(dbErr.message);
    return avatarUrl;
  }

  const current = getLocalTeamDirectory();
  const next = current.map(m => (m.id === memberId ? { ...m, avatarUrl: prepared.dataUrl } : m));
  saveLocalTeamDirectory(next, true);
  return prepared.dataUrl;
}

export async function removeTeamMemberAvatar(memberId: string): Promise<void> {
  const isSupa = await hasActiveSupabaseSession();
  if (isSupa && supabase) {
    const { data: existing } = await supabase.storage.from('avatars').list(memberId);
    if (existing && existing.length > 0) {
      await supabase.storage.from('avatars').remove(existing.map(f => `${memberId}/${f.name}`));
    }
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', memberId);
    if (error) throw new Error(error.message);
    return;
  }

  const current = getLocalTeamDirectory();
  const next = current.map(m => (m.id === memberId ? { ...m, avatarUrl: null } : m));
  saveLocalTeamDirectory(next, true);
}
