import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import App from './App';
import './index.css';

const PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  'pk_test_Y3JlZGlibGUtbWFrby05ODYzLmNsZXJrLmFjY291bnRzLmRldiQ';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#38bdf8',
          colorBackground: '#141720',
          colorInputBackground: '#191c26',
          colorInputText: '#f8fafc',
          colorText: '#f8fafc',
          colorTextSecondary: '#94a3b8',
          colorTextOnPrimaryBackground: '#ffffff',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          borderRadius: '12px',
        },
        elements: {
          card: {
            background: '#141720',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.65)',
            borderRadius: '24px',
          },
          modalContent: {
            background: '#141720',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.75)',
          },
          modalBackdrop: {
            backgroundColor: 'rgba(10, 13, 20, 0.85)',
            backdropFilter: 'blur(12px)',
          },
          formButtonPrimary: {
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            color: '#ffffff',
            borderRadius: '9999px',
            fontWeight: '600',
            boxShadow: '0 4px 18px rgba(56, 189, 248, 0.4)',
            border: 'none',
            fontSize: '0.92rem',
            '&:hover': {
              filter: 'brightness(1.1)',
            },
          },
          formFieldInput: {
            background: '#191c26',
            borderColor: '#282d3d',
            color: '#f8fafc',
            borderRadius: '12px',
          },
          formFieldLabel: {
            color: '#8b94a7',
            fontSize: '0.82rem',
          },
          socialButtonsBlockButton: {
            background: '#191c26',
            borderColor: '#282d3d',
            color: '#f8fafc',
            borderRadius: '12px',
            '&:hover': {
              background: '#202534',
              borderColor: '#38bdf8',
            },
          },
          socialButtonsBlockButtonText: {
            color: '#f8fafc',
            fontWeight: '600',
          },
          dividerLine: {
            background: '#282d3d',
          },
          dividerText: {
            color: '#64748b',
          },
          headerTitle: {
            color: '#ffffff',
            fontWeight: '700',
          },
          headerSubtitle: {
            color: '#94a3b8',
          },
          footer: {
            background: 'transparent',
          },
          footerActionText: {
            color: '#94a3b8',
          },
          footerActionLink: {
            color: '#38bdf8',
            fontWeight: '600',
          },
          userButtonPopoverCard: {
            background: '#141720',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
          },
          userPreviewMainIdentifier: {
            color: '#ffffff',
            fontWeight: '600',
          },
          userPreviewSecondaryIdentifier: {
            color: '#94a3b8',
          },
          userButtonPopoverActionButton: {
            color: '#e2e8f0',
            '&:hover': {
              background: '#1e2330',
            },
          },
          userButtonPopoverActionButtonIcon: {
            color: '#38bdf8',
          },
          userButtonPopoverFooter: {
            display: 'none',
          },
        },
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
