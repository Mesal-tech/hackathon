import React, { useState, useEffect, createContext, useContext } from 'react';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser, useAuth } from '@clerk/clerk-react';
import { KeyRound, ShieldAlert, Sparkles, CheckCircle2, Lock } from 'lucide-react';

interface AuthSetupContextType {
  hasValidClerkKey: boolean;
  publishableKey: string;
  setPublishableKey: (key: string) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
}

export const AuthSetupContext = createContext<AuthSetupContextType>({
  hasValidClerkKey: false,
  publishableKey: '',
  setPublishableKey: () => {},
  isDemoMode: false,
  setIsDemoMode: () => {},
});

export const useAuthSetup = () => useContext(AuthSetupContext);

// Check for Clerk key in Vite env or LocalStorage
const getInitialKey = (): string => {
  return (
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
    localStorage.getItem('antigravity_clerk_pub_key') ||
    ''
  );
};

export const ClerkAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [publishableKey, setKey] = useState<string>(getInitialKey);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('antigravity_auth_demo_mode') === 'true';
  });

  const saveKey = (newKey: string) => {
    const trimmed = newKey.trim();
    setKey(trimmed);
    if (trimmed) {
      localStorage.setItem('antigravity_clerk_pub_key', trimmed);
    } else {
      localStorage.removeItem('antigravity_clerk_pub_key');
    }
  };

  const setDemo = (val: boolean) => {
    setIsDemoMode(val);
    localStorage.setItem('antigravity_auth_demo_mode', String(val));
  };

  const isValidClerkKey = Boolean(
    publishableKey &&
    (publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_'))
  );

  const contextValue: AuthSetupContextType = {
    hasValidClerkKey: isValidClerkKey,
    publishableKey,
    setPublishableKey: saveKey,
    isDemoMode,
    setIsDemoMode: setDemo,
  };

  if (isValidClerkKey) {
    return (
      <AuthSetupContext.Provider value={contextValue}>
        <ClerkProvider publishableKey={publishableKey}>
          {children}
        </ClerkProvider>
      </AuthSetupContext.Provider>
    );
  }

  // If no live Clerk key has been provided yet, render with AuthSetupContext and setup banner
  return (
    <AuthSetupContext.Provider value={contextValue}>
      {children}
    </AuthSetupContext.Provider>
  );
};
