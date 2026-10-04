import {
  useEffect,
  useSyncExternalStore,
} from 'react';

import {
  getProfile,
  type Profile,
} from './profiles';

let cachedUserId: string | null =
  null;

let cachedProfile: Profile | null =
  null;

let initializedUserId:
  | string
  | null = null;

let loadingUserId:
  | string
  | null = null;

let pendingRequest:
  | Promise<Profile | null>
  | null = null;

let version = 0;

const listeners =
  new Set<() => void>();

function notify() {
  version += 1;

  listeners.forEach(
    (listener) => listener()
  );
}

function subscribe(
  listener: () => void
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return version;
}

export function getCachedProfile(
  userId: string
) {
  if (
    cachedUserId !== userId
  ) {
    return null;
  }

  return cachedProfile;
}

export function hasCachedProfile(
  userId: string
) {
  return (
    initializedUserId === userId
  );
}

export async function loadCachedProfile(
  userId: string,
  force = false
): Promise<Profile | null> {
  if (
    !force &&
    initializedUserId === userId
  ) {
    return getCachedProfile(
      userId
    );
  }

  if (
    loadingUserId === userId &&
    pendingRequest
  ) {
    return pendingRequest;
  }

  loadingUserId = userId;

  const request =
    getProfile(userId)
      .then((profile) => {
        if (
          loadingUserId === userId
        ) {
          cachedUserId =
            userId;

          cachedProfile =
            profile;

          initializedUserId =
            userId;

          loadingUserId =
            null;

          pendingRequest =
            null;

          notify();
        }

        return profile;
      })
      .catch(() => {
        if (
          loadingUserId === userId
        ) {
          initializedUserId =
            userId;

          loadingUserId =
            null;

          pendingRequest =
            null;

          notify();
        }

        return null;
      });

  pendingRequest = request;

  return request;
}

export async function refreshCachedProfile(
  userId: string
) {
  return loadCachedProfile(
    userId,
    true
  );
}

export function patchCachedProfile(
  userId: string,
  updates: Partial<Profile>
) {
  if (
    cachedUserId !== userId ||
    !cachedProfile
  ) {
    return;
  }

  cachedProfile = {
    ...cachedProfile,
    ...updates,
  };

  initializedUserId =
    userId;

  notify();
}

export function clearProfileCache() {
  cachedUserId = null;
  cachedProfile = null;
  initializedUserId = null;
  loadingUserId = null;
  pendingRequest = null;

  notify();
}

export function useCachedProfile(
  userId?: string | null
) {
  useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    void loadCachedProfile(
      userId
    );
  }, [userId]);

  const profile =
    userId
      ? getCachedProfile(
          userId
        )
      : null;

  const loading = Boolean(
    userId &&
      initializedUserId !==
        userId
  );

  return {
    profile,
    loading,
  };
}