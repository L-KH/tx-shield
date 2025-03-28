'use client';

import React from 'react';
import { MetaMaskProvider } from '@metamask/sdk-react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MetaMaskProvider
      sdkOptions={{
        dappMetadata: {
          name: 'TX Shield',
          url: 'https://txshield.xyz',
        },
        checkInstallationImmediately: false,
      }}
    >
      {children}
    </MetaMaskProvider>
  );
}