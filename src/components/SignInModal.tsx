import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Sparkles, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Users, 
  KeyRound, 
  UserCheck,
  Building2,
  Database,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserRole, UserProfile } from '../types';
import { fetchSupabaseUsers, isSupabaseConfigured } from '../services/supabase';
import { DEFAULT_DIRECTORY_USERS } from '../context/AuthContext';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const { signIn, loginAsViewer, isDemoMode } = useAuth();

  // User Directory State
  const [directoryUsers, setDirectoryUsers] = useState<UserProfile[]>(DEFAULT_DIRECTORY_USERS);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [userSource, setUserSource] = useState<'supabase' | 'fallback'>('fallback');
  const [sourceMessage, setSourceMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const defaultUser = DEFAULT_DIRECTORY_USERS[0] || null;
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(defaultUser);

  // Form State
  const [email, setEmail] = useState<string>(defaultUser?.email || '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch users from Supabase or fallback directory
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const result = await fetchSupabaseUsers();
      if (result.users && result.users.length > 0) {
        setDirectoryUsers(result.users);
        setUserSource('supabase');
        setSourceMessage(result.message || `Đã kết nối Supabase (${result.users.length} tài khoản)`);
      } else {
        setDirectoryUsers(DEFAULT_DIRECTORY_USERS);
        setUserSource(isSupabaseConfigured ? 'supabase' : 'fallback');
        setSourceMessage(
          result.message || (isSupabaseConfigured ? 'Supabase profiles trống, hiển thị 23 nhân sự VARD' : 'Danh mục nhân sự VARD')
        );
      }
    } catch {
      setDirectoryUsers(DEFAULT_DIRECTORY_USERS);
      setUserSource('fallback');
      setSourceMessage('Đang sử dụng danh mục nhân sự VARD');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setErrorMsg(null);
      setSuccessMsg(null);
      setPassword('');
      if (directoryUsers.length > 0 && !selectedUser) {
        setSelectedUser(directoryUsers[0]);
        setEmail(directoryUsers[0].email);
      }
    }
  }, [isOpen]);

  // Filtered directory list
  const filteredUsers = useMemo(() => {
    return directoryUsers.filter(u => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.section.toLowerCase().includes(q) ||
        (u.employeeId && u.employeeId.includes(q)) ||
        u.role.toLowerCase().includes(q);

      return matchesRole && matchesSearch;
    });
  }, [directoryUsers, roleFilter, searchQuery]);

  if (!isOpen) return null;

  // Handle selecting user from list
  const handleSelectUser = (u: UserProfile) => {
    setSelectedUser(u);
    setEmail(u.email);
    setPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Submit sign in with password required
  const handleSubmitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email) {
      setErrorMsg('Vui lòng nhập email tài khoản của bạn.');
      return;
    }

    if (!password) {
      setErrorMsg(`Vui lòng nhập mật khẩu cho tài khoản ${email}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message || 'Mật khẩu không chính xác hoặc tài khoản không tồn tại.');
      } else {
        setSuccessMsg(`Đăng nhập thành công! Chào mừng ${selectedUser?.name || email}`);
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi xác thực thông tin đăng nhập.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role badge color helper
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          label: 'Admin',
        };
      case 'lead':
        return {
          bg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
          dot: 'bg-cyan-400',
          label: 'Manager / Lead',
        };
      case 'engineer':
        return {
          bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
          label: 'Engineer',
        };
      case 'viewer':
      default:
        return {
          bg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
          dot: 'bg-purple-400',
          label: 'Inspector',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0B1F33]/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-[#0E1D2D] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white font-sans">
                  Xác Thực Đăng Nhập Hệ Thống Kỹ Thuật VARD
                </h2>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Chọn nhân sự và nhập mật khẩu tương ứng để truy cập
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] ${
              userSource === 'supabase'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}>
              <Database className="w-3 h-3" />
              <span>{userSource === 'supabase' ? 'Supabase DB Connected' : 'VARD Directory'}</span>
            </span>
            <span className="text-slate-400 truncate">{sourceMessage}</span>
          </div>

          <button
            onClick={loadUsers}
            disabled={isLoadingUsers}
            title="Làm mới danh sách"
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingUsers ? 'animate-spin text-amber-400' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Main Body Grid: Left = User List, Right = Password & Login Form */}
        <div className="p-5 flex-1 flex flex-col lg:flex-row gap-5 min-h-0 overflow-hidden">
          
          {/* Left Column: User Directory List */}
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 shrink-0">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>1. Chọn Nhân Sự Trong Danh Sách ({filteredUsers.length})</span>
              </span>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, email hoặc MSNV..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Admin</option>
                <option value="lead">Manager / Lead</option>
                <option value="engineer">Engineer</option>
              </select>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[220px] max-h-[340px]">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                  Không tìm thấy nhân sự phù hợp.
                </div>
              ) : (
                filteredUsers.map(u => {
                  const badge = getRoleBadge(u.role);
                  const isSelected = selectedUser?.id === u.id;

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 shadow-sm'
                          : 'bg-slate-950/60 hover:bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs shrink-0 border ${badge.bg}`}>
                          {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-100 text-xs font-sans truncate">
                              {u.name}
                            </span>
                            {u.employeeId && (
                              <span className="px-1.5 py-0.2 bg-slate-800 text-amber-300 rounded text-[9px] font-mono border border-slate-700">
                                #{u.employeeId}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-cyan-400/90 truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{u.positionTitle || badge.label}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Password Authentication Form */}
          <div className="w-full lg:w-[320px] bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shrink-0">
            <div>
              <button
                type="button"
                onClick={() => {
                  loginAsViewer();
                  setSuccessMsg('Đã đăng nhập nhanh với quyền Viewer (Không cần mật khẩu)!');
                  setTimeout(() => onClose(), 400);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-sans text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer mb-4"
              >
                <Eye className="w-4 h-4" />
                <span>Vào Nhanh Viewer (Không Cần Mật Khẩu)</span>
              </button>
            </div>

            <form onSubmit={handleSubmitSignIn} className="space-y-4">
              <div>
                <span className="font-bold text-amber-400 text-xs font-mono flex items-center gap-1.5 mb-3">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>2. Thông Tin Đăng Nhập</span>
                </span>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      Email Tài Khoản
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => {
                          const val = e.target.value;
                          setEmail(val);
                          const matched = directoryUsers.find(u => u.email.toLowerCase() === val.toLowerCase().trim());
                          setSelectedUser(matched || null);
                        }}
                        placeholder="kisi@vard.com hoặc email supabase..."
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  {selectedUser ? (
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-bold truncate">{selectedUser.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {selectedUser.department} · {selectedUser.positionTitle || selectedUser.role}
                        {selectedUser.employeeId && ` · #${selectedUser.employeeId}`}
                      </div>
                    </div>
                  ) : email ? (
                    <div className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/60 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Đăng nhập xác thực với tài khoản Supabase Auth</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  Mật Khẩu (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu Supabase..."
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full py-2.5 px-4 rounded-xl bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold font-sans text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Đang xác thực...</span>
                ) : (
                  <>
                    <span>Đăng Nhập Hệ Thống</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 text-center">
              Xác thực bảo mật qua Supabase Auth
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
