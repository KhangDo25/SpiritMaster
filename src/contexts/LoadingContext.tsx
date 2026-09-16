import React, { createContext, useContext, useState, useCallback } from 'react';
import { TopProgressBar } from '../components/ui/Loading';

interface LoadingContextType {
  isGlobalLoading: boolean;
  loadingMessage?: string;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isGlobalLoading: false,
  loadingMessage: undefined,
  startLoading: () => {},
  stopLoading: () => {},
});

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(undefined);

  const startLoading = useCallback((msg?: string) => {
    setLoadingMessage(msg);
    setIsGlobalLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsGlobalLoading(false);
    setLoadingMessage(undefined);
  }, []);

  return (
    <LoadingContext.Provider value={{ isGlobalLoading, loadingMessage, startLoading, stopLoading }}>
      <TopProgressBar isVisible={isGlobalLoading} />
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
