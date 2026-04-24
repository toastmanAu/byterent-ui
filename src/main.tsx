import './polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ccc } from '@ckb-ccc/connector-react';
import { JoyIDRedirectSignersController } from '@byterent/joyid-connect';
import { JoyIDConnectProvider } from '@byterent/joyid-connect/react';
import { isMobileDevice } from './wallet/isMobileDevice';
import './index.css';
import App from './App.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

const ckbClient = new ccc.ClientPublicTestnet();

// On a desktop browser, CCC's stock JoyID signer relies on a popup +
// Chrome's FIDO hybrid (caBLE) QR pairing — notoriously flaky on
// Linux/Chrome. We swap it for the redirect-relay signer that brokers
// through our own Cloudflare Worker.
//
// On a mobile browser, JoyID's native popup flow works fine (the device
// has the passkey locally — no cross-device handoff needed). There we
// skip our controller entirely so CCC's default wallet picker runs,
// including the stock JoyID Passkey entry.
const ON_MOBILE = isMobileDevice();

const signersController = ON_MOBILE
  ? undefined
  : new JoyIDRedirectSignersController({
      network: 'testnet',
      storageKey: 'byterent.wallet.joyid_connection',
    });

const APP_NAME = 'ByteRent';
// JoyID fetches this URL from its own servers to render our brand during
// the auth screen. Needs to be publicly reachable HTTPS; our relay
// Worker's /logo.png endpoint serves the same inlined PNG the callback
// page uses. Override at build time via VITE_APP_ICON_URL for dev.
const APP_ICON =
  (import.meta.env.VITE_APP_ICON_URL as string | undefined) ??
  'https://auth.byterent.xyz/logo.png';

const WORKER_URL =
  (import.meta.env.VITE_AUTH_WORKER_URL as string | undefined) ??
  'https://auth.byterent.xyz';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ccc.Provider
        defaultClient={ckbClient}
        name={APP_NAME}
        icon={APP_ICON}
        signersController={signersController}
      >
        {ON_MOBILE ? (
          <BrowserRouter>
            <App />
          </BrowserRouter>
        ) : (
          <JoyIDConnectProviderWithCccClose
            appName={APP_NAME}
            appIcon={APP_ICON}
            workerUrl={WORKER_URL}
          >
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </JoyIDConnectProviderWithCccClose>
        )}
      </ccc.Provider>
    </QueryClientProvider>
  </StrictMode>,
);

// Wrapper that bridges the library's onBeginConnect hook to CCC's modal
// close. Kept here (not in the library) because "close CCC modal" is a
// consumer choice — other wallet pickers have different close patterns.
function JoyIDConnectProviderWithCccClose({
  appName,
  appIcon,
  workerUrl,
  children,
}: {
  appName: string;
  appIcon: string;
  workerUrl: string;
  children: React.ReactNode;
}) {
  const { close } = ccc.useCcc();
  return (
    <JoyIDConnectProvider
      appName={appName}
      appIcon={appIcon}
      network="testnet"
      workerUrl={workerUrl}
      onBeginConnect={close}
      modalProps={{
        logoSrc: '/brand/br_logo_blu_lock_5656.png',
        logoSize: 56,
        finderColor: '#0CC095',
      }}
    >
      {children}
    </JoyIDConnectProvider>
  );
}
