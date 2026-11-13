import React from 'react';
import { useParams } from 'react-router-dom';
import { APPS_CONFIG } from '../config/apps';
import { EmbeddedApp } from '../components/EmbeddedApp';
import { NotFoundPage } from './NotFoundPage';
import { ForbiddenPage } from './ForbiddenPage';
import { useAuth } from '../hooks/useAuth';
import { resolveEffectiveAppAccess } from '../services/teamDirectoryService';

export const AppPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const { user, role } = useAuth();

  const app = APPS_CONFIG.find(a => a.id === appId);

  if (!app) {
    return <NotFoundPage />;
  }

  const accessLevel = resolveEffectiveAppAccess(user, role, app);

  if (accessLevel === 'ban') {
    return <ForbiddenPage requiredCap={app.requiredCap} appLabel={app.label} isBanned />;
  }

  return <EmbeddedApp app={app} accessLevel={accessLevel} />;
};
