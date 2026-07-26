import React, { createContext, useContext, useState, useCallback } from 'react';

interface UIContextType {
  isPricingModalOpen: boolean;
  setIsPricingModalOpen: (open: boolean) => void;
  isCommandKOpen: boolean;
  setIsCommandKOpen: (open: boolean) => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  activeSoundscape: string | null;
  setActiveSoundscape: (type: string | null) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isCommandKOpen, setIsCommandKOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [activeSoundscape, setActiveSoundscape] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  return (
    <UIContext.Provider
      value={{
        isPricingModalOpen,
        setIsPricingModalOpen,
        isCommandKOpen,
        setIsCommandKOpen,
        isNotificationDrawerOpen,
        setIsNotificationDrawerOpen,
        activeSoundscape,
        setActiveSoundscape,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};