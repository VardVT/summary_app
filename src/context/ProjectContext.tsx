import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project } from '../types';

export interface ProjectContextType {
  projects: Project[];
  selectedProject: Project;
  setProject: (projectId: string) => void;
}

export const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'HN-1204',
    code: 'HN-1204',
    name: '12,000 DWT Chemical Tanker',
    vesselType: 'IMO Type II Chemical / Oil Tanker',
    shipyard: 'HD Hyundai Heavy Industries · Yard No. 1204',
    dwtOrCapacity: '12,000 DWT',
    progressPercentage: 68,
    activeSection: 'Piping & Machinery Outfitting',
    status: 'In Engineering',
  },
  {
    id: 'FPSO-709',
    code: 'FPSO-709',
    name: 'Deepwater Floating Production Unit',
    vesselType: 'FPSO - Santos Basin Field',
    shipyard: 'Samsung Heavy Industries · Yard No. 709',
    dwtOrCapacity: '150,000 bpd / 1.6M bbl storage',
    progressPercentage: 42,
    activeSection: 'Topside Piping & Module Integration',
    status: 'In Engineering',
  },
  {
    id: 'LNG-302',
    code: 'LNG-302',
    name: '174,000 m³ LNG Carrier',
    vesselType: 'Mark III Flex Membrane LNG Carrier',
    shipyard: 'Hanwha Ocean · Yard No. 302',
    dwtOrCapacity: '174,000 m³ Cryogenic Cargo',
    progressPercentage: 85,
    activeSection: 'Cargo Handling & Reliquefaction Piping',
    status: 'Construction',
  },
  {
    id: 'OFF-882',
    code: 'OFF-882',
    name: 'Offshore Substation Platform',
    vesselType: 'HVDC 800MW Offshore Wind Substation',
    shipyard: 'Keppel Offshore & Marine · Yard No. 882',
    dwtOrCapacity: '800 MW Grid Transfer',
    progressPercentage: 91,
    activeSection: 'Cooling Piping & Fire Suppression',
    status: 'Commissioning',
  },
];

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedProject, setSelectedProject] = useState<Project>(() => {
    const savedId = localStorage.getItem('piping_shell_selected_project');
    const found = SAMPLE_PROJECTS.find(p => p.id === savedId || p.code === savedId);
    return found || SAMPLE_PROJECTS[0];
  });

  const setProject = (projectId: string) => {
    const proj = SAMPLE_PROJECTS.find(p => p.id === projectId || p.code === projectId);
    if (proj) {
      setSelectedProject(proj);
      localStorage.setItem('piping_shell_selected_project', proj.id);
    }
  };

  return (
    <ProjectContext.Provider value={{ projects: SAMPLE_PROJECTS, selectedProject, setProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
