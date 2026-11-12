import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Upload, 
  FileText, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  Maximize2, 
  FolderOpen, 
  X, 
  Sparkles, 
  UserCheck,
  Download,
  FileCode
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProject';
import { useNotifications } from '../hooks/useNotifications';
import { DEFAULT_DIRECTORY_USERS } from '../context/AuthContext';
import { UserProfile } from '../types';
import { jsPDF } from 'jspdf';
import { 
  DxfData, 
  parseDxf, 
  renderDxfToCanvas, 
  exportDxfToPdf, 
  exportDxfWithMarkups, 
  generateCadDxfFromPdfPins,
  downloadDxfFile 
} from '../utils/dxfHandler';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
}

// PIC / DRAWN Abbreviation mapping to VARD Engineers
export const PIC_ABBREVIATIONS: Record<string, string> = {
  // Tran Quoc
  'TQ': 'tran.quoc@vard.com',
  'T.Q': 'tran.quoc@vard.com',
  'T.Q.': 'tran.quoc@vard.com',
  'QuocT': 'tran.quoc@vard.com',
  'Tran Quoc': 'tran.quoc@vard.com',

  // Phan Trong Khoi
  'PTK': 'phan.trong.khoi@vard.com',
  'P.T.K': 'phan.trong.khoi@vard.com',
  'P.T.K.': 'phan.trong.khoi@vard.com',
  'KhoiPT': 'phan.trong.khoi@vard.com',
  'Khoi': 'phan.trong.khoi@vard.com',
  'Phan Trong Khoi': 'phan.trong.khoi@vard.com',

  // Nguyen Tran Hung
  'NTH': 'nguyen.tran.hung@vard.com',
  'N.T.H': 'nguyen.tran.hung@vard.com',
  'N.T.H.': 'nguyen.tran.hung@vard.com',
  'HungNT': 'nguyen.tran.hung@vard.com',
  'Hung': 'nguyen.tran.hung@vard.com',
  'Nguyen Tran Hung': 'nguyen.tran.hung@vard.com',

  // Nguyen Van Huy
  'NVH': 'nguyen.van.huy@vard.com',
  'N.V.H': 'nguyen.van.huy@vard.com',
  'N.V.H.': 'nguyen.van.huy@vard.com',
  'HuyNV': 'nguyen.van.huy@vard.com',
  'Huy': 'nguyen.van.huy@vard.com',
  'Nguyen Van Huy': 'nguyen.van.huy@vard.com',

  // Ngo Thinh Duy
  'NTD': 'ngo.thinh.duy@vard.com',
  'N.T.D': 'ngo.thinh.duy@vard.com',
  'N.T.D.': 'ngo.thinh.duy@vard.com',
  'DuyNT': 'ngo.thinh.duy@vard.com',
  'Ngo Thinh Duy': 'ngo.thinh.duy@vard.com',

  // Lam Thi Thuy Trang
  'LTTT': 'lam.thi.thuy.trang@vard.com',
  'L.T.T.T': 'lam.thi.thuy.trang@vard.com',
  'L.T.T.T.': 'lam.thi.thuy.trang@vard.com',
  'TrangLT': 'lam.thi.thuy.trang@vard.com',
  'TrangLTT': 'lam.thi.thuy.trang@vard.com',
  'Trang': 'lam.thi.thuy.trang@vard.com',
  'Lam Thi Thuy Trang': 'lam.thi.thuy.trang@vard.com',

  // Tran Van Chuyen
  'TVC': 'tran.van.chuyen@vard.com',
  'T.V.C': 'tran.van.chuyen@vard.com',
  'T.V.C.': 'tran.van.chuyen@vard.com',
  'Chuyen': 'tran.van.chuyen@vard.com',
  'Tran Van Chuyen': 'tran.van.chuyen@vard.com',

  // Nguyen Dong Hop
  'NDH': 'nguyen.dong.hop@vard.com',
  'N.D.H': 'nguyen.dong.hop@vard.com',
  'N.D.H.': 'nguyen.dong.hop@vard.com',
  'HopND': 'nguyen.dong.hop@vard.com',
  'Hop': 'nguyen.dong.hop@vard.com',
  'Nguyen Dong Hop': 'nguyen.dong.hop@vard.com',

  // Nguyen Danh Duy
  'NDD': 'nguyen.danh.duy@vard.com',
  'N.D.D': 'nguyen.danh.duy@vard.com',
  'N.D.D.': 'nguyen.danh.duy@vard.com',
  'DuyND': 'nguyen.danh.duy@vard.com',
  'Duy': 'nguyen.danh.duy@vard.com',
  'Nguyen Danh Duy': 'nguyen.danh.duy@vard.com',

  // Dang Duy Hoang
  'DDH': 'dang.duy.hoang@vard.com',
  'D.D.H': 'dang.duy.hoang@vard.com',
  'D.D.H.': 'dang.duy.hoang@vard.com',
  'HoangDD': 'dang.duy.hoang@vard.com',
  'Hoang': 'dang.duy.hoang@vard.com',
  'Dang Duy Hoang': 'dang.duy.hoang@vard.com',

  // Nguyen Huy Thinh
  'NHT': 'nguyen.huy.thinh@vard.com',
  'N.H.T': 'nguyen.huy.thinh@vard.com',
  'N.H.T.': 'nguyen.huy.thinh@vard.com',
  'ThinhNH': 'nguyen.huy.thinh@vard.com',
  'Thinh': 'nguyen.huy.thinh@vard.com',
  'Nguyen Huy Thinh': 'nguyen.huy.thinh@vard.com',

  // Ho Thanh Tuat
  'HTT': 'ho.thanh.tuat@vard.com',
  'H.T.T': 'ho.thanh.tuat@vard.com',
  'H.T.T.': 'ho.thanh.tuat@vard.com',
  'TuatHT': 'ho.thanh.tuat@vard.com',
  'Tuat': 'ho.thanh.tuat@vard.com',
  'Ho Thanh Tuat': 'ho.thanh.tuat@vard.com',

  // Le Chau
  'LC': 'le.chau@vard.com',
  'L.C': 'le.chau@vard.com',
  'L.C.': 'le.chau@vard.com',
  'ChauL': 'le.chau@vard.com',
  'Chau': 'le.chau@vard.com',
  'Le Chau': 'le.chau@vard.com',

  // To My Bon
  'TMB': 'to.my.bon@vard.com',
  'T.M.B': 'to.my.bon@vard.com',
  'T.M.B.': 'to.my.bon@vard.com',
  'BonTM': 'to.my.bon@vard.com',
  'Bon': 'to.my.bon@vard.com',
  'To My Bon': 'to.my.bon@vard.com',

  // Nguyen Van Thao
  'NVT': 'nguyen.van.thao@vard.com',
  'N.V.T': 'nguyen.van.thao@vard.com',
  'N.V.T.': 'nguyen.van.thao@vard.com',
  'ThaoNV': 'nguyen.van.thao@vard.com',
  'Thao': 'nguyen.van.thao@vard.com',
  'Nguyen Van Thao': 'nguyen.van.thao@vard.com',

  // Nguyen Hung Phat
  'NHP': 'nguyen.hung.phat@vard.com',
  'N.H.P': 'nguyen.hung.phat@vard.com',
  'N.H.P.': 'nguyen.hung.phat@vard.com',
  'PhatNH': 'nguyen.hung.phat@vard.com',
  'Phat': 'nguyen.hung.phat@vard.com',
  'Nguyen Hung Phat': 'nguyen.hung.phat@vard.com',

  // Nguyen Van Anh
  'NVA': 'nguyen.van.anh@vard.com',
  'N.V.A': 'nguyen.van.anh@vard.com',
  'N.V.A.': 'nguyen.van.anh@vard.com',
  'AnhNV': 'nguyen.van.anh@vard.com',
  'Anh': 'nguyen.van.anh@vard.com',
  'Nguyen Van Anh': 'nguyen.van.anh@vard.com',

  // Tran Thi Ngoc Bich
  'TTNB': 'tran.thi.ngoc.bich@vard.com',
  'T.T.N.B': 'tran.thi.ngoc.bich@vard.com',
  'T.T.N.B.': 'tran.thi.ngoc.bich@vard.com',
  'BichTTN': 'tran.thi.ngoc.bich@vard.com',
  'Bich': 'tran.thi.ngoc.bich@vard.com',
  'Tran Thi Ngoc Bich': 'tran.thi.ngoc.bich@vard.com',

  // Nguyen Quoc Toan
  'NQT': 'nguyen.quoc.toan@vard.com',
  'Toan': 'nguyen.quoc.toan@vard.com',
  'ToanNQ': 'nguyen.quoc.toan@vard.com',
  'Nguyen Quoc Toan': 'nguyen.quoc.toan@vard.com',

  // Le Quang Vinh
  'LQV': 'le.quang.vinh@vard.com',
  'VinhLQ': 'le.quang.vinh@vard.com',
  'Vinh': 'le.quang.vinh@vard.com',
  'Le Quang Vinh': 'le.quang.vinh@vard.com',

  // Tran Duc Huy
  'TDH': 'tran.duc.huy@vard.com',
  'HuyTD': 'tran.duc.huy@vard.com',
  'Tran Duc Huy': 'tran.duc.huy@vard.com',

  // Nguyen Van Kien
  'NVK': 'nguyen.van.kien@vard.com',
  'KienNV': 'nguyen.van.kien@vard.com',
  'Kien': 'nguyen.van.kien@vard.com',
  'Nguyen Van Kien': 'nguyen.van.kien@vard.com',

  // Hoang Manh Thang
  'HMT': 'hoang.manh.thang@vard.com',
  'ThangHM': 'hoang.manh.thang@vard.com',
  'Thang': 'hoang.manh.thang@vard.com',
  'Hoang Manh Thang': 'hoang.manh.thang@vard.com',
};

export interface DrawnDetection {
  code: string;
  engineer: UserProfile | null;
  autoDetected: boolean;
  status: 'detected' | 'unrecognized' | 'scanning';
}

export interface MarkupPin {
  id: string;
  page: number;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  title: string;
  desc: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  author: string;
  assigneeEmail: string;
  assigneeName: string;
  drawnByCode?: string;
  createdAt: string;
  updatedAt?: string;
}

// Directory engineers (excluding pure viewers)
export const VARD_ENGINEERS = DEFAULT_DIRECTORY_USERS.filter(u => u.role !== 'viewer');

// Helper to resolve an engineer profile from any detected DRAWN string
export function resolveEngineerFromDrawnCode(rawCode: string): { code: string; engineer: UserProfile | null } {
  if (!rawCode || !rawCode.trim()) {
    return { code: '', engineer: null };
  }

  // Strip leading prefixes like "BY:", "BY ", "DRAWN:", trailing punctuation
  const trimmed = rawCode.trim().replace(/^(?:DRAWN|DWN|DESIGNED|PIC|BY)[:\s\-]+/i, '').trim();
  const withoutTrailing = trimmed.replace(/[:;,]+$/, '').trim();
  const withoutDot = withoutTrailing.replace(/\.$/, '').trim();
  const norm = trimmed.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  if (!trimmed || trimmed.toUpperCase() === 'BY') {
    return { code: '', engineer: null };
  }

  // 1. Direct dictionary lookup
  const directEmail = PIC_ABBREVIATIONS[trimmed] || 
                      PIC_ABBREVIATIONS[trimmed.toUpperCase()] ||
                      PIC_ABBREVIATIONS[withoutTrailing] ||
                      PIC_ABBREVIATIONS[withoutDot] ||
                      PIC_ABBREVIATIONS[norm];

  if (directEmail) {
    const match = VARD_ENGINEERS.find(e => e.email.toLowerCase() === directEmail.toLowerCase());
    if (match) return { code: trimmed, engineer: match };
  }

  // 2. Alphanumeric normalized lookup across all keys
  for (const [key, em] of Object.entries(PIC_ABBREVIATIONS)) {
    const normKey = key.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (normKey && normKey === norm) {
      const match = VARD_ENGINEERS.find(e => e.email.toLowerCase() === em.toLowerCase());
      if (match) return { code: trimmed, engineer: match };
    }
  }

  // 3. Match against Vietnamese name or email username
  const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const unaccented = stripAccents(trimmed);

  const matchByName = VARD_ENGINEERS.find(e => {
    const normName = stripAccents(e.name);
    const emailPrefix = e.email.split('@')[0].toLowerCase().replace(/\./g, ' ');
    return normName.includes(unaccented) || emailPrefix.includes(unaccented);
  });
  if (matchByName) return { code: trimmed, engineer: matchByName };

  // 4. Initials match (e.g. "Nguyen Tran Hung" -> "NTH")
  for (const eng of VARD_ENGINEERS) {
    const words = stripAccents(eng.name).split(/\s+/).filter(Boolean);
    const initials = words.map(w => w[0]).join('').toUpperCase();
    if (initials === norm) {
      return { code: trimmed, engineer: eng };
    }
  }

  return { code: trimmed, engineer: null };
}

// Pure async function to parse DRAWN information from a PDF.js page
export async function parseDrawnFromPage(page: any): Promise<DrawnDetection> {
  try {
    const textContent = await page.getTextContent({ includeMarkedContent: true });
    const rawItems: string[] = (textContent.items || [])
      .map((it: any) => (typeof it.str === 'string' ? it.str.trim() : ''))
      .filter((s: string) => s.length > 0);

    // If textContent was empty, also check annotations (AutoCAD SHX text comments)
    if (rawItems.length === 0 && typeof page.getAnnotations === 'function') {
      try {
        const annots = await page.getAnnotations();
        for (const a of (annots || [])) {
          if (a.contents && typeof a.contents === 'string') {
            rawItems.push(a.contents.trim());
          }
        }
      } catch (annotErr) {
        // ignore
      }
    }

    const compactText = rawItems.join(' ').replace(/\s+/g, ' ');
    let detected: { code: string; engineer: UserProfile | null } = { code: '', engineer: null };

    // Strategy 1: Targeted single token immediately following DRAWN / DWN / PIC (e.g. "DRAWN: N.D.D." -> "N.D.D.")
    const singleTokenMatch = compactText.match(/\b(?:DRAWN|DWN|DESIGNED|DES|DRAWER|PIC)\s*(?:BY)?\s*[:\s\-]*\s*([A-Za-z0-9._-]+)/i);
    if (singleTokenMatch && singleTokenMatch[1]) {
      const token = singleTokenMatch[1].trim();
      if (!/^(BY|DATE|REV|SCALE|TITLE|DWG|SHEET|MARKFC|ISO|SHIP|DIVISION|SYSTEM)$/i.test(token) && !/^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(token)) {
        const res = resolveEngineerFromDrawnCode(token);
        if (res.engineer) {
          detected = res;
        } else if (!detected.code) {
          detected = res;
        }
      }
    }

    // Strategy 2: Up to next CAD field label (stops before MARKFC, ISO, DATE, etc.)
    if (!detected.engineer) {
      const upToLabelMatch = compactText.match(/\b(?:DRAWN|DWN|DESIGNED|DES|DRAWER|PIC)\s*(?:BY)?\s*[:\s\-]*\s*([^:\n\r]+?)(?=\s+(?:MARKFC|ISO|SFI|INTERNAL|CHECKED|CHK|APPROVED|APP|DATE|REV|SCALE|SHEET|TITLE|SHIP|SYSTEM|SPEC|PALLET|DIV|STATUS|\d{1,4}[/-]\d{1,2}[/-]\d{1,4})\b|$)/i);
      if (upToLabelMatch && upToLabelMatch[1]) {
        const token = upToLabelMatch[1].trim();
        if (token && !/^(BY|DATE|REV|SCALE|TITLE|DWG|SHEET|MARKFC|ISO|SHIP)$/i.test(token)) {
          const res = resolveEngineerFromDrawnCode(token);
          if (res.engineer) {
            detected = res;
          }
        }
      }
    }

    // Strategy 3: Sequential item scan across CAD title block text elements
    if (!detected.engineer) {
      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        if (/\b(DRAWN|DWN|DESIGNED|DRAWER|PIC)\b/i.test(item)) {
          const inlineMatch = item.match(/\b(?:DRAWN|DWN|DESIGNED|PIC)\s*(?:BY)?\s*[:\s\-]*\s*([A-Za-z0-9._-]+)/i);
          if (inlineMatch?.[1]) {
            const res = resolveEngineerFromDrawnCode(inlineMatch[1]);
            if (res.engineer) {
              detected = res;
              break;
            }
          }

          for (let j = 1; j <= 4 && i + j < rawItems.length; j++) {
            const nextItem = rawItems[i + j].trim();
            if (/^(BY|:|-)$/i.test(nextItem)) continue;
            if (/^(DATE|REV|SCALE|TITLE|MARKFC|ISO|SHIP|DIVISION|SYSTEM|SITE|SPEC|PALLET)$/i.test(nextItem)) break;
            if (/^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(nextItem)) continue;

            const res = resolveEngineerFromDrawnCode(nextItem);
            if (res.engineer) {
              detected = res;
              break;
            }
          }
          if (detected.engineer) break;
        }
      }
    }

    // Strategy 4: High confidence scan for known engineer codes in the drawing text
    if (!detected.engineer) {
      const knownAbbrs = [
        'N.D.D.', 'N.D.D', 'NDD', 'DuyND',
        'T.Q.', 'T.Q', 'TQ', 'QuocT',
        'HungNT', 'N.T.H.', 'N.T.H', 'NTH',
        'KhoiPT', 'P.T.K.', 'P.T.K', 'PTK',
        'HuyNV', 'N.V.H.', 'N.V.H', 'NVH',
        'DuyNT', 'N.T.D.', 'N.T.D', 'NTD',
        'TrangLT', 'L.T.T.T.', 'L.T.T.T', 'LTTT', 'TrangLTT',
        'TVC', 'T.V.C.', 'T.V.C', 'Chuyen',
        'NDH', 'N.D.H.', 'N.D.H', 'HopND',
        'DDH', 'D.D.H.', 'D.D.H', 'HoangDD',
        'ThinhNH', 'N.H.T.', 'N.H.T', 'NHT',
        'TuatHT', 'H.T.T.', 'H.T.T', 'HTT',
        'ChauL', 'L.C.', 'L.C', 'LC',
        'BonTM', 'T.M.B.', 'T.M.B', 'TMB',
        'ThaoNV', 'N.V.T.', 'N.V.T', 'NVT',
        'PhatNH', 'N.H.P.', 'N.H.P', 'NHP',
        'AnhNV', 'N.V.A.', 'N.V.A', 'NVA',
        'BichTTN', 'T.T.N.B.', 'T.T.N.B', 'TTNB',
        'Toan', 'NQT', 'VinhLQ', 'LQV', 'HuyTD', 'TDH', 'KienNV', 'NVK', 'ThangHM', 'HMT'
      ];

      for (const abbr of knownAbbrs) {
        const regex = new RegExp(`\\b${abbr.replace(/\./g, '\\.')}\\b`, 'i');
        if (regex.test(compactText)) {
          const res = resolveEngineerFromDrawnCode(abbr);
          if (res.engineer) {
            detected = res;
            break;
          }
        }
      }
    }

    if (detected.engineer) {
      return {
        code: detected.code,
        engineer: detected.engineer,
        autoDetected: true,
        status: 'detected'
      };
    }

    return {
      code: detected.code || '',
      engineer: null,
      autoDetected: false,
      status: 'unrecognized'
    };
  } catch (err) {
    console.warn('parseDrawnFromPage error:', err);
    return {
      code: '',
      engineer: null,
      autoDetected: false,
      status: 'unrecognized'
    };
  }
}

export const DrawingReviewWorkspace: React.FC = () => {
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const { addNotification } = useNotifications();

  // Engineers list
  const engineers = VARD_ENGINEERS;

  // Helper callback for backwards compatibility
  const resolveEngineerFromDrawn = useCallback((code: string) => {
    return resolveEngineerFromDrawnCode(code);
  }, []);

  // PDF & DXF Document State
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [dxfData, setDxfData] = useState<DxfData | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'dxf' | null>(null);
  const [isExporting, setIsExporting] = useState<'pdf' | 'dwg' | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(110);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Per-page DRAWN cache
  const pageDrawnMapRef = useRef<Record<number, DrawnDetection>>({});
  const [currentDrawn, setCurrentDrawn] = useState<DrawnDetection>({
    code: '',
    engineer: null,
    autoDetected: false,
    status: 'scanning'
  });

  // Canvas and Overlay Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any | null>(null);

  // Markup Comments State
  const [pins, setPins] = useState<MarkupPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<MarkupPin | null>(null);
  const [activePinDraft, setActivePinDraft] = useState<{ x: number; y: number } | null>(null);

  // Edit/Create Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formPriority, setFormPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [formStatus, setFormStatus] = useState<'open' | 'in_progress' | 'resolved'>('open');
  const [formAssigneeEmail, setFormAssigneeEmail] = useState<string>('');

  // Mode & Filters
  const [toolMode, setToolMode] = useState<'comment' | 'pan'>('comment');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Load PDF Source
  const loadPdfSource = useCallback(async (source: ArrayBuffer | Uint8Array | string, fileName: string) => {
    setIsLoadingPdf(true);
    setRenderError(null);
    setDxfData(null);
    setFileType('pdf');
    pageDrawnMapRef.current = {};
    setCurrentDrawn({
      code: '',
      engineer: null,
      autoDetected: false,
      status: 'scanning'
    });

    try {
      const loadingTask = typeof source === 'string'
        ? pdfjsLib.getDocument({ url: source })
        : pdfjsLib.getDocument({ data: source });

      const loadedDoc = await loadingTask.promise;
      setPdfDoc(loadedDoc);
      setPdfFileName(fileName);
      setTotalPages(loadedDoc.numPages);
      setCurrentPage(1);

      // Immediately parse DRAWN for Page 1 on load without waiting
      try {
        const page1 = await loadedDoc.getPage(1);
        const drawn1 = await parseDrawnFromPage(page1);
        pageDrawnMapRef.current[1] = drawn1;
        setCurrentDrawn(drawn1);

        if (drawn1.engineer) {
          setBannerMessage(`Đã mở bản vẽ: ${fileName} (${loadedDoc.numPages} trang). Nhận diện DRAWN: ${drawn1.code} (${drawn1.engineer.name})`);
        } else {
          setBannerMessage(`Đã mở bản vẽ: ${fileName} (${loadedDoc.numPages} trang).`);
        }
      } catch (parseErr) {
        console.warn('Immediate parse error on Page 1:', parseErr);
        setBannerMessage(`Đã mở bản vẽ: ${fileName} (${loadedDoc.numPages} trang).`);
      }

      setTimeout(() => setBannerMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to load PDF:', err);
      setRenderError(`Không thể đọc file PDF: ${err?.message || 'Định dạng không hợp lệ'}`);
    } finally {
      setIsLoadingPdf(false);
    }
  }, []);

  // Load CAD DXF Source
  const loadDxfSource = useCallback(async (source: File | string, customName?: string) => {
    setIsLoadingPdf(true);
    setRenderError(null);
    setPdfDoc(null);
    pageDrawnMapRef.current = {};

    try {
      let textContent = '';
      let fileName = customName || 'Drawing.dxf';

      if (typeof source === 'string') {
        const res = await fetch(source);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Không tìm thấy file mẫu`);
        textContent = await res.text();
      } else {
        fileName = source.name;
        textContent = await source.text();
      }

      const parsed = parseDxf(textContent);
      setDxfData(parsed);
      setFileType('dxf');
      setPdfFileName(fileName);
      setTotalPages(1);
      setCurrentPage(1);

      pageDrawnMapRef.current[1] = parsed.drawnResult;
      setCurrentDrawn(parsed.drawnResult);

      if (parsed.drawnResult.engineer) {
        setBannerMessage(`Đã mở bản vẽ CAD DXF: ${fileName} (${parsed.entities.length} đối tượng CAD). Nhận diện DRAWN: ${parsed.drawnResult.code} (${parsed.drawnResult.engineer.name})`);
      } else {
        setBannerMessage(`Đã mở bản vẽ CAD DXF: ${fileName} (${parsed.entities.length} đối tượng CAD).`);
      }
      setTimeout(() => setBannerMessage(null), 4500);
    } catch (err: any) {
      console.error('Failed to load DXF:', err);
      setRenderError(`Không thể đọc file DXF: ${err?.message || 'Định dạng không hợp lệ'}`);
    } finally {
      setIsLoadingPdf(false);
    }
  }, []);

  // Handle User Uploading PDF or DXF file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const isDxf = file.name.toLowerCase().endsWith('.dxf');
      if (isDxf) {
        await loadDxfSource(file);
      } else {
        const buffer = await file.arrayBuffer();
        await loadPdfSource(buffer, file.name);
      }
      e.target.value = '';
    } catch (err: any) {
      setRenderError(`Lỗi đọc file: ${err?.message}`);
    }
  };

  // Load sample PDF
  const handleLoadSamplePdf = () => {
    loadPdfSource('./sample-drawing.pdf', 'NB994 Piping dwg plan - W51.pdf');
  };

  // Load sample CAD DXF
  const handleLoadSampleDxf = () => {
    loadDxfSource('./sample-piping-drawing.dxf', 'Piping-Isometric-N987.dxf');
  };

  // Export Branch 1: Export to High-Fidelity PDF with Markups and Summary Table
  const handleExportPdf = async () => {
    if (!dxfData && !pdfDoc) return;
    setIsExporting('pdf');
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Không tìm thấy canvas bản vẽ để xuất');

      let imgData = '';
      try {
        imgData = canvas.toDataURL('image/jpeg', 0.95);
      } catch (e) {
        imgData = canvas.toDataURL('image/png');
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      });

      const pdfW = pdf.internal.pageSize.getWidth(); // 420mm
      const pdfH = pdf.internal.pageSize.getHeight(); // 297mm

      // Header Banner
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pdfW, 15, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.text(`VARD PIPING DESIGN REVIEW - ${pdfFileName || 'Drawing'}`, 15, 10);
      pdf.setFontSize(8);
      pdf.setTextColor(203, 213, 225);
      pdf.text(`DỰ ÁN: ${selectedProject.name} | DRAWN: ${currentDrawn.code || 'N/A'} (${currentDrawn.engineer?.name || 'VARD'}) | NGÀY: ${new Date().toLocaleDateString()}`, 200, 10);

      // Scale drawing to fit without any distortion
      const maxW = pdfW - 20; // 400mm
      const maxH = pdfH - 32; // 265mm
      const canvasRatio = canvas.width / Math.max(1, canvas.height);
      let imgW = maxW;
      let imgH = imgW / canvasRatio;

      if (imgH > maxH) {
        imgH = maxH;
        imgW = imgH * canvasRatio;
      }

      const imgX = 10 + (maxW - imgW) / 2;
      const imgY = 18 + (maxH - imgH) / 2;

      pdf.addImage(imgData, 'JPEG', imgX, imgY, imgW, imgH);

      // Stamp Red Revision Pins at exact canvas locations
      pagePins.forEach((pin, idx) => {
        if (!isFinite(pin.x) || !isFinite(pin.y)) return;
        const pinX = imgX + (pin.x / 100) * imgW;
        const pinY = imgY + (pin.y / 100) * imgH;

        // Pin circle
        pdf.setFillColor(239, 68, 68);
        pdf.setDrawColor(185, 28, 28);
        pdf.circle(pinX, pinY, 3, 'FD');

        // Pin number
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.text(String(idx + 1), pinX, pinY + 0.9, { align: 'center' });
      });

      // If pagePins exist, add Page 2 with complete review log
      if (pagePins.length > 0) {
        pdf.addPage('a3', 'landscape');
        
        // Header
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pdfW, 18, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(13);
        pdf.text(`VARD PIPING ENGINEERING - BẢNG TỔNG HỢP GHI CHÚ REVIEW BẢN VẼ`, 15, 12);

        pdf.setFontSize(9);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Bản vẽ: ${pdfFileName} | Trang: ${currentPage}/${totalPages} | Người vẽ (DRAWN): ${currentDrawn.code || 'N/A'} (${currentDrawn.engineer?.name || 'VARD'})`, 15, 26);

        // Table Header
        pdf.setFillColor(241, 245, 249);
        pdf.rect(15, 32, pdfW - 30, 9, 'F');
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(8);
        pdf.text('#', 18, 38);
        pdf.text('TIÊU ĐỀ COMMENT', 28, 38);
        pdf.text('NỘI DUNG CHI TIẾT', 125, 38);
        pdf.text('ƯU TIÊN', 255, 38);
        pdf.text('TRẠNG THÁI', 285, 38);
        pdf.text('KỸ SƯ PHỤ TRÁCH (GỬI THÔNG BÁO)', 320, 38);

        let rowY = 46;
        pagePins.forEach((p, i) => {
          if (rowY > pdfH - 20) {
            pdf.addPage('a3', 'landscape');
            rowY = 25;
          }
          pdf.setDrawColor(226, 232, 240);
          pdf.line(15, rowY + 3, pdfW - 15, rowY + 3);

          pdf.setTextColor(239, 68, 68);
          pdf.text(`[${i + 1}]`, 18, rowY);
          pdf.setTextColor(15, 23, 42);
          pdf.text(String(p.title || '').substring(0, 48), 28, rowY);
          pdf.setTextColor(71, 85, 105);
          pdf.text(String(p.desc || 'Không có mô tả chi tiết').substring(0, 65), 125, rowY);
          
          if (p.priority === 'high') pdf.setTextColor(220, 38, 38);
          else if (p.priority === 'medium') pdf.setTextColor(217, 119, 6);
          else pdf.setTextColor(37, 99, 235);
          pdf.text(p.priority.toUpperCase(), 255, rowY);

          pdf.setTextColor(15, 23, 42);
          pdf.text(p.status.toUpperCase(), 285, rowY);
          pdf.text(`${p.assigneeName || 'VARD'}`, 320, rowY);

          rowY += 10;
        });
      }

      const cleanName = (pdfFileName || 'drawing').replace(/\.[^/.]+$/, '');
      pdf.save(`${cleanName}_reviewed_p${currentPage}.pdf`);
      setBannerMessage(`✅ Đã xuất bản vẽ PDF thành công (${pagePins.length} vị trí comment kèm bảng ghi chú)!`);
      setTimeout(() => setBannerMessage(null), 4500);
    } catch (err: any) {
      console.error('Export PDF error:', err);
      // Fallback for DXF if canvas capture failed
      if (dxfData) {
        try {
          await exportDxfToPdf(dxfData, pagePins, pdfFileName, selectedProject.name);
          setBannerMessage(`✅ Đã xuất bản vẽ PDF thành công!`);
          setTimeout(() => setBannerMessage(null), 4000);
          return;
        } catch (fbErr: any) {
          setRenderError(`Lỗi khi xuất PDF: ${fbErr?.message || err?.message}`);
        }
      } else {
        setRenderError(`Lỗi khi xuất PDF: ${err?.message}`);
      }
    } finally {
      setIsExporting(null);
    }
  };

  // Export Branch 2: Export DWG-Ready (AutoCAD-compatible CAD file with VARD_MARKUP_REVIEW layer)
  const handleExportDwgReady = () => {
    setIsExporting('dwg');
    try {
      const cleanName = (pdfFileName || 'drawing').replace(/\.[^/.]+$/, '');

      if (dxfData) {
        const modifiedDxf = exportDxfWithMarkups(dxfData.rawContent, pagePins, dxfData);
        downloadDxfFile(modifiedDxf, `${cleanName}_REVIEWED_DWG_READY.dxf`);
        setBannerMessage(`✅ Đã xuất file CAD (DWG-Ready) thành công! File chứa layer VARD_MARKUP_REVIEW chuẩn AutoCAD. Mở trong AutoCAD và bấm Save As sang .DWG.`);
      } else {
        // PDF Drawing: Generate valid AutoCAD DXF with drawing borders, title block and review pins
        const generatedDxf = generateCadDxfFromPdfPins(
          pagePins, 
          pdfFileName || 'Piping_Drawing', 
          currentDrawn.code || 'VARD',
          currentDrawn.engineer?.name || 'VARD Engineer'
        );
        downloadDxfFile(generatedDxf, `${cleanName}_CAD_MARKUPS.dxf`);
        setBannerMessage(`✅ Đã xuất file CAD (DWG-Ready) chứa các tọa độ markup review từ bản vẽ PDF! Mở trong AutoCAD/BricsCAD để lưu sang .DWG.`);
      }
      setTimeout(() => setBannerMessage(null), 6000);
    } catch (err: any) {
      console.error('Export CAD error:', err);
      setRenderError(`Lỗi khi xuất file CAD: ${err?.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  // Extract DRAWN code on page change (isolated, stable dependencies, no canvas loop)
  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;

    // Check cache first for this specific page
    if (pageDrawnMapRef.current[currentPage]) {
      setCurrentDrawn(pageDrawnMapRef.current[currentPage]);
      return;
    }

    pdfDoc.getPage(currentPage).then(async (page: any) => {
      if (isCancelled) return;
      const info = await parseDrawnFromPage(page);
      if (isCancelled) return;
      pageDrawnMapRef.current[currentPage] = info;
      setCurrentDrawn(info);
    }).catch((err: any) => {
      console.warn('Page text extraction error:', err);
      const fallbackInfo: DrawnDetection = {
        code: '',
        engineer: null,
        autoDetected: false,
        status: 'unrecognized'
      };
      if (!isCancelled) {
        pageDrawnMapRef.current[currentPage] = fallbackInfo;
        setCurrentDrawn(fallbackInfo);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage]);

  // Render DXF CAD Drawing onto Canvas
  useEffect(() => {
    if (!dxfData || !canvasRef.current || fileType !== 'dxf') return;

    try {
      setIsRenderingPage(true);
      const canvas = canvasRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const scale = Math.min(Math.max(0.4, zoom / 100), 2.2);

      const widthSpan = Math.max(1, dxfData.bbox.width);
      const heightSpan = Math.max(1, dxfData.bbox.height);
      const aspect = widthSpan / heightSpan;

      const baseWidth = 1400;
      const cssW = Math.round(baseWidth * scale);
      const validAspect = (aspect > 0.2 && aspect < 5) ? aspect : 1.414;
      const cssH = Math.round(cssW / validAspect);

      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      if (overlayRef.current) {
        overlayRef.current.style.width = `${cssW}px`;
        overlayRef.current.style.height = `${cssH}px`;
      }

      renderDxfToCanvas(dxfData, canvas, {
        backgroundColor: '#07111e',
        lineColor: '#38BDF8',
      });
    } catch (err: any) {
      console.error('DXF Canvas Render error:', err);
      setRenderError(`Lỗi hiển thị bản vẽ DXF: ${err?.message}`);
    } finally {
      setIsRenderingPage(false);
    }
  }, [dxfData, zoom, fileType]);

  // Render PDF Page with debounce and strict memory protection
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || fileType !== 'pdf') return;
    let isCancelled = false;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    setIsRenderingPage(true);

    const renderTimer = setTimeout(async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Cap DPR to 1.5 to prevent memory explosion/tab crashing
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const scale = Math.min(Math.max(0.4, zoom / 100), 2.0) * dpr;
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const cssW = Math.round(viewport.width / dpr);
        const cssH = Math.round(viewport.height / dpr);
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;

        if (overlayRef.current) {
          overlayRef.current.style.width = `${cssW}px`;
          overlayRef.current.style.height = `${cssH}px`;
        }

        const task = page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') return;
        console.error('Page render error:', err);
      } finally {
        if (!isCancelled) setIsRenderingPage(false);
      }
    }, 60);

    return () => {
      isCancelled = true;
      clearTimeout(renderTimer);
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, zoom, fileType]);

  // Click on Canvas/Overlay to place a new pin
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current || toolMode !== 'comment') return;

    const rect = overlayRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.min(100, Math.max(0, (clickX / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, (clickY / rect.height) * 100));

    setActivePinDraft({ x: xPercent, y: yPercent });
    setFormTitle('');
    setFormDesc('');
    setFormPriority('medium');
    setFormStatus('open');
    setFormAssigneeEmail(currentDrawn.engineer?.email || engineers[0]?.email || '');
    setModalMode('create');
  };

  // Open Edit Modal for an existing pin
  const handleOpenEditPin = (pin: MarkupPin, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedPin(pin);
    setFormTitle(pin.title);
    setFormDesc(pin.desc);
    setFormPriority(pin.priority);
    setFormStatus(pin.status);
    setFormAssigneeEmail(pin.assigneeEmail);
    setModalMode('edit');
  };

  // Submit Save for New or Edited Pin
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const assignee = engineers.find(eng => eng.email === formAssigneeEmail) || 
                     currentDrawn.engineer || 
                     engineers[0];

    const drawnCode = currentDrawn.code || (currentDrawn.engineer ? currentDrawn.engineer.name : 'Chưa định danh');

    if (modalMode === 'create' && activePinDraft) {
      const newPin: MarkupPin = {
        id: `pin-${Date.now()}`,
        page: currentPage,
        x: activePinDraft.x,
        y: activePinDraft.y,
        title: formTitle.trim(),
        desc: formDesc.trim(),
        priority: formPriority,
        status: formStatus,
        author: user?.name || 'Reviewer',
        assigneeEmail: assignee.email,
        assigneeName: assignee.name,
        drawnByCode: drawnCode,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setPins(prev => [newPin, ...prev]);
      setSelectedPin(newPin);

      // DIRECT NOTIFICATION to the person who drew the drawing (DRAWN)!
      addNotification(
        `[Review Bản Vẽ] Comment mới trên bản vẽ ${pdfFileName || 'Piping Plan'} (Trang ${currentPage})`,
        `Bản vẽ (DRAWN: ${drawnCode}) vừa nhận comment từ ${user?.name || 'Reviewer'}: "${newPin.title}". Vui lòng kiểm tra và xử lý.`,
        'drawing',
        'drawing-review'
      );

      setBannerMessage(`✅ Đã gửi thông báo comment đến: ${assignee.name} (${drawnCode} - ${assignee.email})`);
    } else if (modalMode === 'edit' && selectedPin) {
      const updatedPin: MarkupPin = {
        ...selectedPin,
        title: formTitle.trim(),
        desc: formDesc.trim(),
        priority: formPriority,
        status: formStatus,
        assigneeEmail: assignee.email,
        assigneeName: assignee.name,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setPins(prev => prev.map(p => p.id === updatedPin.id ? updatedPin : p));
      setSelectedPin(updatedPin);

      // Send update notification to assignee
      addNotification(
        `[Review Bản Vẽ] Cập nhật comment trên bản vẽ ${pdfFileName || 'Piping Plan'} (Trang ${currentPage})`,
        `Comment "${updatedPin.title}" trên bản vẽ DRAWN ${drawnCode} đã cập nhật [Trạng thái: ${formStatus}].`,
        'drawing',
        'drawing-review'
      );

      setBannerMessage(`Đã cập nhật comment "${updatedPin.title}" và gửi cập nhật đến ${assignee.name}.`);
    }

    setModalMode(null);
    setActivePinDraft(null);
    setTimeout(() => setBannerMessage(null), 4000);
  };

  // Change Drawn person manually for current page
  const handleChangeDrawn = (newEmail: string) => {
    if (!newEmail) {
      const unassigned: DrawnDetection = {
        code: '',
        engineer: null,
        autoDetected: false,
        status: 'unrecognized'
      };
      pageDrawnMapRef.current[currentPage] = unassigned;
      setCurrentDrawn(unassigned);
      return;
    }

    const found = engineers.find(e => e.email === newEmail);
    if (found) {
      let abbr = Object.keys(PIC_ABBREVIATIONS).find(k => PIC_ABBREVIATIONS[k].toLowerCase() === newEmail.toLowerCase() && !k.includes(' '));
      if (!abbr) {
        abbr = found.name.split(' ').map(n => n[0]).join('.').toUpperCase() + '.';
      }
      const newDrawn: DrawnDetection = {
        code: abbr,
        engineer: found,
        autoDetected: false,
        status: 'detected'
      };
      pageDrawnMapRef.current[currentPage] = newDrawn;
      setCurrentDrawn(newDrawn);
      setBannerMessage(`Đã chỉ định người vẽ Trang ${currentPage}: ${found.name} (${abbr})`);
      setTimeout(() => setBannerMessage(null), 3000);
    }
  };

  // Delete a Pin
  const handleDeletePin = (pinId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPins(prev => prev.filter(p => p.id !== pinId));
    if (selectedPin?.id === pinId) setSelectedPin(null);
    if (modalMode === 'edit') setModalMode(null);
    setBannerMessage('Đã xóa comment bản vẽ.');
    setTimeout(() => setBannerMessage(null), 2500);
  };

  // Current page pins and filtered list
  const pagePins = pins.filter(p => p.page === currentPage);
  const visiblePins = pagePins.filter(p => filterStatus === 'all' || p.status === filterStatus);
  const hasDrawing = Boolean(pdfDoc || dxfData);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full bg-[#0B1F33] text-slate-100 overflow-hidden font-sans">
      
      {/* Top Header Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            {fileType === 'dxf' ? <FileCode className="w-5 h-5 text-cyan-400" /> : <FileText className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white font-sans truncate max-w-[280px]">
                {pdfFileName || 'Drawing Review Workspace (PDF & CAD DXF)'}
              </span>
              {fileType && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  fileType === 'dxf' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {fileType === 'dxf' ? 'CAD DXF' : 'PDF'}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono">
                {selectedProject.code}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              {hasDrawing 
                ? `${fileType === 'dxf' ? 'Bản vẽ CAD Model Space' : `Trang ${currentPage} / ${totalPages}`} · ${pagePins.length} comment trên bản vẽ` 
                : 'Hỗ trợ định dạng file PDF bản vẽ & file CAD (.dxf)'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Tải Lên PDF / DXF</span>
            <input type="file" accept=".pdf,.dxf" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Export Branches when Drawing is open */}
          {hasDrawing && (
            <>
              <button
                onClick={handleExportPdf}
                disabled={isExporting !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-colors cursor-pointer disabled:opacity-50"
                title="Xuất bản vẽ ra file PDF chuẩn A3 kèm toàn bộ comment markup và bảng ghi chú"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting === 'pdf' ? 'Đang Xuất PDF...' : '📥 Xuất PDF'}</span>
              </button>

              <button
                onClick={handleExportDwgReady}
                disabled={isExporting !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow transition-colors cursor-pointer disabled:opacity-50"
                title="Xuất file CAD tích hợp layer VARD_MARKUP_REVIEW. Mở trong AutoCAD và bấm Save As sang .DWG"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{isExporting === 'dwg' ? 'Đang Xuất CAD...' : '📐 Xuất DWG (CAD)'}</span>
              </button>
            </>
          )}

          {/* Sample Drawing Buttons when no drawing loaded */}
          {!hasDrawing && (
            <>
              <button
                onClick={handleLoadSampleDxf}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 text-xs font-mono transition-colors cursor-pointer"
                title="Mở bản vẽ mẫu CAD DXF (DRAWN: N.D.D.)"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mẫu CAD DXF (N.D.D.)</span>
              </button>
              <button
                onClick={handleLoadSamplePdf}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors cursor-pointer"
                title="Mở bản vẽ PDF mẫu NB994 (DRAWN: T.Q.)"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Mẫu PDF (T.Q.)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications / Alerts Banner */}
      {bannerMessage && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2 text-emerald-300 text-xs font-mono flex items-center justify-between shrink-0 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="text-emerald-400 hover:text-white text-xs cursor-pointer">✕</button>
        </div>
      )}

      {renderError && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-6 py-2 text-red-300 text-xs font-mono flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{renderError}</span>
          </div>
          <button onClick={() => setRenderError(null)} className="text-red-400 hover:text-white text-xs cursor-pointer">✕</button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* Left Side: Canvas Viewer */}
        <div className="flex-1 flex flex-col bg-slate-950 relative min-h-0 overflow-hidden">
          
          {/* Canvas Sub-toolbar */}
          {hasDrawing && (
            <div className="h-11 bg-slate-900/90 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 z-10 flex-wrap gap-2">
              
              {/* Page Navigator for PDF or CAD Viewport Indicator for DXF */}
              {fileType === 'pdf' ? (
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400">Trang Bản Vẽ:</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 cursor-pointer"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1 font-bold">
                    <select 
                      value={currentPage} 
                      onChange={e => setCurrentPage(Number(e.target.value))}
                      className="bg-slate-950 text-amber-400 border border-slate-800 px-2 py-0.5 rounded font-mono text-xs cursor-pointer"
                    >
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Trang {i + 1} ({pins.filter(p => p.page === i + 1).length} comment)
                        </option>
                      ))}
                    </select>
                    <span className="text-slate-500">/ {totalPages}</span>
                  </div>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 cursor-pointer"
                    title="Trang sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 font-mono text-xs text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded border border-cyan-800/50">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold">CAD Model Space ({dxfData?.entities.length || 0} entities)</span>
                </div>
              )}

              {/* DRAWN BY DETECTED BADGE & SELECTOR */}
              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                currentDrawn.engineer 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <span className="font-bold flex items-center gap-1 shrink-0">
                  <UserCheck className={`w-3.5 h-3.5 ${currentDrawn.engineer ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span>DRAWN:</span>
                </span>
                
                {currentDrawn.code ? (
                  <span className={`px-1.5 py-0.5 font-bold rounded text-[11px] shrink-0 ${
                    currentDrawn.engineer ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {currentDrawn.code}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 font-normal rounded text-[10px] shrink-0">
                    Chưa nhận diện
                  </span>
                )}

                <select
                  value={currentDrawn.engineer?.email || ''}
                  onChange={e => handleChangeDrawn(e.target.value)}
                  className="bg-transparent text-slate-200 font-sans text-xs cursor-pointer focus:outline-none pr-1 max-w-[190px] truncate"
                  title="Người thực hiện bản vẽ (sẽ nhận thông báo khi có comment)"
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">
                    -- Chọn kỹ sư vẽ bản vẽ --
                  </option>
                  {engineers.map(eng => (
                    <option key={eng.email} value={eng.email} className="bg-slate-900 text-slate-200">
                      {eng.name} ({eng.email})
                    </option>
                  ))}
                </select>

                {currentDrawn.autoDetected && currentDrawn.engineer && (
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono shrink-0" title="Tự động trích xuất từ khung tên bản vẽ">
                    Auto
                  </span>
                )}
              </div>

              {/* Tool Mode & Zoom Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
                  <button
                    onClick={() => setToolMode('comment')}
                    className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                      toolMode === 'comment'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Ghim Comment (Click Bản Vẽ)</span>
                  </button>
                  <button
                    onClick={() => setToolMode('pan')}
                    className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                      toolMode === 'pan'
                        ? 'bg-slate-800 text-cyan-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Xem Bản Vẽ</span>
                  </button>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1 font-mono text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                  <button 
                    onClick={() => setZoom(z => Math.max(50, z - 20))} 
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-cyan-400 font-bold w-12 text-center">{zoom}%</span>
                  <button 
                    onClick={() => setZoom(z => Math.min(220, z + 20))} 
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button 
                  onClick={() => setZoom(100)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
                  title="Đặt zoom 100%"
                >
                  100%
                </button>
                <button 
                  onClick={() => setZoom(130)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
                  title="Phóng to 130%"
                >
                  130%
                </button>
              </div>
            </div>
          )}

          {/* Canvas Scrollable Container */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative bg-[#06101c]">
            {isLoadingPdf && (
              <div className="flex flex-col items-center gap-3 text-cyan-400 font-mono text-xs">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span>{fileType === 'dxf' ? 'Đang đọc và dựng bản vẽ CAD DXF...' : 'Đang mở bản vẽ PDF...'}</span>
              </div>
            )}

            {!hasDrawing && !isLoadingPdf && (
              <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Tải Lên Bản Vẽ PDF Hoặc CAD DXF</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Hỗ trợ mở trực tiếp file PDF và file CAD (.dxf). Tự động nhận diện chữ <strong>DRAWN (Người vẽ)</strong> trong khung tên để gửi thông báo. Sau review, bạn có thể xuất ra file PDF kèm ghi chú hoặc xuất sang file CAD (DWG-Ready).
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <label className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Chọn File PDF hoặc DXF Từ Máy</span>
                    <input type="file" accept=".pdf,.dxf" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <button
                    onClick={handleLoadSampleDxf}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 font-mono text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span>Mở Bản Vẽ Mẫu CAD DXF (DRAWN: N.D.D. - Nguyễn Danh Duy)</span>
                  </button>

                  <button
                    onClick={handleLoadSamplePdf}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    <span>Mở Bản Vẽ Mẫu PDF NB994 (DRAWN: T.Q. - Trần Quốc)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Real PDF / DXF Canvas and Interactive Annotation Overlay */}
            <div 
              className={`relative shadow-2xl rounded-lg ${fileType === 'dxf' ? 'bg-[#07111e]' : 'bg-white'} overflow-visible transition-all ${
                hasDrawing ? 'block' : 'hidden'
              }`}
            >
              {isRenderingPage && (
                <div className="absolute top-2 right-2 z-30 px-2 py-1 rounded bg-slate-900/80 text-[10px] font-mono text-cyan-300 flex items-center gap-1 shadow">
                  <div className="w-2.5 h-2.5 rounded-full border border-cyan-400 border-t-transparent animate-spin" />
                  <span>Đang dựng bản vẽ...</span>
                </div>
              )}

              {/* Native PDF.js or DXF Canvas */}
              <canvas ref={canvasRef} className={`block rounded-lg shadow-inner ${fileType === 'dxf' ? 'bg-[#07111e]' : 'bg-white'}`} />

              {/* Interactive Pin Markup Overlay */}
              <div
                ref={overlayRef}
                onClick={handleOverlayClick}
                className={`absolute inset-0 z-10 ${
                  toolMode === 'comment' ? 'cursor-crosshair' : 'cursor-default'
                }`}
                title={toolMode === 'comment' ? 'Click vào điểm trên bản vẽ để tạo comment' : ''}
              >
                {/* Active Draft Placement Marker */}
                {activePinDraft && (
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
                    style={{ left: `${activePinDraft.x}%`, top: `${activePinDraft.y}%` }}
                  >
                    <div className="w-9 h-9 rounded-full border-2 border-amber-400 bg-amber-500/30 flex items-center justify-center animate-ping" />
                    <div className="w-7 h-7 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center text-slate-950 font-bold text-xs absolute top-1 left-1">
                      +
                    </div>
                  </div>
                )}

                {/* Render Visible Pins for current page */}
                {visiblePins.map((pin, idx) => {
                  const isSelected = selectedPin?.id === pin.id;
                  const priorityColor = 
                    pin.priority === 'high' ? 'bg-red-500 border-red-200 shadow-red-500/50' :
                    pin.priority === 'medium' ? 'bg-amber-500 border-amber-200 shadow-amber-500/50' :
                    'bg-blue-500 border-blue-200 shadow-blue-500/50';

                  const statusRing = 
                    pin.status === 'resolved' ? 'ring-2 ring-emerald-400' :
                    pin.status === 'in_progress' ? 'ring-2 ring-cyan-400' : '';

                  return (
                    <div
                      key={pin.id}
                      onClick={(e) => handleOpenEditPin(pin, e)}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-20 cursor-pointer pointer-events-auto"
                      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    >
                      {/* Pin Button */}
                      <div className={`w-8 h-8 rounded-full border-2 text-white font-mono font-bold text-xs flex items-center justify-center shadow-lg transition-transform hover:scale-125 ${priorityColor} ${statusRing} ${
                        isSelected ? 'scale-125 ring-4 ring-white' : ''
                      }`}>
                        {idx + 1}
                      </div>

                      {/* Tooltip on hover */}
                      <div className="absolute left-1/2 bottom-full mb-2 transform -translate-x-1/2 hidden group-hover:block w-64 p-3 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl text-slate-100 z-40 pointer-events-none backdrop-blur-md">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-amber-400 truncate max-w-[150px]">{pin.title}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                            pin.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' :
                            pin.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-300' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {pin.status}
                          </span>
                        </div>
                        {pin.desc && (
                          <p className="text-[11px] text-slate-300 mb-2 line-clamp-2 leading-relaxed">
                            {pin.desc}
                          </p>
                        )}
                        <div className="text-[10px] font-mono text-cyan-400 flex items-center justify-between pt-1 border-t border-slate-800">
                          <span>Người vẽ nhận: {pin.assigneeName}</span>
                          <span className="text-slate-400">Click để sửa</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Comments List & Edit Details Panel */}
        <div className="w-full lg:w-[380px] bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 overflow-hidden">
          
          {/* Comments List Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
            <span className="font-bold text-xs text-amber-400 font-mono flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Bình Luận Trang {currentPage} ({visiblePins.length})</span>
            </span>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 cursor-pointer"
            >
              <option value="all">Tất cả ({pagePins.length})</option>
              <option value="open">Mới (Open)</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="resolved">Đã duyệt</option>
            </select>
          </div>

          {/* List of Comments on Current Page */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {visiblePins.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-2xl p-6">
                <MapPin className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <p className="font-bold text-slate-400 mb-1">Chưa có comment nào trên trang {currentPage}</p>
                <p className="text-[11px] text-slate-600 mb-3">
                  Click vào bản vẽ để ghim comment. Hệ thống sẽ tự động gửi thông báo đến {currentDrawn.engineer ? currentDrawn.engineer.name : 'kỹ sư phụ trách bản vẽ'}.
                </p>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 text-left">
                  {currentDrawn.engineer ? (
                    <>
                      <div className="font-bold mb-0.5">📌 Người vẽ (DRAWN): {currentDrawn.code || 'Đã chỉ định'}</div>
                      <div>Kỹ sư: {currentDrawn.engineer.name} ({currentDrawn.engineer.email})</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold mb-0.5 text-amber-400">⚠️ DRAWN: Chưa nhận diện</div>
                      <div className="text-slate-400">Chọn kỹ sư ở thanh công cụ phía trên để tự động nhận thông báo.</div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              visiblePins.map((pin, idx) => {
                const isSelected = selectedPin?.id === pin.id;
                return (
                  <div 
                    key={pin.id}
                    onClick={() => handleOpenEditPin(pin)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 shadow-md'
                        : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-xs text-white font-sans truncate">{pin.title}</h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${
                          pin.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                          pin.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {pin.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {pin.desc && (
                      <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                        {pin.desc}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 text-cyan-400 truncate max-w-[200px]" title={pin.assigneeEmail}>
                        <UserCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span className="truncate">Người vẽ: {pin.assigneeName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                          pin.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400 font-bold' :
                          pin.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-400' :
                          'text-slate-400'
                        }`}>
                          {pin.status === 'resolved' ? 'Đã duyệt' : pin.status === 'in_progress' ? 'Đang sửa' : 'Mới'}
                        </span>
                        <button
                          onClick={(e) => handleDeletePin(pin.id, e)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          title="Xóa comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 text-[10px] font-mono text-slate-400 text-center shrink-0">
            {currentDrawn.engineer 
              ? `Thông báo tự động gửi đến người vẽ: ${currentDrawn.engineer.name} (${currentDrawn.code || currentDrawn.engineer.email})`
              : 'Chọn kỹ sư DRAWN trên thanh công cụ để tự động gửi thông báo'}
          </div>
        </div>

      </div>

      {/* Modal Dialog: Thêm Mới hoặc Chỉnh Sửa Comment Trực Tiếp */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0F1D2C] border border-amber-500/50 rounded-2xl shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white font-sans">
                  {modalMode === 'create' ? `Tạo Comment Mới (Trang ${currentPage})` : `Chỉnh Sửa Comment Bản Vẽ`}
                </h3>
              </div>
              <button 
                onClick={() => { setModalMode(null); setActivePinDraft(null); }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AUTOMATIC DRAWN TARGET NOTICE */}
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              currentDrawn.engineer 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${currentDrawn.engineer ? 'text-emerald-400' : 'text-amber-400'}`} />
              <div className="text-[11px] font-mono">
                {currentDrawn.engineer ? (
                  <>
                    <div className="text-emerald-300 font-bold">
                      {currentDrawn.autoDetected ? '🎯 Tự động nhận diện DRAWN:' : '📌 Người vẽ bản vẽ:'} {currentDrawn.code} ({currentDrawn.engineer.name})
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                      Khi bạn lưu comment này, thông báo sẽ tự động được gửi trực tiếp đến kỹ sư vẽ bản vẽ ({currentDrawn.engineer.name} - {currentDrawn.engineer.email}).
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-amber-300 font-bold">
                      ⚠️ Chưa nhận diện mã DRAWN từ bản vẽ
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                      Vui lòng chọn kỹ sư bên dưới để gửi thông báo yêu cầu xử lý comment này.
                    </p>
                  </>
                )}
              </div>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Tiêu Đề Comment / Yêu Cầu Sửa Đổi
                </label>
                <input 
                  type="text" 
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Va chạm ống Zone 3 với máng cáp FR 45..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Nội Dung Chi Tiết (Technical Note)
                </label>
                <textarea 
                  rows={3}
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Ghi chú chi tiết tọa độ, yêu cầu thay đổi đường ống, thêm van hoặc phụ kiện..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Mức Độ Ưu Tiên
                  </label>
                  <select 
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white cursor-pointer"
                  >
                    <option value="high">🔴 Cao (High Priority)</option>
                    <option value="medium">🟡 Trung Bình (Medium)</option>
                    <option value="low">🔵 Thấp (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Trạng Thái Xử Lý
                  </label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white cursor-pointer"
                  >
                    <option value="open">Mới (Open)</option>
                    <option value="in_progress">Đang Xử Lý</option>
                    <option value="resolved">Đã Duyệt (Resolved)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  {currentDrawn.engineer 
                    ? `Người Nhận Thông Báo (Tự động theo DRAWN: ${currentDrawn.code})`
                    : 'Người Nhận Thông Báo (Chọn Kỹ Sư)'}
                </label>
                <select 
                  value={formAssigneeEmail}
                  onChange={e => setFormAssigneeEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white cursor-pointer"
                >
                  {engineers.map(eng => {
                    const isDrawnPerson = Boolean(currentDrawn.engineer && eng.email === currentDrawn.engineer.email);
                    return (
                      <option key={eng.email} value={eng.email}>
                        {isDrawnPerson ? `🎯 [Người vẽ - DRAWN ${currentDrawn.code}] ` : ''}
                        {eng.name} ({eng.email})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {modalMode === 'edit' && selectedPin ? (
                  <button
                    type="button"
                    onClick={() => handleDeletePin(selectedPin.id)}
                    className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setModalMode(null); setActivePinDraft(null); }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase font-sans flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{modalMode === 'create' ? `Gửi Đến ${currentDrawn.engineer?.name || 'Kỹ Sư'}` : 'Cập Nhật Comment'}</span>
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
