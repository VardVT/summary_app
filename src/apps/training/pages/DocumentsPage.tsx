import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  Download,
  FileText,
  FolderLock,
  Globe,
  RefreshCw,
  Search,
  ShieldCheck,
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

function getFileExtension(path: string, title: string): string {
  const src = (path || title).split('?')[0];
  const ext = src.includes('.') ? src.split('.').pop()?.toUpperCase() : '';
  return ext && ext.length <= 5 ? ext : 'FILE';
}

function getExtBadgeStyle(ext: string): string {
  if (ext === 'PDF') return 'bg-red-50 border-red-200 text-red-600';
  if (ext === 'XLSX' || ext === 'XLS' || ext === 'CSV')
    return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  if (ext === 'DWG' || ext === 'DXF')
    return 'bg-sky-50 border-sky-200 text-[#0284C7]';
  if (ext === 'ZIP') return 'bg-amber-50 border-amber-200 text-amber-700';
  return 'bg-slate-100 border-slate-200 text-slate-600';
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
    allDocuments,
    searchQuery,
    setSearchQuery,
    loading,
    downloadingId,
    error,
    reload,
    downloadDocument,
  } = useDocuments(permissions.canViewDocuments);

  const [bucketFilter, setBucketFilter] = useState<'all' | 'training-documents' | 'training-public'>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const lessonMap = useMemo(() => new Map(lessons.map(l => [l.id, l])), [lessons]);
  const moduleMap = useMemo(() => new Map(modules.map(m => [m.id, m])), [modules]);

  const displayedDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (bucketFilter !== 'all' && doc.bucket_id !== bucketFilter) return false;
      if (moduleFilter !== 'all') {
        const linkedLesson = doc.lesson_id ? lessonMap.get(doc.lesson_id) : undefined;
        if (moduleFilter === 'unassigned') {
          if (doc.lesson_id) return false;
        } else if (!linkedLesson || linkedLesson.module_id !== moduleFilter) {
          return false;
        }
      }
      return true;
    });
  }, [documents, bucketFilter, moduleFilter, lessonMap]);

  const quickAccessDocs = useMemo(() => allDocuments.slice(0, 3), [allDocuments]);

  const moduleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let generalCount = 0;
    for (const doc of allDocuments) {
      const linkedLesson = doc.lesson_id ? lessonMap.get(doc.lesson_id) : undefined;
      if (linkedLesson) {
        counts.set(linkedLesson.module_id, (counts.get(linkedLesson.module_id) ?? 0) + 1);
      } else {
        generalCount += 1;
      }
    }
    return { counts, generalCount };
  }, [allDocuments, lessonMap]);

  return (
    <RoleGate permissions={permissions} require="authenticated" onBack={onBackHome}>
      <div className="space-y-6">
        {/* Header Row + Vault Count Card (Screen 5 Top) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#0284C7] font-bold">
              STANDARD ENGINEERING ARCHIVE
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Thư Viện Tài Liệu Tiêu Chuẩn
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Hệ thống tài liệu tiêu chuẩn đường ống DSS, quy phạm DNV/SOLAS, hướng dẫn AVEVA Marine và biểu mẫu QA/QC được bảo vệ bằng Signed URL.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xs">
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Kho lưu trữ bảo mật
                </div>
                <div className="text-base font-extrabold text-[#0284C7] font-mono tabular-nums">
                  {allDocuments.length} Tài liệu
                </div>
              </div>
              <button
                type="button"
                onClick={reload}
                disabled={loading}
                title="Làm mới danh sách"
                className="w-9 h-9 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200/80 flex items-center justify-center text-[#0284C7] cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Chips */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên tài liệu, mô tả, mã tiêu chuẩn DSS / DNV / SOLAS..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 focus:border-[#0284C7] focus:outline-none text-sm text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setBucketFilter('all');
                setModuleFilter('all');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                bucketFilter === 'all' && moduleFilter === 'all'
                  ? 'bg-[#0284C7] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Tất cả hồ sơ ({allDocuments.length})
            </button>
            <button
              type="button"
              onClick={() => setBucketFilter('training-documents')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                bucketFilter === 'training-documents'
                  ? 'bg-[#0284C7] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <FolderLock className="w-3.5 h-3.5" />
              <span>Nội bộ (Signed URL)</span>
            </button>
            <button
              type="button"
              onClick={() => setBucketFilter('training-public')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                bucketFilter === 'training-public'
                  ? 'bg-[#0284C7] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Public Bucket</span>
            </button>
          </div>
        </section>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Quick Access Top 3 */}
        {!loading && quickAccessDocs.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-900">Tài Liệu Mới Cập Nhật</h2>
              <span className="text-[11px] font-mono text-slate-400 uppercase">
                Truy cập nhanh
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickAccessDocs.map(doc => {
                const ext = getFileExtension(doc.storage_path, doc.title);
                const linkedLesson = doc.lesson_id ? lessonMap.get(doc.lesson_id) : undefined;
                const linkedModule = linkedLesson
                  ? moduleMap.get(linkedLesson.module_id)
                  : undefined;

                return (
                  <div
                    key={doc.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span
                          className={`px-2 py-0.5 rounded border font-bold ${getExtBadgeStyle(ext)}`}
                        >
                          {ext}
                        </span>
                        <span className="text-slate-400">
                          {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0284C7]">
                        {linkedModule?.title || 'Thư viện chung'}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                        {doc.title}
                      </h3>
                      {doc.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={downloadingId === doc.id}
                      onClick={() => downloadDocument(doc)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F4C81] hover:bg-[#0B3C66] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadingId === doc.id ? 'Đang tạo link...' : 'Tải ngay'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 2-Column Main Document Table + Sidebar Index */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Table */}
          <section className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText className="w-4 h-4 text-[#0284C7]" />
                <span>Danh Sách Tài Liệu Chính Thức</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Hiển thị {displayedDocuments.length} / {allDocuments.length}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400">
                Đang tải danh sách tài liệu...
              </div>
            ) : displayedDocuments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                {searchQuery.trim() || bucketFilter !== 'all' || moduleFilter !== 'all'
                  ? 'Không tìm thấy tài liệu phù hợp với bộ lọc.'
                  : 'Chưa có tài liệu nào trong thư viện. Lead hoặc Admin có thể tải lên tại mục Soạn nội dung.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-[#F8FAFC] text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Định dạng</th>
                      <th className="py-3 px-4">Tiêu đề tài liệu</th>
                      <th className="py-3 px-4">Phân loại & Bài học</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {displayedDocuments.map(doc => {
                      const ext = getFileExtension(doc.storage_path, doc.title);
                      const linkedLesson = doc.lesson_id
                        ? lessonMap.get(doc.lesson_id)
                        : undefined;
                      const linkedModule = linkedLesson
                        ? moduleMap.get(linkedLesson.module_id)
                        : undefined;
                      const isPublicBucket = doc.bucket_id === 'training-public';

                      return (
                        <tr key={doc.id} className="hover:bg-sky-50/30 transition-colors">
                          <td className="py-3.5 px-4 align-top">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-[11px] font-mono font-bold ${getExtBadgeStyle(ext)}`}
                            >
                              {ext}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-bold text-slate-900">{doc.title}</div>
                            {doc.description && (
                              <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                {doc.description}
                              </div>
                            )}
                            <div className="text-[11px] font-mono text-slate-400 mt-1">
                              {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border ${
                                isPublicBucket
                                  ? 'bg-sky-50 border-sky-200 text-[#0284C7]'
                                  : 'bg-amber-50 border-amber-200 text-amber-700'
                              }`}
                            >
                              {isPublicBucket ? (
                                <>
                                  <Globe className="w-3 h-3" />
                                  <span>Public</span>
                                </>
                              ) : (
                                <>
                                  <FolderLock className="w-3 h-3" />
                                  <span>Nội bộ</span>
                                </>
                              )}
                            </span>
                            {linkedLesson && (
                              <div className="mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => onOpenLesson(linkedLesson.id)}
                                  className="text-xs text-[#0284C7] hover:underline text-left cursor-pointer"
                                >
                                  {linkedModule ? `${linkedModule.title}: ` : ''}
                                  {linkedLesson.title}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 align-top text-right">
                            <button
                              type="button"
                              disabled={downloadingId === doc.id}
                              onClick={() => downloadDocument(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#0284C7] text-xs font-bold cursor-pointer whitespace-nowrap disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>
                                {downloadingId === doc.id ? 'Đang tạo...' : 'Tải file'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Right Sidebar: Filter by Module + Security Summary */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-slate-900">Lọc theo Module</h2>
                <p className="text-[11px] font-mono text-[#0284C7] uppercase">
                  Phân nhóm tài liệu đào tạo
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModuleFilter('all')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    moduleFilter === 'all'
                      ? 'bg-sky-50 border-[#0284C7] text-[#0284C7] font-bold'
                      : 'bg-[#F8FAFC] border-slate-200/80 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>Tất cả tài liệu</span>
                  <span className="font-mono">{allDocuments.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModuleFilter('unassigned')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    moduleFilter === 'unassigned'
                      ? 'bg-sky-50 border-[#0284C7] text-[#0284C7] font-bold'
                      : 'bg-[#F8FAFC] border-slate-200/80 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>Thư viện tiêu chuẩn chung</span>
                  <span className="font-mono">{moduleCounts.generalCount}</span>
                </button>

                {modules.map((mod, idx) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setModuleFilter(mod.id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                      moduleFilter === mod.id
                        ? 'bg-sky-50 border-[#0284C7] text-[#0284C7] font-bold'
                        : 'bg-[#F8FAFC] border-slate-200/80 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] font-bold text-slate-600 shrink-0">
                        M{idx + 1}
                      </span>
                      <span className="truncate">{mod.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-slate-500">
                      <span>{moduleCounts.counts.get(mod.id) ?? 0}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Cơ chế bảo vệ tài liệu gốc</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tài liệu nội bộ nằm trong bucket private <code className="font-mono text-[#0284C7]">training-documents</code> và được cấp link tải tạm thời (Signed URL 120 giây) chỉ cho tài khoản đã đăng nhập.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </RoleGate>
  );
};
