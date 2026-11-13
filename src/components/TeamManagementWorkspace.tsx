import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Save,
  Trash2,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  RotateCcw,
  SlidersHorizontal,
  Eye,
  Lock,
  Loader2,
  KeyRound,
  Ban,
  Pencil,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { APPS_CONFIG } from '../config/apps';
import { AppAccessLevel, AppConfig, UserRole } from '../types';
import {
  TeamMemberRecord,
  TEAM_POSITIONS,
  deriveRoleFromPosition,
  getDefaultAppAccessForRole,
  getUserCanManageAppPermissions,
  listTeamMembers,
  createTeamMember,
  updateTeamMember,
  updateMemberAppPermissions,
  setTeamMemberAccess,
  deleteTeamMember,
  uploadTeamMemberAvatar,
  removeTeamMemberAvatar,
  resetLocalTeamDirectory,
} from '../services/teamDirectoryService';

const AVATAR_COLOR_SWATCHES = [
  '#2563EB',
  '#0891B2',
  '#059669',
  '#D97706',
  '#E11D48',
  '#4F46E5',
  '#0F766E',
  '#475569',
];

interface ToastBanner {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  isDanger: boolean;
  onConfirm: () => Promise<void>;
}

function getInitials(name: string): string {
  const parts = String(name || 'U').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return String(name || 'U').slice(0, 2).toUpperCase();
}

function getTierLabel(role: UserRole): { text: string; colorClass: string } {
  switch (role) {
    case 'admin':
      return { text: 'Admin · Full Access', colorClass: 'text-amber-400' };
    case 'lead':
      return { text: 'Lead · Management', colorClass: 'text-cyan-400' };
    case 'viewer':
      return { text: 'Viewer · Read-Only', colorClass: 'text-purple-400' };
    case 'engineer':
    default:
      return { text: 'Engineer · Standard', colorClass: 'text-emerald-400' };
  }
}

const APP_SHORT_LABELS: Record<string, string> = {
  'section-task-manager': 'Progress Mgmt',
  'drawing-review': 'Drawing Review',
  'plan-drawing-list': 'Plan Drawing List',
  'iso-tools': 'ISO Tools',
  'mto-manager': 'MTO Manager',
  'transmittal': 'Transmittal',
  'calendar': 'Milestones',
  'reports': 'Reports',
  'team-settings': 'Team Settings',
};

function resolveMemberAppLevel(member: TeamMemberRecord, app: AppConfig): AppAccessLevel {
  const override = member.appPermissions?.[app.id];
  if (override === 'edit' || override === 'view' || override === 'ban') {
    return override;
  }
  if (app.id === 'team-settings' && member.canManageAppPermissions) {
    return 'edit';
  }
  return getDefaultAppAccessForRole(member.role, app);
}

export const TeamManagementWorkspace: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => {
  const { user: currentUser, role: currentRole, caps } = useAuth();

  const canManageAccounts = !readOnly && (currentRole === 'admin' || currentRole === 'lead');
  const canManageAppPermissions =
    !readOnly &&
    (getUserCanManageAppPermissions(currentUser, currentRole) || caps.includes('manage_app_permissions'));

  const [activeTab, setActiveTab] = useState<'directory' | 'permissions'>(() =>
    currentRole !== 'admin' && currentRole !== 'lead' ? 'permissions' : 'directory',
  );
  const [savingPermId, setSavingPermId] = useState<string | null>(null);

  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [originalMap, setOriginalMap] = useState<Record<string, TeamMemberRecord>>({});
  const [dataMode, setDataMode] = useState<'supabase' | 'local'>('local');
  const [loading, setLoading] = useState<boolean>(true);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'active' | 'disabled'>('all');

  // Row action states
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add Member Modal
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newEmpId, setNewEmpId] = useState<string>('');
  const [newPosition, setNewPosition] = useState<string>('Engineer');
  const [newDepartment, setNewDepartment] = useState<string>('VARD Piping Design');
  const [newSection, setNewSection] = useState<string>('Piping Engineering');
  const [newColor, setNewColor] = useState<string>('#2563EB');
  const [creating, setCreating] = useState<boolean>(false);

  // Detail / Profile Drawer Modal
  const [inspectMember, setInspectMember] = useState<TeamMemberRecord | null>(null);
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Confirmation Modal & Toast
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastBanner | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now();
    setToast({ id, type, title, message });
    setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev));
    }, 4500);
  }, []);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setWarningMsg(null);
    try {
      const res = await listTeamMembers();
      setMembers(res.members);
      const map: Record<string, TeamMemberRecord> = {};
      res.members.forEach(m => {
        map[m.id] = { ...m };
      });
      setOriginalMap(map);
      setDataMode(res.mode);
      if (res.warning) {
        setWarningMsg(res.warning);
      }
    } catch (err: any) {
      showToast('error', 'Load Failed', err?.message || 'Unable to load team directory.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  // Helper to check if a row has unsaved edits
  const isRowDirty = useCallback(
    (member: TeamMemberRecord): boolean => {
      const orig = originalMap[member.id];
      if (!orig) return false;
      return (
        orig.displayName !== member.displayName ||
        orig.employeeId !== member.employeeId ||
        orig.position !== member.position ||
        orig.themeColor !== member.themeColor
      );
    },
    [originalMap],
  );

  const dirtyMembers = useMemo(() => members.filter(isRowDirty), [members, isRowDirty]);

  const patchLocalRow = (id: string, fields: Partial<TeamMemberRecord>) => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== id) return m;
        const nextPos = fields.position ?? m.position;
        return {
          ...m,
          ...fields,
          role: deriveRoleFromPosition(nextPos),
        };
      }),
    );
  };

  const handleSaveRow = async (member: TeamMemberRecord) => {
    if (!member.displayName.trim()) {
      showToast('error', 'Validation Error', 'Display Name cannot be empty.');
      return;
    }
    setSavingId(member.id);
    try {
      await updateTeamMember(member.id, {
        displayName: member.displayName,
        employeeId: member.employeeId,
        position: member.position,
        themeColor: member.themeColor,
      });
      setOriginalMap(prev => ({
        ...prev,
        [member.id]: { ...member, role: deriveRoleFromPosition(member.position) },
      }));
      showToast('success', 'Member Updated', `Saved changes for ${member.displayName}.`);
    } catch (err: any) {
      showToast('error', 'Save Failed', err?.message || 'Could not update member.');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAllDirty = async () => {
    if (dirtyMembers.length === 0) return;
    setSavingAll(true);
    let successCount = 0;
    let firstError = '';
    for (const m of dirtyMembers) {
      if (!m.displayName.trim()) {
        firstError = `Display Name cannot be empty for ${m.email}.`;
        continue;
      }
      try {
        await updateTeamMember(m.id, {
          displayName: m.displayName,
          employeeId: m.employeeId,
          position: m.position,
          themeColor: m.themeColor,
        });
        setOriginalMap(prev => ({
          ...prev,
          [m.id]: { ...m, role: deriveRoleFromPosition(m.position) },
        }));
        successCount += 1;
      } catch (err: any) {
        if (!firstError) firstError = err?.message || 'Failed to update row.';
      }
    }
    setSavingAll(false);
    if (firstError) {
      showToast('error', 'Partial Save', `${successCount} updated. Error: ${firstError}`);
    } else {
      showToast('success', 'All Changes Saved', `Updated ${successCount} member profiles.`);
    }
  };

  const handleToggleAccess = async (member: TeamMemberRecord) => {
    if (currentUser && (member.id === currentUser.id || member.email.toLowerCase() === currentUser.email.toLowerCase())) {
      showToast('error', 'Action Blocked', 'You cannot disable app access for your own active account.');
      return;
    }
    const nextAccess = !member.appAccess;
    setTogglingId(member.id);
    try {
      await setTeamMemberAccess(member.id, nextAccess);
      patchLocalRow(member.id, { appAccess: nextAccess });
      setOriginalMap(prev =>
        prev[member.id] ? { ...prev, [member.id]: { ...prev[member.id], appAccess: nextAccess } } : prev,
      );
      if (inspectMember?.id === member.id) {
        setInspectMember(prev => (prev ? { ...prev, appAccess: nextAccess } : null));
      }
      showToast(
        'success',
        nextAccess ? 'Access Enabled' : 'Access Disabled',
        nextAccess
          ? `${member.displayName} can now sign in.`
          : `${member.displayName} is now blocked from signing in.`,
      );
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Could not change access status.');
    } finally {
      setTogglingId(null);
    }
  };

  const requestDeleteMember = (member: TeamMemberRecord) => {
    if (currentUser && (member.id === currentUser.id || member.email.toLowerCase() === currentUser.email.toLowerCase())) {
      showToast('error', 'Action Blocked', 'You cannot delete your own active account.');
      return;
    }

    setConfirmDialog({
      title: `Delete Account: ${member.displayName || member.email}?`,
      message:
        dataMode === 'supabase'
          ? 'This permanently deletes their Supabase Auth login and profile record. If you only want to temporarily block access, cancel and toggle App Access to Off instead.'
          : 'This permanently removes this account from the team directory. If you only want to suspend access, cancel and toggle App Access to Off instead.',
      confirmLabel: 'Delete Permanently',
      isDanger: true,
      onConfirm: async () => {
        setDeletingId(member.id);
        try {
          await deleteTeamMember(member.id);
          setMembers(prev => prev.filter(m => m.id !== member.id));
          setOriginalMap(prev => {
            const copy = { ...prev };
            delete copy[member.id];
            return copy;
          });
          if (inspectMember?.id === member.id) {
            setInspectMember(null);
          }
          showToast('success', 'Account Deleted', `${member.displayName || member.email} has been removed.`);
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await createTeamMember({
        email: newEmail,
        displayName: newName,
        employeeId: newEmpId,
        position: newPosition,
        department: newDepartment,
        section: newSection,
        themeColor: newColor,
      });
      setAddModalOpen(false);
      setNewEmail('');
      setNewName('');
      setNewEmpId('');
      setNewPosition('Engineer');
      setNewDepartment('VARD Piping Design');
      setNewSection('Piping Engineering');
      setNewColor('#2563EB');
      await loadDirectory();
      showToast(
        'success',
        'Account Created',
        result.mode === 'supabase'
          ? `Provisioned ${newName} (${newEmail}) with temporary password Pass01.`
          : `Added ${newName} (${newEmail}) to team directory.`,
      );
    } catch (err: any) {
      showToast('error', 'Create Failed', err?.message || 'Could not create account.');
    } finally {
      setCreating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !inspectMember) return;
    setAvatarUploading(true);
    try {
      const nextUrl = await uploadTeamMemberAvatar(inspectMember.id, file);
      patchLocalRow(inspectMember.id, { avatarUrl: nextUrl });
      setInspectMember(prev => (prev ? { ...prev, avatarUrl: nextUrl } : null));
      setOriginalMap(prev =>
        prev[inspectMember.id] ? { ...prev, [inspectMember.id]: { ...prev[inspectMember.id], avatarUrl: nextUrl } } : prev,
      );
      showToast('success', 'Photo Updated', `Updated avatar for ${inspectMember.displayName}.`);
    } catch (err: any) {
      showToast('error', 'Upload Failed', err?.message || 'Could not upload avatar.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!inspectMember) return;
    setAvatarUploading(true);
    try {
      await removeTeamMemberAvatar(inspectMember.id);
      patchLocalRow(inspectMember.id, { avatarUrl: null });
      setInspectMember(prev => (prev ? { ...prev, avatarUrl: null } : null));
      setOriginalMap(prev =>
        prev[inspectMember.id] ? { ...prev, [inspectMember.id]: { ...prev[inspectMember.id], avatarUrl: null } } : prev,
      );
      showToast('success', 'Photo Removed', `Reset avatar for ${inspectMember.displayName}.`);
    } catch (err: any) {
      showToast('error', 'Remove Failed', err?.message || 'Could not remove avatar.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const requestResetDirectory = () => {
    setConfirmDialog({
      title: 'Reset Local Directory to Default?',
      message: 'This restores the original 24 VARD Piping team accounts and removes custom local edits.',
      confirmLabel: 'Reset Directory',
      isDanger: true,
      onConfirm: async () => {
        const restored = resetLocalTeamDirectory();
        setMembers(restored);
        const map: Record<string, TeamMemberRecord> = {};
        restored.forEach(m => {
          map[m.id] = { ...m };
        });
        setOriginalMap(map);
        showToast('info', 'Directory Restored', 'Restored default VARD engineering directory.');
      },
    });
  };

  // Derived stats
  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => m.appAccess !== false).length;
    const disabled = total - active;
    const leadsAndAdmins = members.filter(m => m.role === 'admin' || m.role === 'lead').length;
    return { total, active, disabled, leadsAndAdmins };
  }, [members]);

  // Filtered list
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return members.filter(m => {
      if (accessFilter === 'active' && m.appAccess === false) return false;
      if (accessFilter === 'disabled' && m.appAccess !== false) return false;
      if (positionFilter !== 'all' && m.position.toLowerCase() !== positionFilter.toLowerCase()) return false;
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.employeeId.toLowerCase().includes(q) ||
        m.position.toLowerCase().includes(q) ||
        m.section.toLowerCase().includes(q)
      );
    });
  }, [members, searchQuery, positionFilter, accessFilter]);

  const handleUpdateAppAccessLevel = async (
    member: TeamMemberRecord,
    appId: string,
    level: AppAccessLevel,
  ) => {
    if (!canManageAppPermissions) return;
    const isSelf =
      Boolean(currentUser) &&
      (member.id === currentUser?.id || member.email.toLowerCase() === currentUser?.email.toLowerCase());
    if (isSelf && appId === 'team-settings' && level === 'ban') {
      showToast('error', 'Action Blocked', 'You cannot ban yourself from Team & Account Settings.');
      return;
    }

    const nextMap: Record<string, AppAccessLevel> = {
      ...(member.appPermissions || {}),
      [appId]: level,
    };
    setSavingPermId(member.id);
    try {
      await updateMemberAppPermissions(member.id, member.email, nextMap, member.canManageAppPermissions);
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, appPermissions: nextMap } : m)));
      setOriginalMap(prev =>
        prev[member.id] ? { ...prev, [member.id]: { ...prev[member.id], appPermissions: nextMap } } : prev,
      );
      if (inspectMember?.id === member.id) {
        setInspectMember(prev => (prev ? { ...prev, appPermissions: nextMap } : null));
      }
      const targetApp = APPS_CONFIG.find(a => a.id === appId);
      showToast(
        'success',
        'Permission Updated',
        `${member.displayName} → ${targetApp?.label || appId}: ${level.toUpperCase()}`,
      );
    } catch (err: any) {
      showToast('error', 'Permission Update Failed', err?.message || 'Could not save app permission.');
    } finally {
      setSavingPermId(null);
    }
  };

  const handleToggleCanManagePermissions = async (member: TeamMemberRecord) => {
    if (!canManageAppPermissions) return;
    const isSelf =
      Boolean(currentUser) &&
      (member.id === currentUser?.id || member.email.toLowerCase() === currentUser?.email.toLowerCase());
    if (isSelf && member.canManageAppPermissions) {
      showToast('error', 'Action Blocked', 'You cannot revoke your own permission-editing capability.');
      return;
    }

    const nextFlag = !member.canManageAppPermissions;
    setSavingPermId(member.id);
    try {
      await updateMemberAppPermissions(member.id, member.email, member.appPermissions || {}, nextFlag);
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, canManageAppPermissions: nextFlag } : m)));
      setOriginalMap(prev =>
        prev[member.id]
          ? { ...prev, [member.id]: { ...prev[member.id], canManageAppPermissions: nextFlag } }
          : prev,
      );
      if (inspectMember?.id === member.id) {
        setInspectMember(prev => (prev ? { ...prev, canManageAppPermissions: nextFlag } : null));
      }
      showToast(
        'success',
        nextFlag ? 'Permission Editor Granted' : 'Permission Editor Revoked',
        nextFlag
          ? `${member.displayName} can now edit app access permissions.`
          : `${member.displayName} can no longer edit app access permissions.`,
      );
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Could not update permission-editor flag.');
    } finally {
      setSavingPermId(null);
    }
  };

  const handleApplyAppPreset = async (
    member: TeamMemberRecord,
    preset: 'all_edit' | 'all_view' | 'reset_default',
  ) => {
    if (!canManageAppPermissions) return;
    const isSelf =
      Boolean(currentUser) &&
      (member.id === currentUser?.id || member.email.toLowerCase() === currentUser?.email.toLowerCase());

    let nextMap: Record<string, AppAccessLevel> = {};
    if (preset === 'all_edit') {
      APPS_CONFIG.forEach(a => {
        nextMap[a.id] = 'edit';
      });
    } else if (preset === 'all_view') {
      APPS_CONFIG.forEach(a => {
        nextMap[a.id] = isSelf && a.id === 'team-settings' ? 'edit' : 'view';
      });
    } else {
      nextMap = {};
    }

    setSavingPermId(member.id);
    try {
      await updateMemberAppPermissions(member.id, member.email, nextMap, member.canManageAppPermissions);
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, appPermissions: nextMap } : m)));
      setOriginalMap(prev =>
        prev[member.id] ? { ...prev, [member.id]: { ...prev[member.id], appPermissions: nextMap } } : prev,
      );
      if (inspectMember?.id === member.id) {
        setInspectMember(prev => (prev ? { ...prev, appPermissions: nextMap } : null));
      }
      showToast(
        'success',
        'Preset Applied',
        preset === 'reset_default'
          ? `Reset ${member.displayName} to role default permissions.`
          : `Updated all app permissions for ${member.displayName}.`,
      );
    } catch (err: any) {
      showToast('error', 'Preset Failed', err?.message || 'Could not apply preset.');
    } finally {
      setSavingPermId(null);
    }
  };

  // Explicit guard inside workspace: block unauthenticated users, and block unauthorized users unless readOnly view was granted
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#0B1F33]">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Lock className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Sign In Required · Lead &amp; Admin Only</h2>
          <p className="text-xs text-slate-400">
            Please sign in with an authorized Lead or Admin account to access Team &amp; Account Settings (APP-09).
          </p>
        </div>
      </div>
    );
  }

  if (!readOnly && !canManageAccounts && !canManageAppPermissions) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#0B1F33]">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Lock className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Restricted Area · Lead &amp; Admin Only</h2>
          <p className="text-xs text-slate-400">
            Team &amp; Account Settings (APP-09) is restricted to Lead, Admin, or users granted app-permission management rights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#0B1F33] text-slate-100 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-6">
        {/* Toast Banner */}
        {toast && (
          <div
            className={`fixed top-16 right-6 z-50 max-w-sm w-full rounded-xl border p-4 shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-red-500/40 text-red-300'
                : 'bg-slate-900/95 border-cyan-500/40 text-cyan-300'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">{toast.title}</div>
              <div className="text-xs text-slate-300 mt-0.5 leading-snug">{toast.message}</div>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Workspace Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
              <span>Section 09</span>
              <span aria-hidden="true">·</span>
              <span>Lead &amp; Admin Governance</span>
              <span aria-hidden="true">·</span>
              <span className={dataMode === 'supabase' ? 'text-emerald-400' : 'text-cyan-400'}>
                {dataMode === 'supabase' ? 'Supabase Live Sync' : 'Local Directory Store'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Team &amp; Account Settings</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Add new accounts, edit employee IDs and roles, suspend access, or permanently remove team members.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {canManageAccounts && dirtyMembers.length > 0 && (
              <button
                type="button"
                onClick={handleSaveAllDirty}
                disabled={savingAll}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save All ({dirtyMembers.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadDirectory}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {canManageAccounts && dataMode === 'local' && (
              <button
                type="button"
                onClick={requestResetDirectory}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Default</span>
              </button>
            )}

            {canManageAccounts && (
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Warning Notice if Supabase fallback */}
        {warningMsg && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-300 flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{warningMsg}</span>
          </div>
        )}

        {/* Section Tabs: Directory vs App Permissions Matrix */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#0E1D2D] border border-slate-800 w-fit">
            {(canManageAccounts || readOnly) && (
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'directory'
                    ? 'bg-[#F59E0B] text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team Directory &amp; Accounts</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'permissions'
                  ? 'bg-[#F59E0B] text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>App Access Matrix (Edit / View / Ban)</span>
            </button>
          </div>

          <div className="text-xs text-slate-400">
            {activeTab === 'permissions'
              ? 'Assign Edit, View-only, or Ban per app, and delegate who can edit app permissions.'
              : 'Manage employee IDs, positions, sign-in status, and account lifecycle.'}
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0E1D2D] border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">Total Accounts</div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums mt-1">{stats.total}</div>
            <div className="text-[11px] text-slate-500 mt-1">Registered engineering personnel</div>
          </div>

          <div className="bg-[#0E1D2D] border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">Active Access</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1">{stats.active}</div>
            <div className="text-[11px] text-slate-500 mt-1">Enabled for workspace sign-in</div>
          </div>

          <div className="bg-[#0E1D2D] border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">Suspended / Disabled</div>
            <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1">{stats.disabled}</div>
            <div className="text-[11px] text-slate-500 mt-1">Blocked without deleting records</div>
          </div>

          <div className="bg-[#0E1D2D] border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">Permission Editors</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono tabular-nums mt-1">
              {members.filter(m => m.canManageAppPermissions).length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Cleared to edit app access rules</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-[#0E1D2D] border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, email, Emp ID, position..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Position Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => setPositionFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  positionFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Roles
              </button>
              {TEAM_POSITIONS.map(pos => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPositionFilter(pos)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    positionFilter === pos ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            {/* Access Status Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['all', 'active', 'disabled'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setAccessFilter(status)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    accessFilter === status ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Switcher */}
        {activeTab === 'directory' ? (
          <div className="bg-[#0E1D2D] border border-slate-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs font-mono">Loading engineering accounts...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-200">No matching accounts found</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Adjust your search filter or add a new engineering account to the team directory.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPositionFilter('all');
                    setAccessFilter('all');
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-medium text-slate-400">
                      <th className="py-3 px-4 w-24">Emp ID</th>
                      <th className="py-3 px-4 min-w-[260px]">Member &amp; Email</th>
                      <th className="py-3 px-4 w-40">Position</th>
                      <th className="py-3 px-4 w-52">Permission Summary</th>
                      <th className="py-3 px-4 w-32">Sign-In Access</th>
                      <th className="py-3 px-4 w-40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {filteredMembers.map(member => {
                      const isSelf =
                        Boolean(currentUser) &&
                        (member.id === currentUser?.id ||
                          member.email.toLowerCase() === currentUser?.email.toLowerCase());
                      const dirty = isRowDirty(member);
                      const accessOn = member.appAccess !== false;
                      const tier = getTierLabel(member.role);

                      const bannedAppsCount = APPS_CONFIG.filter(a => resolveMemberAppLevel(member, a) === 'ban').length;
                      const viewAppsCount = APPS_CONFIG.filter(a => resolveMemberAppLevel(member, a) === 'view').length;

                      return (
                        <tr
                          key={member.id}
                          className={`transition-colors hover:bg-slate-900/50 ${
                            !accessOn ? 'opacity-65 bg-slate-950/40' : ''
                          } ${dirty ? 'bg-amber-500/5' : ''}`}
                        >
                          {/* Emp ID */}
                          <td className="py-2.5 px-4 align-middle">
                            <input
                              type="text"
                              disabled={!canManageAccounts}
                              value={member.employeeId}
                              onChange={e => patchLocalRow(member.id, { employeeId: e.target.value })}
                              placeholder="—"
                              className="w-20 px-2.5 py-1.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-md font-mono tabular-nums text-xs text-slate-100 focus:outline-none disabled:opacity-60"
                            />
                          </td>

                          {/* Member Name & Email */}
                          <td className="py-2.5 px-4 align-middle">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setInspectMember(member)}
                                title="Inspect profile & permissions"
                                className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-slate-700 hover:border-amber-400 transition-colors cursor-pointer"
                                style={{ backgroundColor: member.themeColor || '#2563EB' }}
                              >
                                {member.avatarUrl ? (
                                  <img
                                    src={member.avatarUrl}
                                    alt={member.displayName}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>{getInitials(member.displayName || member.email)}</span>
                                )}
                              </button>

                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    disabled={!canManageAccounts}
                                    value={member.displayName}
                                    onChange={e => patchLocalRow(member.id, { displayName: e.target.value })}
                                    placeholder="Full name..."
                                    className="w-full max-w-[240px] px-2.5 py-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-md text-xs font-semibold text-white focus:outline-none disabled:opacity-70"
                                  />
                                  {isSelf && (
                                    <span className="text-[11px] font-mono text-amber-400 shrink-0">(You)</span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 truncate pl-0.5">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Position Dropdown */}
                          <td className="py-2.5 px-4 align-middle">
                            <select
                              disabled={!canManageAccounts}
                              value={member.position}
                              onChange={e => patchLocalRow(member.id, { position: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-md text-xs text-slate-200 focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {TEAM_POSITIONS.map(pos => (
                                <option key={pos} value={pos}>
                                  {pos}
                                </option>
                              ))}
                              {!TEAM_POSITIONS.includes(member.position as any) && (
                                <option value={member.position}>{member.position}</option>
                              )}
                            </select>
                          </td>

                          {/* Permission Tier Summary */}
                          <td className="py-2.5 px-4 align-middle">
                            <div className={`text-xs font-medium ${tier.colorClass}`}>{tier.text}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                              {member.canManageAppPermissions && (
                                <span className="text-amber-400 font-medium">Perms Editor</span>
                              )}
                              {bannedAppsCount > 0 && (
                                <span className="text-red-400 font-mono">{bannedAppsCount} Banned</span>
                              )}
                              {viewAppsCount > 0 && (
                                <span className="text-cyan-400 font-mono">{viewAppsCount} View</span>
                              )}
                              {bannedAppsCount === 0 && viewAppsCount === 0 && !member.canManageAppPermissions && (
                                <span className="text-slate-500">Full standard edit</span>
                              )}
                            </div>
                          </td>

                          {/* Sign-In Access Switch */}
                          <td className="py-2.5 px-4 align-middle">
                            <button
                              type="button"
                              disabled={!canManageAccounts || togglingId === member.id || isSelf}
                              onClick={() => handleToggleAccess(member)}
                              title={
                                isSelf
                                  ? 'Cannot disable your own account'
                                  : accessOn
                                  ? 'Click to disable account sign-in'
                                  : 'Click to enable account sign-in'
                              }
                              className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                accessOn
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              <span
                                className={`w-7 h-4 rounded-full relative transition-colors ${
                                  accessOn ? 'bg-emerald-500' : 'bg-slate-700'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                    accessOn ? 'left-3.5' : 'left-0.5'
                                  }`}
                                />
                              </span>
                              <span>{accessOn ? 'On' : 'Off'}</span>
                            </button>
                          </td>

                          {/* Row Actions */}
                          <td className="py-2.5 px-4 align-middle text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {canManageAccounts && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveRow(member)}
                                  disabled={savingId === member.id || !dirty}
                                  title={dirty ? 'Save changes to this account' : 'No unsaved changes'}
                                  className={`p-2 rounded-lg border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                    dirty
                                      ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {savingId === member.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setInspectMember(member)}
                                title="Edit profile & per-app permissions"
                                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {canManageAccounts && (
                                <button
                                  type="button"
                                  disabled={deletingId === member.id || isSelf}
                                  onClick={() => requestDeleteMember(member)}
                                  title={isSelf ? 'Cannot delete your own account' : 'Delete account permanently'}
                                  className="p-2 rounded-lg bg-slate-900 hover:bg-red-500/20 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                >
                                  {deletingId === member.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* App Access Permissions Matrix Tab */
          <div className="space-y-4">
            {/* Permission Legend Strip */}
            <div className="bg-[#0E1D2D] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-emerald-300">Edit:</span>
                  <span className="text-slate-400">Full read &amp; write access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-cyan-300">View:</span>
                  <span className="text-slate-400">Read-only (editing blocked)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ban className="w-3.5 h-3.5 text-red-400" />
                  <span className="font-semibold text-red-300">Ban:</span>
                  <span className="text-slate-400">Cannot open application</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Changes save automatically per click
              </div>
            </div>

            <div className="bg-[#0E1D2D] border border-slate-800 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="text-xs font-mono">Loading permission matrix...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No matching team members for the current filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-medium text-slate-300">
                        <th className="py-3 px-4 min-w-[220px] sticky left-0 z-10 bg-[#0A1623] border-r border-slate-800">
                          Member
                        </th>
                        <th className="py-3 px-3 min-w-[120px] text-center border-r border-slate-800/80">
                          <div className="text-amber-400 font-semibold">Edit Perms</div>
                          <div className="text-[10px] text-slate-500 font-normal">Can configure access</div>
                        </th>
                        {APPS_CONFIG.map(app => (
                          <th key={app.id} className="py-3 px-2.5 min-w-[138px] text-center border-r border-slate-800/60">
                            <div className="font-mono text-[10px] text-amber-400">{app.tag}</div>
                            <div className="text-xs text-slate-200 font-semibold whitespace-nowrap">
                              {APP_SHORT_LABELS[app.id] || app.label}
                            </div>
                          </th>
                        ))}
                        <th className="py-3 px-3 min-w-[165px] text-right">Quick Presets</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {filteredMembers.map(member => {
                        const isSelf =
                          Boolean(currentUser) &&
                          (member.id === currentUser?.id ||
                            member.email.toLowerCase() === currentUser?.email.toLowerCase());
                        const isBusy = savingPermId === member.id;

                        return (
                          <tr key={member.id} className="hover:bg-slate-900/40 transition-colors">
                            {/* Sticky Member Cell */}
                            <td className="py-2.5 px-4 sticky left-0 z-10 bg-[#0E1D2D] border-r border-slate-800">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white overflow-hidden border border-slate-700"
                                  style={{ backgroundColor: member.themeColor || '#2563EB' }}
                                >
                                  {member.avatarUrl ? (
                                    <img
                                      src={member.avatarUrl}
                                      alt={member.displayName}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span>{getInitials(member.displayName || member.email)}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-white truncate max-w-[150px]">
                                    {member.displayName}
                                    {isSelf && <span className="ml-1 text-[10px] font-mono text-amber-400">(You)</span>}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {member.position} · <span className="font-mono uppercase">{member.role}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Can Edit App Permissions Toggle */}
                            <td className="py-2.5 px-3 text-center border-r border-slate-800/80">
                              <button
                                type="button"
                                disabled={!canManageAppPermissions || isBusy || (isSelf && member.canManageAppPermissions)}
                                onClick={() => handleToggleCanManagePermissions(member)}
                                title={
                                  isSelf && member.canManageAppPermissions
                                    ? 'Cannot revoke your own permission-editing right'
                                    : 'Allow or revoke permission to edit app access for others'
                                }
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                  member.canManageAppPermissions
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>{member.canManageAppPermissions ? 'Allowed' : 'No'}</span>
                              </button>
                            </td>

                            {/* Per-App Edit / View / Ban Cells */}
                            {APPS_CONFIG.map(app => {
                              const currentLevel = resolveMemberAppLevel(member, app);
                              const lockSelfApp09 = isSelf && app.id === 'team-settings';

                              return (
                                <td key={app.id} className="py-2.5 px-2 text-center border-r border-slate-800/60">
                                  <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                                    {(['edit', 'view', 'ban'] as AppAccessLevel[]).map(lvl => {
                                      const active = currentLevel === lvl;
                                      const disabled =
                                        !canManageAppPermissions || isBusy || (lockSelfApp09 && lvl === 'ban');

                                      const activeClass =
                                        lvl === 'edit'
                                          ? 'bg-emerald-600 text-white font-semibold'
                                          : lvl === 'view'
                                          ? 'bg-cyan-600 text-white font-semibold'
                                          : 'bg-red-600 text-white font-semibold';

                                      return (
                                        <button
                                          key={lvl}
                                          type="button"
                                          disabled={disabled}
                                          onClick={() => handleUpdateAppAccessLevel(member, app.id, lvl)}
                                          className={`px-2 py-1 rounded-md text-[11px] capitalize whitespace-nowrap transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                                            active ? activeClass : 'text-slate-400 hover:text-slate-200'
                                          }`}
                                        >
                                          {lvl}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                              );
                            })}

                            {/* Quick Row Presets */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={!canManageAppPermissions || isBusy}
                                  onClick={() => handleApplyAppPreset(member, 'all_edit')}
                                  className="px-2 py-1 rounded-md bg-slate-900 hover:bg-emerald-600/20 border border-slate-800 text-[11px] text-emerald-300 whitespace-nowrap cursor-pointer disabled:opacity-40"
                                >
                                  All Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={!canManageAppPermissions || isBusy}
                                  onClick={() => handleApplyAppPreset(member, 'all_view')}
                                  className="px-2 py-1 rounded-md bg-slate-900 hover:bg-cyan-600/20 border border-slate-800 text-[11px] text-cyan-300 whitespace-nowrap cursor-pointer disabled:opacity-40"
                                >
                                  All View
                                </button>
                                <button
                                  type="button"
                                  disabled={!canManageAppPermissions || isBusy}
                                  onClick={() => handleApplyAppPreset(member, 'reset_default')}
                                  className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap cursor-pointer disabled:opacity-40"
                                >
                                  Default
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F33]/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0E1D2D] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/70">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Create Team Account</h2>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Nguyễn Văn An"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Employee ID</label>
                  <input
                    type="text"
                    value={newEmpId}
                    onChange={e => setNewEmpId(e.target.value)}
                    placeholder="e.g. 4688"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono tabular-nums text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Corporate Email *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="engineer@vard.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Position / Role *</label>
                  <select
                    value={newPosition}
                    onChange={e => setNewPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {TEAM_POSITIONS.map(pos => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Derived Access Tier</label>
                  <div className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300">
                    <span className={getTierLabel(deriveRoleFromPosition(newPosition)).colorClass}>
                      {getTierLabel(deriveRoleFromPosition(newPosition)).text}
                    </span>
                  </div>
                </div>
              </div>

              {dataMode === 'local' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Department</label>
                    <input
                      type="text"
                      value={newDepartment}
                      onChange={e => setNewDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Section / Specialty</label>
                    <input
                      type="text"
                      value={newSection}
                      onChange={e => setNewSection(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-2">Avatar Accent Color</label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLOR_SWATCHES.map(swatch => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setNewColor(swatch)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        newColor === swatch ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: swatch }}
                      aria-label={`Select color ${swatch}`}
                    />
                  ))}
                </div>
              </div>

              {dataMode === 'supabase' && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                  Supabase Auth account will be created with temporary password{' '}
                  <code className="font-mono text-amber-400 font-bold">Pass01</code> (user must change it on first login).
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{creating ? 'Creating...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Detail / Avatar & App Permissions Modal */}
      {inspectMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F33]/85 backdrop-blur-md"
          onClick={() => setInspectMember(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0E1D2D] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={handleAvatarUpload}
            />

            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/70 shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Account Profile &amp; App Permissions</h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectMember(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs overflow-y-auto">
              {/* Avatar + Identity */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center text-lg font-bold text-white overflow-hidden border-2 border-slate-700"
                  style={{ backgroundColor: inspectMember.themeColor || '#2563EB' }}
                >
                  {inspectMember.avatarUrl ? (
                    <img
                      src={inspectMember.avatarUrl}
                      alt={inspectMember.displayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(inspectMember.displayName || inspectMember.email)}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white truncate">{inspectMember.displayName}</div>
                  <div className="text-xs font-mono text-cyan-400 truncate">{inspectMember.email}</div>
                  {canManageAccounts && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <button
                        type="button"
                        disabled={avatarUploading}
                        onClick={() => avatarInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        <span>{avatarUploading ? 'Uploading...' : inspectMember.avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                      </button>

                      {inspectMember.avatarUrl && (
                        <button
                          type="button"
                          disabled={avatarUploading}
                          onClick={handleAvatarRemove}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-800 text-[11px] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
                <div>
                  <div className="text-[11px] text-slate-400">Employee ID</div>
                  <div className="font-mono font-semibold text-white mt-0.5 tabular-nums">
                    {inspectMember.employeeId ? `#${inspectMember.employeeId}` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Position</div>
                  <div className="font-semibold text-white mt-0.5">{inspectMember.position}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Department</div>
                  <div className="text-slate-200 mt-0.5 truncate">{inspectMember.department}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Sign-In Status</div>
                  <div className={`font-semibold mt-0.5 ${inspectMember.appAccess !== false ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {inspectMember.appAccess !== false ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>

              {/* Theme Color Picker */}
              {canManageAccounts && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-2">Badge Theme Color</div>
                  <div className="flex items-center gap-2">
                    {AVATAR_COLOR_SWATCHES.map(swatch => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={async () => {
                          patchLocalRow(inspectMember.id, { themeColor: swatch });
                          setInspectMember(prev => (prev ? { ...prev, themeColor: swatch } : null));
                          try {
                            await updateTeamMember(inspectMember.id, { themeColor: swatch });
                            setOriginalMap(prev =>
                              prev[inspectMember.id]
                                ? { ...prev, [inspectMember.id]: { ...prev[inspectMember.id], themeColor: swatch } }
                                : prev,
                            );
                            showToast('success', 'Color Saved', `Updated theme color for ${inspectMember.displayName}.`);
                          } catch (err: any) {
                            showToast('error', 'Save Failed', err?.message || 'Could not save color.');
                          }
                        }}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                          inspectMember.themeColor === swatch ? 'border-white scale-110' : 'border-transparent opacity-80'
                        }`}
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Per-App Permissions & Delegation Section */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Application Access Permissions (Edit / View / Ban)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Control which applications this member can edit, view read-only, or is banned from entering.
                    </div>
                  </div>

                  {canManageAppPermissions && (
                    <button
                      type="button"
                      disabled={savingPermId === inspectMember.id}
                      onClick={() => handleApplyAppPreset(inspectMember, 'reset_default')}
                      className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 cursor-pointer"
                    >
                      Reset Role Defaults
                    </button>
                  )}
                </div>

                {/* Permission Editor Delegation Toggle */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">Can Edit App Permissions</div>
                    <div className="text-[11px] text-slate-400">
                      Allows this account to edit Edit / View / Ban access for other users.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={
                      !canManageAppPermissions ||
                      savingPermId === inspectMember.id ||
                      (Boolean(currentUser) &&
                        (inspectMember.id === currentUser?.id ||
                          inspectMember.email.toLowerCase() === currentUser?.email.toLowerCase()) &&
                        inspectMember.canManageAppPermissions)
                    }
                    onClick={() => handleToggleCanManagePermissions(inspectMember)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      inspectMember.canManageAppPermissions
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{inspectMember.canManageAppPermissions ? 'Allowed' : 'Disabled'}</span>
                  </button>
                </div>

                {/* 9-App Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {APPS_CONFIG.map(app => {
                    const currentLevel = resolveMemberAppLevel(inspectMember, app);
                    const isSelf =
                      Boolean(currentUser) &&
                      (inspectMember.id === currentUser?.id ||
                        inspectMember.email.toLowerCase() === currentUser?.email.toLowerCase());
                    const lockSelfApp09 = isSelf && app.id === 'team-settings';

                    return (
                      <div
                        key={app.id}
                        className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono text-amber-400">{app.tag}</div>
                          <div className="text-xs font-medium text-slate-200 truncate">
                            {APP_SHORT_LABELS[app.id] || app.label}
                          </div>
                        </div>

                        <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                          {(['edit', 'view', 'ban'] as AppAccessLevel[]).map(lvl => {
                            const active = currentLevel === lvl;
                            const disabled =
                              !canManageAppPermissions ||
                              savingPermId === inspectMember.id ||
                              (lockSelfApp09 && lvl === 'ban');

                            const activeClass =
                              lvl === 'edit'
                                ? 'bg-emerald-600 text-white font-semibold'
                                : lvl === 'view'
                                ? 'bg-cyan-600 text-white font-semibold'
                                : 'bg-red-600 text-white font-semibold';

                            return (
                              <button
                                key={lvl}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleUpdateAppAccessLevel(inspectMember, app.id, lvl)}
                                className={`px-2 py-1 rounded-md text-[11px] capitalize transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                                  active ? activeClass : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {lvl}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              {canManageAccounts && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={
                      Boolean(currentUser) &&
                      (inspectMember.id === currentUser?.id ||
                        inspectMember.email.toLowerCase() === currentUser?.email.toLowerCase())
                    }
                    onClick={() => handleToggleAccess(inspectMember)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{inspectMember.appAccess !== false ? 'Suspend Sign-In' : 'Restore Sign-In'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      Boolean(currentUser) &&
                      (inspectMember.id === currentUser?.id ||
                        inspectMember.email.toLowerCase() === currentUser?.email.toLowerCase())
                    }
                    onClick={() => requestDeleteMember(inspectMember)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F33]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0E1D2D] border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={async () => {
                  setConfirmBusy(true);
                  try {
                    await confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  } catch (err: any) {
                    showToast('error', 'Action Failed', err?.message || 'Operation failed.');
                  } finally {
                    setConfirmBusy(false);
                  }
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 ${
                  confirmDialog.isDanger
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {confirmBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmDialog.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
