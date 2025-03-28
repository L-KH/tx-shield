// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TX Shield - Advanced DeFi Transaction Security',
  description: 'Protect your crypto transactions with AI-powered threat detection and simulation',
  keywords: 'web3, security, defi, crypto, blockchain, ethereum, transaction, security',
  authors: [{ name: 'TX Shield Team' }],
  viewport: 'width=device-width, initial-scale=1'
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        {children}
      </body>
    </html>
  );
}