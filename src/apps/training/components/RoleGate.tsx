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
    <div className="max-w-lg mx-auto my-8 bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
        <Lock className="w-6 h-6" />
      </div>
      <div className="text-xs font-mono text-amber-600 font-semibold uppercase tracking-wider">
        Giới hạn quyền truy cập
      </div>
      <h2 className="text-lg font-bold text-slate-900">
        {permissions.isGuest
          ? 'Yêu cầu đăng nhập tài khoản nội bộ'
          : 'Tài khoản không đủ quyền cho mục này'}
      </h2>
      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
        {require === 'authenticated'
          ? 'Thư viện tài liệu gốc chỉ dành cho kỹ sư đã đăng nhập. Chế độ Guest chỉ truy cập được module công khai AVEVA 3D.'
          : 'Chức năng Soạn nội dung và Bảng tiến độ nhóm chỉ dành cho Lead (Senior / Manager) và Admin.'}
      </p>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          Quay lại trang chủ
        </button>
      )}
    </div>
  );
};
