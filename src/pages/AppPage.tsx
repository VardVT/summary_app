import React from 'react';
import { useParams } from 'react-router-dom';
import { APPS_CONFIG } from '../config/apps';
import { EmbeddedApp } from '../components/EmbeddedApp';
import { RequireCap } from '../components/RequireCap';
import { NotFoundPage } from './NotFoundPage';

export const AppPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();

  const app = APPS_CONFIG.find(a => a.id === appId);

  if (!app) {
    return <NotFoundPage />;
  }

  return (
    <RequireCap requiredCap={app.requiredCap}>
      <EmbeddedApp app={app} />
    </RequireCap>
  );
};
