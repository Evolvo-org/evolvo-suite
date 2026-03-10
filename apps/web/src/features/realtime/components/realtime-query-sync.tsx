'use client';

import type { ProjectRealtimeEvent } from '@repo/shared';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import {
  getProjectIdFromPathname,
  getRealtimeServerUrl,
  shouldInvalidateRealtimeQuery,
} from '../../../lib/realtime';

export const RealtimeQuerySync = ({
  realtimeToken,
}: {
  realtimeToken: string | null;
}) => {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const currentProjectIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const serverUrl = getRealtimeServerUrl();
    const trimmedToken = realtimeToken?.trim();

    if (!serverUrl || !trimmedToken) {
      return;
    }

    const socket = io(`${serverUrl}/realtime`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
      auth: {
        token: trimmedToken,
      },
    });
    socketRef.current = socket;

    const subscribeToProject = () => {
      const projectId = currentProjectIdRef.current;

      if (!projectId) {
        return;
      }

      socket.emit('projects.subscribe', { projectId });
    };

    const handleRealtimeEvent = (event: ProjectRealtimeEvent) => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          shouldInvalidateRealtimeQuery(query.queryKey, event),
      });
    };

    socket.on('connect', subscribeToProject);
    socket.on('realtime.event', handleRealtimeEvent);

    subscribeToProject();

    return () => {
      socket.off('connect', subscribeToProject);
      socket.off('realtime.event', handleRealtimeEvent);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient, realtimeToken]);

  useEffect(() => {
    const projectId = getProjectIdFromPathname(pathname);
    currentProjectIdRef.current = projectId;

    if (!projectId) {
      return;
    }

    socketRef.current?.emit('projects.subscribe', { projectId });
  }, [pathname]);

  return null;
};
