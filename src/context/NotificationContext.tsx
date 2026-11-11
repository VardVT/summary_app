import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NotificationItem } from '../types';

export interface ToastItem {
  id: string;
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (title: string, body: string, category?: NotificationItem['category'], appId?: string) => void;
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-01',
    title: 'ISO Drawing Approved',
    body: 'ISO-PP-0123 Rev B (Machinery Room Main Sea Water Line) approved by DNV Class Inspector.',
    timestamp: '10 min ago',
    read: false,
    category: 'drawing',
    appId: 'drawing-review',
  },
  {
    id: 'notif-02',
    title: '3D Pipe Clash Alert',
    body: 'Clash detected between Line 4"-CW-1502 and Cable Tray CT-88 in Engine Room Frame 42.',
    timestamp: '45 min ago',
    read: false,
    category: 'clash',
    appId: 'section-task-manager',
  },
  {
    id: 'notif-03',
    title: 'Transmittal Sent',
    body: 'Transmittal TR-HN1204-PIPE-044 delivered to Hyundai Shipyard Engineering Control.',
    timestamp: '2 hours ago',
    read: true,
    category: 'transmittal',
    appId: 'transmittal',
  },
  {
    id: 'notif-04',
    title: 'MTO Valve Schedule Updated',
    body: 'Butterly valves specs updated for LNG Cargo Line 10"-CRY-901 in MTO Manager.',
    timestamp: 'Yesterday',
    read: true,
    category: 'system',
    appId: 'mto-manager',
  },
];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addNotification = (
    title: string,
    body: string,
    category: NotificationItem['category'] = 'system',
    appId?: string
  ) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title,
      body,
      timestamp: 'Just now',
      read: false,
      category,
      appId,
    };

    setNotifications(prev => [newNotif, ...prev]);

    // Add corresponding toast notification
    const toastId = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id: toastId, title, body, type: category === 'clash' ? 'warning' : 'info' }]);

    // Auto-dismiss toast after 5s
    setTimeout(() => {
      removeToast(toastId);
    }, 5000);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        toasts,
        removeToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
