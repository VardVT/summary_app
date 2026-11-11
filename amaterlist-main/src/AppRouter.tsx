import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HubPage } from './pages/HubPage';
import { IsoDrawingManagerPage } from './pages/IsoDrawingManagerPage';
import App from './App';

/**
 * AppRouter defines the multi-tool routing architecture.
 * When embedded in Shell (window.self !== window.top), redirect directly to ISO Drawing Manager.
 * - '/' : Redirects to ISO Drawing Manager (embedded) or Hub (standalone)
 * - '/tools/armature-manager' : Armature List Manager
 * - '/tools/iso-drawing-manager' : ISO Drawing Manager
 * - '*' : Fallback to ISO Drawing Manager
 */
const isEmbedded = window.self !== window.top;

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* When embedded in Shell, go straight to ISO Drawing Manager */}
        <Route path="/" element={isEmbedded ? <Navigate to="/tools/iso-drawing-manager" replace /> : <HubPage />} />

        {/* Existing Armature Import & Master Manager Tool */}
        <Route path="/tools/armature-manager" element={<App />} />

        {/* ISO Drawing Manager Tool */}
        <Route path="/tools/iso-drawing-manager" element={<IsoDrawingManagerPage />} />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/tools/iso-drawing-manager" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
