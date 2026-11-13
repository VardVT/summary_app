import { AppConfig } from '../types';

/**
 * Central registry of standalone applications for the Shipbuilding & Offshore Piping Department.
 * Adding a new child app only requires adding an entry to this array.
 */
export const APPS_CONFIG: AppConfig[] = [
  {
    id: 'section-task-manager',
    label: 'Progress Management',
    description: 'Track piping section progress, line isometric allocations, drawing task reviews, and engineering team workload.',
    icon: 'CheckCircle2',
    category: 'Design',
    type: 'iframe',
    src: './project-management/index.html',
    requiredCap: 'view_drawings',
    status: 'active',
    rev: 'REV A',
    tag: 'APP-01',
    color: 'bg-[#0284C7]', // Blue
  },
  {
    id: 'drawing-review',
    label: 'Drawing Review & Markup',
    description: 'Collaborative 2D & 3D ISO drawing review, redlining, and revision approval workflow.',
    icon: 'ClipboardCheck',
    category: 'Control',
    type: 'iframe',
    src: 'https://piping-dept.github.io/drawing-review/',
    requiredCap: 'view_drawings',
    status: 'active',
    rev: 'REV C',
    tag: 'APP-02',
    color: 'bg-[#D97706]', // Amber
  },
  {
    id: 'plan-drawing-list',
    label: 'Plan Drawing List (PDL)',
    description: 'Master index of piping arrangement plans, P&IDs, isometric drawings, and revision control.',
    icon: 'FileText',
    category: 'Design',
    type: 'iframe',
    src: 'https://piping-dept.github.io/plan-drawing-list/',
    requiredCap: 'view_drawings',
    status: 'active',
    rev: 'REV B',
    tag: 'APP-03',
    color: 'bg-[#059669]', // Emerald
  },
  {
    id: 'iso-tools',
    label: 'ISO Tools',
    description: 'ISO Drawing Manager: auto-parse CAD files, build zone/system folder tree, and export Issued History Excel.',
    icon: 'FileText',
    category: 'Design',
    type: 'iframe',
    src: './iso-tools/index.html',
    requiredCap: 'view_drawings',
    status: 'active',
    rev: 'REV A',
    tag: 'APP-04',
    color: 'bg-[#7C3AED]', // Purple
  },
  {
    id: 'mto-manager',
    label: 'Material Take-Off (MTO)',
    description: 'Piping material summary, valve schedule, pipe fittings, flange rating, and weight breakdown.',
    icon: 'Box',
    category: 'Materials',
    type: 'iframe',
    src: 'https://piping-dept.github.io/mto-manager/',
    requiredCap: 'view_mto',
    status: 'active',
    rev: 'REV D',
    tag: 'APP-05',
    color: 'bg-[#E11D48]', // Rose
  },
  {
    id: 'training-app',
    label: 'Trainning App',
    description: 'Piping Academy: đào tạo kỹ sư Piping AVEVA Marine theo tiêu chuẩn yard DSS và quy phạm DNV/SOLAS.',
    icon: 'GraduationCap',
    category: 'Design',
    type: 'route',
    src: '/apps/training-app',
    status: 'active',
    rev: 'REV A',
    tag: 'APP-06',
    color: 'bg-[#0891B2]', // Cyan
  },
  {
    id: 'calendar',
    label: 'Milestones & Mil-Calendar',
    description: 'Shipbuilding key dates, Model Freeze milestones, Class review cut-offs, and spool fabrication schedules.',
    icon: 'Calendar',
    category: 'Control',
    type: 'iframe',
    src: 'https://piping-dept.github.io/piping-calendar/',
    status: 'beta',
    rev: 'REV A',
    tag: 'APP-07',
    color: 'bg-[#EA580C]', // Orange
  },
  {
    id: 'reports',
    label: 'Technical Reports & Analytics',
    description: '3D Clash detection metrics, weight margin reports, spool progress KPIs, and material cost variances.',
    icon: 'TrendingUp',
    category: 'Reporting',
    type: 'iframe',
    src: 'https://piping-dept.github.io/piping-reports/',
    requiredCap: 'export_reports',
    status: 'soon',
    rev: 'REV 0',
    tag: 'APP-08',
    color: 'bg-[#0F766E]', // Teal
  },
  {
    id: 'team-settings',
    label: 'Team & Account Settings',
    description: 'Manage engineering team directory, roles, app access permissions, and create or remove user accounts.',
    icon: 'Users',
    category: 'Settings',
    type: 'route',
    src: '/apps/team-settings',
    requiredCap: 'manage_users',
    status: 'active',
    rev: 'REV A',
    tag: 'APP-09',
    color: 'bg-[#4F46E5]', // Indigo
  }
];

export const APP_CATEGORIES = ['Design', 'Control', 'Materials', 'Reporting', 'Settings'] as const;
