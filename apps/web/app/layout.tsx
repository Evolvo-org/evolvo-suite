import type { Metadata } from 'next';
import { authQueryKeys } from '@repo/api-client';
import { dehydrate } from '@tanstack/react-query';
import localFont from 'next/font/local';
import './globals.css';

import { Providers } from './providers';
import { getServerSessionSnapshot } from '../src/features/auth/lib/server-auth';
import { getQueryClient } from '../src/lib/query-client';

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const realtimeToken =
    process.env.REALTIME_SOCKET_TOKEN ??
    process.env.NEXT_PUBLIC_REALTIME_SOCKET_TOKEN ??
    null;
  const queryClient = getQueryClient();
  const { accessToken, currentUser } = await getServerSessionSnapshot();

  if (currentUser) {
    queryClient.setQueryData(authQueryKeys.currentUser, currentUser);
  }

  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full bg-white text-black antialiased dark:bg-zinc-950 dark:text-zinc-100`}
      >
        <Providers
          accessToken={accessToken}
          currentUser={currentUser}
          dehydratedState={dehydrate(queryClient)}
          realtimeToken={realtimeToken}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
