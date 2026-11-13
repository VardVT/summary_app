import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Project } from '../types';
import { useAuth } from './AuthContext';
import { fetchDatabaseVessels } from '../services/supabase';

const SELECTED_PROJECT_KEY = 'piping_shell_selected_project';
const SUBAPP_PROJECT_KEY = 'pm_current_project_id';

export const EMPTY_PROJECT: Project = {
  id: '',
  code: 'No Vessel',
  name: 'No vessel loaded',
  vesselType: 'Shipbuilding Vessel',
  shipyard: 'VARD Engineering',
  dwtOrCapacity: '—',
  progressPercentage: 0,
  activeSection: 'Piping Engineering',
  status: 'Not Started',
  department: 'Piping',
  totalTasks: 0,
  groupProgress: [
    { name: '3D Drawing', avgPercent: 0, total: 0 },
    { name: 'ISO Generating', avgPercent: 0, total: 0 },
    { name: '2D Drawing', avgPercent: 0, total: 0 },
    { name: 'MTO', avgPercent: 0, total: 0 },
  ],
};

export interface ProjectContextType {
  projects: Project[];
  selectedProject: Project;
  hasProjects: boolean;
  loading: boolean;
  requiresAuth: boolean;
  error: string | null;
  setProject: (projectId: string) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string>(() => {
    return (
      localStorage.getItem(SELECTED_PROJECT_KEY) ||
      localStorage.getItem(SUBAPP_PROJECT_KEY) ||
      ''
    );
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [requiresAuth, setRequiresAuth] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadVessels = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchDatabaseVessels(session?.access_token);
    setProjects(result.vessels);
    setRequiresAuth(result.requiresAuth);
    if (result.error) {
      setError(result.error);
    }

    if (result.vessels.length > 0) {
      setSelectedId(prevId => {
        const saved =
          prevId ||
          localStorage.getItem(SELECTED_PROJECT_KEY) ||
          localStorage.getItem(SUBAPP_PROJECT_KEY) ||
          '';
        const match = result.vessels.find(p => p.id === saved || p.code === saved);
        const nextId = match ? match.id : result.vessels[0].id;
        localStorage.setItem(SELECTED_PROJECT_KEY, nextId);
        return nextId;
      });
    }
    setLoading(false);
  }, [session?.access_token]);

  useEffect(() => {
    loadVessels();
  }, [loadVessels, user?.id]);

  // Keep vessel list synchronized if user logs in or edits vessels in Progress Management sub-app
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('auth-token') || e.key === SUBAPP_PROJECT_KEY) {
        if (e.key === SUBAPP_PROJECT_KEY && e.newValue) {
          setSelectedId(e.newValue);
          localStorage.setItem(SELECTED_PROJECT_KEY, e.newValue);
        } else {
          loadVessels();
        }
      }
    };
    const handleFocus = () => {
      loadVessels();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadVessels]);

  const setProject = useCallback(
    (projectId: string) => {
      const proj = projects.find(p => p.id === projectId || p.code === projectId);
      if (proj) {
        setSelectedId(proj.id);
        localStorage.setItem(SELECTED_PROJECT_KEY, proj.id);
      }
    },
    [projects],
  );

  const selectedProject = useMemo<Project>(() => {
    if (projects.length === 0) {
      if (loading) {
        return {
          ...EMPTY_PROJECT,
          code: 'Loading...',
          name: 'Loading vessels from database',
        };
      }
      return {
        ...EMPTY_PROJECT,
        name: requiresAuth ? 'Sign in to load vessels' : 'No vessels in database',
      };
    }
    return projects.find(p => p.id === selectedId || p.code === selectedId) || projects[0];
  }, [projects, selectedId, loading, requiresAuth]);

  const value = useMemo<ProjectContextType>(
    () => ({
      projects,
      selectedProject,
      hasProjects: projects.length > 0,
      loading,
      requiresAuth,
      error,
      setProject,
      refreshProjects: loadVessels,
    }),
    [projects, selectedProject, loading, requiresAuth, error, setProject, loadVessels],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
