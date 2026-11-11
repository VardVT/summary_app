import React, { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Capability } from '../types';
import { ForbiddenPage } from '../pages/ForbiddenPage';

interface RequireCapProps {
  requiredCap?: Capability;
  children?: ReactNode;
}

export const RequireCap: React.FC<RequireCapProps> = ({ requiredCap, children }) => {
  const { caps } = useAuth();

  if (requiredCap && !caps.includes(requiredCap)) {
    return <ForbiddenPage requiredCap={requiredCap} />;
  }

  return <>{children}</>;
};
