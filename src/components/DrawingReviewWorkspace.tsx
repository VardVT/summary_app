import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  Layers, 
  Filter, 
  Trash2, 
  Eye,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProject';
import { useNotifications } from '../hooks/useNotifications';
import { DEFAULT_DIRECTORY_USERS } from '../context/AuthContext';
import { UserProfile } from '../types';

interface MarkupPin {
  id: string;
  page: number;
  x: number; // percentage
  y: number; // percentage
  title: string;
  desc: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  author: string;
  assigneeEmail: string;
  assigneeName: string;
  createdAt: string;
}

export const DrawingReviewWorkspace: React.FC = () => {
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const { addNotification } = useNotifications();

  // PDF & Page State
  const [pdfFileName, setPdfFileName] = useState<string>('NB994 Piping dwg plan - W51.pdf');
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(4);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);

  // Engineers list from directory
  const engineers = DEFAULT_DIRECTORY_USERS.filter(u => u.role !== 'viewer');
  const [selectedAssignee, setSelectedAssignee] = useState<UserProfile>(engineers[0] || DEFAULT_DIRECTORY_USERS[0]);

  // Markup Pins & Comments State
  const [pins, setPins] = useState<MarkupPin[]>([
    {
      id: 'pin-1',
      page: 1,
      x: 35,
      y: 42,
      title: 'Clash with Cable Tray in Zone 3',
      desc: 'Piping line ISO-PP-0123 intersects electrical cable tray 300mm at FR 45. Needs rerouting.',
      priority: 'high',
      status: 'open',
      author: user?.name || 'Phan Trọng Khôi',
      assigneeEmail: 'nguyen.van.huy@vard.com',
      assigneeName: 'Nguyễn Văn Huy',
      createdAt: '10:15 AM',
    },
    {
      id: 'pin-2',
      page: 1,
      x: 68,
      y: 75,
      title: 'Valves Accessibility Issue',
      desc: 'Manual valve V-102 is located 2.3m above deck without platform access. Add chain lever or platform.',
      priority: 'medium',
      status: 'in_progress',
      author: user?.name || 'Nguyễn Trần Hưng',
      assigneeEmail: 'ngo.thinh.duy@vard.com',
      assigneeName: 'Ngô Thịnh Duy',
      createdAt: '09:40 AM',
    }
  ]);

  // New pin form state
  const [activeCoords, setActiveCoords] = useState<{ x: number; y: number } | null>(null);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle PDF File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPdfObjectUrl(objectUrl);
      setPdfFileName(file.name);
      setTotalPages(5); // Default multi-page representation for uploaded PDF
      setCurrentPage(1);
      setSuccessBanner(`Đã tải lên file PDF bản vẽ thành công: ${file.name}. Bản vẽ đã hiển thị trên màn hình!`);
      setTimeout(() => setSuccessBanner(null), 5000);
    }
  };

  // Handle Canvas Click to drop pin
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.round((clickX / rect.width) * 100);
    const yPercent = Math.round((clickY / rect.height) * 100);

    setActiveCoords({ x: xPercent, y: yPercent });
    setNewTitle('');
    setNewDesc('');
  };

  // Submit new comment pin & notify assignee
  const handleCreatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCoords || !newTitle.trim()) return;

    const newPin: MarkupPin = {
      id: `pin-${Date.now()}`,
      page: currentPage,
      x: activeCoords.x,
      y: activeCoords.y,
      title: newTitle.trim(),
      desc: newDesc.trim() || 'Không có mô tả chi tiết.',
      priority: newPriority,
      status: 'open',
      author: user?.name || 'VARD Engineer',
      assigneeEmail: selectedAssignee.email,
      assigneeName: selectedAssignee.name,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setPins([newPin, ...pins]);
    setActiveCoords(null);

    // Dispatch notification to assigned engineer
    addNotification(
      `[Drawing Review] Bình luận mới trên bản vẽ ${pdfFileName} (Trang ${currentPage})`,
      `${user?.name || 'Đồng nghiệp'} đã giao task review cho bạn: "${newTitle}" (${pdfFileName} - Trang ${currentPage})`,
      'drawing',
      'drawing-review'
    );

    setSuccessBanner(`Đã gửi thông báo comment đến kỹ sư phụ trách: ${selectedAssignee.name} (${selectedAssignee.email})`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // Filtered pins for current page
  const currentPagePins = pins.filter(p => p.page === currentPage && (filterStatus === 'all' || p.status === filterStatus));

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full bg-[#0B1F33] text-slate-100 overflow-hidden font-sans">
      
      {/* Top Control Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white font-sans truncate max-w-[280px]">
                {pdfFileName}
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono">
                Project {selectedProject.code}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Trang {currentPage} / {totalPages} bản vẽ trong file PDF · Click thẳng vào bản vẽ để đánh dấu comment
            </p>
          </div>
        </div>

        {/* Upload new PDF button */}
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span>Tải Lên File PDF Bản Vẽ Mới</span>
            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 text-emerald-300 text-xs font-mono flex items-center justify-between shrink-0 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-white text-xs cursor-pointer">✕</button>
        </div>
      )}

      {/* Main Workspace Grid: Left = PDF/Drawing Canvas, Right = Comments & Assignee Panel */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* Left Area: Drawing Viewer Canvas */}
        <div className="flex-1 flex flex-col bg-slate-950 relative min-h-0 overflow-hidden">
          
          {/* Canvas Toolbar (Zoom, Page navigation) */}
          <div className="h-12 bg-slate-900/80 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">Bản Vẽ Trang:</span>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-amber-400 px-2">{currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 font-mono text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <button onClick={() => setZoom(z => Math.max(75, z - 25))} className="p-1 text-slate-400 hover:text-white cursor-pointer"><ZoomOut className="w-3.5 h-3.5" /></button>
                <span className="text-cyan-400 font-bold w-12 text-center">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-1 text-slate-400 hover:text-white cursor-pointer"><ZoomIn className="w-3.5 h-3.5" /></button>
              </div>

              <button 
                onClick={() => setZoom(100)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 cursor-pointer"
                title="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* PDF Interactive Drawing Canvas Area */}
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center relative bg-[#091420]">
            <div 
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="relative bg-white rounded-xl shadow-2xl overflow-hidden cursor-crosshair border border-slate-700 transition-transform origin-center"
              style={{ 
                width: `${900 * (zoom / 100)}px`, 
                height: `${620 * (zoom / 100)}px`,
              }}
            >
              {/* If user uploaded a PDF, display the actual PDF file via iframe/object; otherwise display VARD piping blueprint */}
              {pdfObjectUrl ? (
                <iframe
                  src={`${pdfObjectUrl}#page=${currentPage}`}
                  title={pdfFileName}
                  className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                />
              ) : (
                <div className="absolute inset-0 p-8 flex flex-col justify-between text-slate-800 select-none pointer-events-none bg-white">
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                    <div>
                      <h3 className="font-mono font-bold text-lg tracking-wider">VARD SHIPBUILDING & OFFSHORE</h3>
                      <p className="font-mono text-xs text-slate-600">Piping Isometric & Arrangement Plan · Sheet {currentPage} of {totalPages}</p>
                    </div>
                    <div className="text-right font-mono text-xs border border-slate-900 p-2 rounded">
                      <div><strong>DWG NO:</strong> NB994-ISO-W51-0{currentPage}</div>
                      <div><strong>REV:</strong> C (FOR APPROVAL)</div>
                      <div><strong>SYSTEM:</strong> BALLAST & BILGE</div>
                    </div>
                  </div>

                  <div className="relative flex-1 my-4 border border-dashed border-slate-400 rounded-lg flex items-center justify-center bg-slate-50/50">
                    <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                      <path d="M 100 100 L 400 100 L 400 300 L 700 300" stroke="#0f172a" strokeWidth="6" fill="none" />
                      <path d="M 200 450 L 500 450 L 500 200 L 650 200" stroke="#0284c7" strokeWidth="4" fill="none" strokeDasharray="8 4" />
                      <circle cx="400" cy="100" r="10" fill="#0f172a" />
                      <circle cx="500" cy="450" r="10" fill="#0284c7" />
                    </svg>
                    <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/80 px-4 py-2 rounded border border-slate-300">
                      [ BẢN VẼ MẪU VARD - TRANG {currentPage} ] - Click bất kỳ đâu để ghim comment
                    </span>
                  </div>

                  <div className="border-t-2 border-slate-950 pt-2 flex justify-between items-center font-mono text-[11px] text-slate-700">
                    <div>SCALE: NTS | DRAWN BY: VARD TEAM</div>
                    <div>FILE: {pdfFileName}</div>
                    <div>STATUS: PENDING REVIEW</div>
                  </div>
                </div>
              )}

              {/* Render Markup Pins on Canvas */}
              {currentPagePins.map(pin => (
                <div
                  key={pin.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-20 pointer-events-auto"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold font-mono text-xs shadow-lg border-2 text-white ${
                    pin.priority === 'high' ? 'bg-red-600 border-white animate-pulse' :
                    pin.priority === 'medium' ? 'bg-amber-500 border-white' : 'bg-blue-600 border-white'
                  }`}>
                    <MapPin className="w-4 h-4" />
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute left-1/2 bottom-full mb-2 transform -translate-x-1/2 hidden group-hover:block w-64 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-slate-100 z-30 pointer-events-none">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-amber-400">{pin.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">{pin.assigneeName}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mb-2 leading-snug">{pin.desc}</p>
                    <div className="text-[10px] font-mono text-slate-500 flex justify-between">
                      <span>{pin.author}</span>
                      <span>{pin.createdAt}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Active Pin Placement Dialog Popup on Canvas */}
              {activeCoords && (
                <div 
                  className="absolute z-30 bg-slate-900 border border-amber-500/80 rounded-2xl p-4 shadow-2xl w-80 text-xs"
                  style={{ 
                    left: `clamp(20px, ${activeCoords.x}%, calc(100% - 340px))`, 
                    top: `clamp(20px, ${activeCoords.y}%, calc(100% - 380px))` 
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <span className="font-bold text-amber-400 font-mono flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-400" />
                      <span>Thêm Comment Bản Vẽ (Trang {currentPage})</span>
                    </span>
                    <button onClick={() => setActiveCoords(null)} className="text-slate-400 hover:text-white cursor-pointer font-bold">✕</button>
                  </div>

                  <form onSubmit={handleCreatePin} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Tiêu Đề Comment / Redline</label>
                      <input 
                        type="text" 
                        required
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Ví dụ: Lỗi giao cắt ống tại FR 45..."
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Mô Tả Chi Tiết</label>
                      <textarea 
                        rows={2}
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                        placeholder="Ghi chú kỹ thuật cho bản vẽ..."
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 text-xs resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Mức Độ (Priority)</label>
                        <select 
                          value={newPriority}
                          onChange={e => setNewPriority(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs cursor-pointer"
                        >
                          <option value="high">Cao (High)</option>
                          <option value="medium">Trung Bình</option>
                          <option value="low">Thấp (Low)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Giao Kỹ Sư Phụ Trách</label>
                        <select 
                          value={selectedAssignee.email}
                          onChange={e => {
                            const found = engineers.find(eng => eng.email === e.target.value);
                            if (found) setSelectedAssignee(found);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs cursor-pointer truncate"
                        >
                          {engineers.map(eng => (
                            <option key={eng.email} value={eng.email}>
                              {eng.name} ({eng.section || eng.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button 
                        type="button" 
                        onClick={() => setActiveCoords(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi & Báo Cáo Kỹ Sư</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Area: Comments & Assigned Engineer Inbox */}
        <div className="w-full lg:w-[380px] bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
            <span className="font-bold text-xs text-amber-400 font-mono flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Danh Sách Comment (Trang {currentPage}) ({currentPagePins.length})</span>
            </span>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="open">Mới (Open)</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="resolved">Đã duyệt</option>
            </select>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {currentPagePins.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                Chưa có comment nào trên trang này.<br />Click vào bản vẽ để ghim comment.
              </div>
            ) : (
              currentPagePins.map(pin => (
                <div key={pin.id} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-white font-sans">{pin.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono border shrink-0 ${
                      pin.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                      pin.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}>
                      {pin.priority.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {pin.desc}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-1.5 text-cyan-400">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[150px]" title={pin.assigneeName}>Giao: {pin.assigneeName}</span>
                    </div>
                    <span className="text-slate-500">{pin.createdAt}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Notice */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 text-[10px] font-mono text-slate-400 text-center shrink-0">
            Hệ thống tự động đồng bộ tin nhắn thông báo đến kỹ sư phụ trách
          </div>
        </div>

      </div>
    </div>
  );
};
