// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { ToastProvider } from './components/ui/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TX Shield - Advanced DeFi Transaction Security',
  description: 'Protect your crypto transactions with AI-powered threat detection and simulation',
  keywords: 'web3, security, defi, crypto, blockchain, ethereum, transaction, security',
  authors: [{ name: 'Lahcen KH' }],
  viewport: 'width=device-width, initial-scale=1'
};
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
            <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}