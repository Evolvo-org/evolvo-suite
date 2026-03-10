'use client';

import type { AuthRole, CurrentUserResponse } from '@repo/shared';
import { authRoles } from '@repo/shared';
import { Button } from '@repo/ui/components/button/button';
import { Card } from '@repo/ui/components/card/card';
import { Input } from '@repo/ui/components/input/input';
import { Select } from '@repo/ui/components/select/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React, { startTransition, useState } from 'react';

import {
  QueryStateCard,
} from '../../feedback/components/query-state-card';
import {
  configureBrowserApiClient,
  storeAccessToken,
} from '../lib/browser-auth';
import { authQueryKeys } from '@repo/api-client';

interface SignInResponse {
  accessToken: string;
  currentUser: CurrentUserResponse;
}

const roleOptions = authRoles.map((role) => ({
  description:
    role === 'admin'
      ? 'Full operator access, billing controls, and workspace overrides.'
      : role === 'operator'
        ? 'Project creation, planning changes, execution controls, and usage access.'
        : role === 'reviewer'
          ? 'Workflow review access plus project usage visibility.'
          : 'Read-only project visibility.',
  label: role,
}));

export const SignInForm = ({ nextPath }: { nextPath: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('operator@example.com');
  const [displayName, setDisplayName] = useState('Operator One');
  const [role, setRole] = useState<AuthRole>('operator');
  const [userId, setUserId] = useState('operator-1');
  const [workspaceKey, setWorkspaceKey] = useState('default');

  const signInMutation = useMutation({
    mutationFn: async (): Promise<SignInResponse> => {
      const response = await fetch('/api/auth/session', {
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          email: email.trim() || undefined,
          role,
          userId: userId.trim(),
          workspaceKey: workspaceKey.trim() || undefined,
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      });

      const payload = (await response.json().catch(() => null)) as
        | SignInResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !('accessToken' in payload)) {
        const errorMessage =
          payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          typeof payload.message === 'string'
            ? payload.message
            : 'Unable to sign in.';

        throw new Error(errorMessage);
      }

      return payload;
    },
    onSuccess: ({ accessToken, currentUser }) => {
      storeAccessToken(accessToken);
      configureBrowserApiClient(accessToken);
      queryClient.setQueryData(authQueryKeys.currentUser, currentUser);
      startTransition(() => {
        router.replace(nextPath);
        router.refresh();
      });
    },
  });

  const errorMessage =
    signInMutation.error instanceof Error
      ? signInMutation.error.message
      : null;

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-zinc-900/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Evolvo v2
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Operator sign-in
            </h1>
            <p className="mt-4 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
              Start a session for the autonomous software factory control plane.
              This development login issues a signed API session and restores the
              dashboard workspace.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {roleOptions.map((option) => (
                <Card
                  key={option.label}
                  className={`space-y-2 p-5 ${
                    option.label === role
                      ? 'border-zinc-950 dark:border-zinc-100'
                      : ''
                  }`}
                  title={option.label}
                >
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {option.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-8" title="Session bootstrap">
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void signInMutation.mutateAsync();
              }}
            >
              <label className="space-y-2 text-sm font-medium" htmlFor="userId">
                <span>User ID</span>
                <Input
                  id="userId"
                  name="userId"
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder="operator-1"
                  required
                  value={userId}
                />
              </label>

              <label className="space-y-2 text-sm font-medium" htmlFor="displayName">
                <span>Display name</span>
                <Input
                  id="displayName"
                  name="displayName"
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Operator One"
                  value={displayName}
                />
              </label>

              <label className="space-y-2 text-sm font-medium" htmlFor="email">
                <span>Email</span>
                <Input
                  id="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="operator@example.com"
                  type="email"
                  value={email}
                />
              </label>

              <label className="space-y-2 text-sm font-medium" htmlFor="role">
                <span>Role</span>
                <Select
                  id="role"
                  name="role"
                  onChange={(event) => setRole(event.target.value as AuthRole)}
                  value={role}
                >
                  {authRoles.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </label>

              <label
                className="space-y-2 text-sm font-medium"
                htmlFor="workspaceKey"
              >
                <span>Workspace key</span>
                <Input
                  id="workspaceKey"
                  name="workspaceKey"
                  onChange={(event) => setWorkspaceKey(event.target.value)}
                  placeholder="default"
                  value={workspaceKey}
                />
              </label>

              {errorMessage ? (
                <QueryStateCard
                  description={errorMessage}
                  title="Sign-in failed"
                />
              ) : null}

              <Button
                className="w-full"
                disabled={signInMutation.isPending}
                type="submit"
              >
                {signInMutation.isPending ? 'Signing in...' : 'Start session'}
              </Button>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                After sign-in you will be redirected to <code>{nextPath}</code>.
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
