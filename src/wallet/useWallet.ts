// Thin wrapper over @ckb-ccc/connector-react that gives components a small,
// stable API. Keeps CCC's surface area contained to this file so we can swap
// connectors later (or mock it in tests) without touching UI code.

import { useEffect, useState } from 'react';
import { ccc } from '@ckb-ccc/connector-react';

export interface Wallet {
  isConnected: boolean;
  address: string | null;
  walletName: string | null;
  signer: ccc.Signer | undefined;
  connect: () => void;
  disconnect: () => void;
}

export function useWallet(): Wallet {
  const { open, disconnect, wallet, signerInfo } = ccc.useCcc();
  const signer = ccc.useSigner();

  // Signer.getRecommendedAddress() is async — cache it in state so components
  // can render synchronously without awaiting on every render.
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!signer) {
      setAddress(null);
      return;
    }
    let cancelled = false;
    signer
      .getRecommendedAddress()
      .then((a) => {
        if (!cancelled) setAddress(a);
      })
      .catch(() => {
        if (!cancelled) setAddress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [signer]);

  return {
    isConnected: Boolean(signerInfo),
    address,
    walletName: wallet?.name ?? null,
    signer,
    connect: open,
    disconnect,
  };
}
