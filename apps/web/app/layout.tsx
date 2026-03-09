import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

import { Providers } from './providers';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Evolvo v2',
  description: 'DB-orchestrated autonomous software factory control plane',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full bg-white text-black antialiased dark:bg-zinc-950 dark:text-zinc-100`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
