import {
  useEffect,
  useSyncExternalStore,
} from 'react';

import {
  getProfile,
  type Profile,
} from './profiles';

type ProfileCacheSnapshot = {
  cachedUserId: string | null;
  cachedProfile: Profile | null;
  initializedUserId: string | null;
  loadingUserId: string | null;
};

let snapshot: ProfileCacheSnapshot = {
  cachedUserId: null,
  cachedProfile: null,
  initializedUserId: null,
  loadingUserId: null,
};

let pendingRequest:
  | Promise<Profile | null>
  | null = null;

const listeners =
  new Set<() => void>();

function subscribe(
  listener: () => void
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function updateSnapshot(
  next:
    | ProfileCacheSnapshot
    | ((
        current: ProfileCacheSnapshot
      ) => ProfileCacheSnapshot)
) {
  snapshot =
    typeof next === 'function'
      ? next(snapshot)
      : next;

  listeners.forEach(
    (listener) => listener()
  );
}

export function getCachedProfile(
  userId: string
) {
  if (
    snapshot.cachedUserId !==
    userId
  ) {
    return null;
  }

  return snapshot.cachedProfile;
}

export function hasCachedProfile(
  userId: string
) {
  return (
    snapshot.initializedUserId ===
    userId
  );
}

export async function loadCachedProfile(
  userId: string,
  force = false
): Promise<Profile | null> {
  if (
    !force &&
    snapshot.initializedUserId ===
      userId
  ) {
    return getCachedProfile(
      userId
    );
  }

  if (
    snapshot.loadingUserId ===
      userId &&
    pendingRequest
  ) {
    return pendingRequest;
  }

  updateSnapshot(
    (current) => ({
      ...current,
      loadingUserId:
        userId,
    })
  );

  const request =
    getProfile(userId)
      .then((profile) => {
        if (
          snapshot.loadingUserId !==
          userId
        ) {
          return profile;
        }

        pendingRequest =
          null;

        updateSnapshot({
          cachedUserId:
            userId,

          cachedProfile:
            profile,

          initializedUserId:
            userId,

          loadingUserId:
            null,
        });

        return profile;
      })
      .catch(() => {
        if (
          snapshot.loadingUserId ===
          userId
        ) {
          pendingRequest =
            null;

          updateSnapshot(
            (current) => ({
              ...current,

              initializedUserId:
                userId,

              loadingUserId:
                null,
            })
          );
        }

        return null;
      });

  pendingRequest =
    request;

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
    snapshot.cachedUserId !==
      userId ||
    !snapshot.cachedProfile
  ) {
    return;
  }

  updateSnapshot(
    (current) => ({
      ...current,

      cachedProfile: {
        ...current.cachedProfile!,
        ...updates,
      },

      initializedUserId:
        userId,
    })
  );
}

export function clearProfileCache() {
  pendingRequest =
    null;

  updateSnapshot({
    cachedUserId:
      null,

    cachedProfile:
      null,

    initializedUserId:
      null,

    loadingUserId:
      null,
  });
}

export function useCachedProfile(
  userId?: string | null
) {
  const state =
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
    userId &&
    state.cachedUserId ===
      userId
      ? state.cachedProfile
      : null;

  const loading =
    Boolean(
      userId &&
      state.initializedUserId !==
        userId
    );

  return {
    profile,
    loading,
  };
}