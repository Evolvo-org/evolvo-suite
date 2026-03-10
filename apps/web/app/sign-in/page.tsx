import { redirect } from 'next/navigation';

import { SignInForm } from '../../src/features/auth/components/sign-in-form';
import {
  defaultAuthenticatedPath,
  sanitizeReturnTo,
} from '../../src/features/auth/lib/auth-cookie';
import { getOptionalCurrentUser } from '../../src/features/auth/lib/server-auth';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentUser = await getOptionalCurrentUser();
  const nextPath = sanitizeReturnTo(
    resolvedSearchParams.next ?? defaultAuthenticatedPath,
  );

  if (currentUser) {
    redirect(nextPath);
  }

  return <SignInForm nextPath={nextPath} />;
}
