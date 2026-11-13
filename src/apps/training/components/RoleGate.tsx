import React from 'react';
import { Lock } from 'lucide-react';
import { TrainingPermissions } from '../types';

interface RoleGateProps {
  permissions: TrainingPermissions;
  require: 'authenticated' | 'edit' | 'progress';
  onBack?: () => void;
  children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  permissions,
  require,
  onBack,
  children,
}) => {
  const allowed =
    require === 'authenticated'
      ? permissions.canViewDocuments
      : require === 'edit'
      ? permissions.canEdit
      : permissions.canViewAllProgress;

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-lg mx-auto my-8 bg-[#0E1D2D] border border-slate-800 rounded-2xl p-6 text-center space-y-3">
      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
        <Lock className="w-6 h-6" />
      </div>
      <div className="text-xs font-mono text-amber-400 uppercase tracking-wider">
        Giới hạn quyền truy cập
      </div>
      <h2 className="text-lg font-bold text-white">
        {permissions.isGuest
          ? 'Yêu cầu đăng nhập tài khoản nội bộ'
          : 'Tài khoản không đủ quyền cho mục này'}
      </h2>
      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
        {require === 'authenticated'
          ? 'Thư viện tài liệu gốc chỉ dành cho kỹ sư đã đăng nhập. Chế độ Guest chỉ truy cập được module công khai AVEVA 3D.'
          : 'Chức năng Soạn nội dung và Bảng tiến độ nhóm chỉ dành cho Lead (Senior / Manager) và Admin.'}
      </p>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          Quay lại trang chủ
        </button>
      )}
    </div>
  );
};
