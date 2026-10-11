import {
  useEffect,
  useSyncExternalStore,
} from 'react';

import {
  getProfileResult,
  type Profile,
} from './profiles';

type ProfileCacheSnapshot = {
  cachedUserId: string | null;
  cachedProfile: Profile | null;
  initializedUserId: string | null;
  loadingUserId: string | null;
  error: string | null;
};

let snapshot: ProfileCacheSnapshot = {
  cachedUserId: null,
  cachedProfile: null,
  initializedUserId: null,
  loadingUserId: null,
  error: null,
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
      error:
        null,
    })
  );

  const request =
    getProfileResult(userId)
      .then((result) => {
        if (
          snapshot.loadingUserId !==
          userId
        ) {
          return result.profile;
        }

        pendingRequest =
          null;

        if (
          result.error ||
          !result.profile
        ) {
          const cachedProfile =
            snapshot.cachedUserId ===
              userId
              ? snapshot.cachedProfile
              : null;

          updateSnapshot(
            (current) => ({
              ...current,
              initializedUserId:
                userId,
              loadingUserId:
                null,
              error:
                result.error ||
                'Unable to load profile.',
            })
          );

          return cachedProfile;
        }

        updateSnapshot({
          cachedUserId:
            userId,

          cachedProfile:
            result.profile,

          initializedUserId:
            userId,

          loadingUserId:
            null,

          error:
            null,
        });

        return result.profile;
      })
      .catch((error: any) => {
        if (
          snapshot.loadingUserId !==
          userId
        ) {
          return getCachedProfile(
            userId
          );
        }

        pendingRequest =
          null;

        const cachedProfile =
          snapshot.cachedUserId ===
            userId
            ? snapshot.cachedProfile
            : null;

        updateSnapshot(
          (current) => ({
            ...current,
            initializedUserId:
              userId,
            loadingUserId:
              null,
            error:
              error?.message ||
              'Unable to load profile.',
          })
        );

        return cachedProfile;
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

      error:
        null,
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

    error:
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
      !profile &&
      (
        state.initializedUserId !==
          userId ||
        state.loadingUserId ===
          userId
      )
    );

  const error =
    userId &&
    state.initializedUserId ===
      userId
      ? state.error
      : null;

  return {
    profile,
    loading,
    error,
  };
}
