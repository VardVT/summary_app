export type AppAccessLevel = 'edit' | 'view' | 'ban';

export type Capability = 
  | 'manage_apps'
  | 'manage_users'
  | 'manage_app_permissions'
  | 'edit_data'
  | 'view_drawings'
  | 'export_reports'
  | 'edit_line_list'
  | 'view_mto'
  | 'approve_transmittals'
  | 'manage_projects';

export type UserRole = 'admin' | 'lead' | 'engineer' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  department: string;
  section: string;
  employeeId?: string;
  positionTitle?: string;
  themeColor?: string;
  appAccess?: boolean;
  canManageAppPermissions?: boolean;
  appPermissions?: Record<string, AppAccessLevel>;
}

export type AppCategory = 'Design' | 'Control' | 'Materials' | 'Reporting' | 'Settings';

export type AppStatus = 'active' | 'beta' | 'soon';

export type AppType = 'route' | 'iframe' | 'external';

export interface AppConfig {
  id: string;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  category: AppCategory;
  type: AppType;
  src: string; // URL for iframe or path for route
  requiredCap?: Capability;
  status?: AppStatus;
  rev?: string; // Drawing Title Block style revision e.g. "REV A"
  tag?: string; // Short code e.g. "APP-01"
  color?: string; // Background color for dock icon
}

export interface VesselGroupProgress {
  name: string;
  avgPercent: number;
  total: number;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  vesselType: string;
  shipyard: string;
  dwtOrCapacity: string;
  progressPercentage: number;
  activeSection: string;
  status: string;
  department?: string;
  startDate?: string | null;
  endDate?: string | null;
  totalTasks?: number;
  groupProgress?: VesselGroupProgress[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  category?: 'drawing' | 'transmittal' | 'system' | 'clash';
  appId?: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  timestamp: string;
  user: string;
  type: 'drawing_approved' | 'clash_detected' | 'mto_updated' | 'transmittal_sent';
  tag: string;
}

export interface TaskItem {
  id: string;
  title: string;
  drawingNo: string;
  lineNo?: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_review' | 'approved' | 'overdue';
  assignee: string;
}

export interface ShellPostMessageContext {
  type: 'SHELL_CONTEXT';
  accessToken: string | null;
  refreshToken: string | null;
  projectId: string;
  user: UserProfile | null;
  accessLevel?: AppAccessLevel;
}

export interface AppPostMessageNotification {
  type: 'NOTIFY';
  title: string;
  body: string;
  category?: 'drawing' | 'transmittal' | 'system' | 'clash';
}
