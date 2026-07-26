import React, { createContext, useContext, useState } from 'react';
import { ViewTab } from '../types';

interface ViewContextType {
  currentView: ViewTab;
  setCurrentView: (view: ViewTab) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const ViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewTab>('dashboard');

  return (
    <ViewContext.Provider value={{ currentView, setCurrentView }}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (!context) throw new Error('useView must be used within a ViewProvider');
  return context;
};