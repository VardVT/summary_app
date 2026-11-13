import React, { useMemo } from 'react';
import {
  Download,
  FileText,
  FolderLock,
  Globe,
  RefreshCw,
  Search,
} from 'lucide-react';
import { TrainingLesson, TrainingModule, TrainingPermissions } from '../types';
import { useDocuments } from '../hooks/useDocuments';
import { RoleGate } from '../components/RoleGate';

interface DocumentsPageProps {
  permissions: TrainingPermissions;
  modules: TrainingModule[];
  lessons: TrainingLesson[];
  onBackHome: () => void;
  onOpenLesson: (lessonId: string) => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  permissions,
  modules,
  lessons,
  onBackHome,
  onOpenLesson,
}) => {
  const {
    documents,
    searchQuery,
    setSearchQuery,
    loading,
    downloadingId,
    error,
    reload,
    downloadDocument,
  } = useDocuments(permissions.canViewDocuments);

  const lessonMap = useMemo(() => new Map(lessons.map(l => [l.id, l])), [lessons]);
  const moduleMap = useMemo(() => new Map(modules.map(m => [m.id, m])), [modules]);

  return (
    <RoleGate permissions={permissions} require="authenticated" onBack={onBackHome}>
      <div className="space-y-5">
        {/* Header & Search */}
        <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono text-amber-400">
                Thư viện nội bộ · Signed URL bảo mật
              </span>
              <h1 className="text-xl font-bold text-white mt-0.5">
                Thư viện tài liệu gốc
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Tài liệu tiêu chuẩn DSS, Pipe guideline, DNV/SOLAS và hướng dẫn AVEVA Marine dành riêng cho tài khoản đã đăng nhập.
              </p>
            </div>
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên tài liệu, mô tả hoặc đường dẫn file..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-cyan-400/60 focus:outline-none text-sm text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
            <div className="h-20 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
            {searchQuery.trim()
              ? 'Không tìm thấy tài liệu phù hợp với từ khóa.'
              : 'Chưa có tài liệu nào trong thư viện. Lead hoặc Admin có thể tải lên tại mục Soạn nội dung.'}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => {
              const linkedLesson = doc.lesson_id ? lessonMap.get(doc.lesson_id) : undefined;
              const linkedModule = linkedLesson
                ? moduleMap.get(linkedLesson.module_id)
                : undefined;
              const isPublicBucket = doc.bucket_id === 'training-public';

              return (
                <div
                  key={doc.id}
                  className="bg-[#0E1D2D] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          {doc.title}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border ${
                            isPublicBucket
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          }`}
                        >
                          {isPublicBucket ? (
                            <>
                              <Globe className="w-3 h-3" />
                              <span>Public Bucket</span>
                            </>
                          ) : (
                            <>
                              <FolderLock className="w-3 h-3" />
                              <span>Nội bộ (Signed URL)</span>
                            </>
                          )}
                        </span>
                      </div>

                      {doc.description && (
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {doc.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 pt-0.5">
                        <span>
                          Ngày tạo:{' '}
                          {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                        </span>
                        {linkedLesson && (
                          <>
                            <span aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={() => onOpenLesson(linkedLesson.id)}
                              className="text-cyan-400 hover:underline cursor-pointer"
                            >
                              Bài học: {linkedLesson.title}
                              {linkedModule ? ` (${linkedModule.title})` : ''}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={downloadingId === doc.id}
                    onClick={() => downloadDocument(doc)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {downloadingId === doc.id ? 'Đang tạo link...' : 'Tải tài liệu'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RoleGate>
  );
};
