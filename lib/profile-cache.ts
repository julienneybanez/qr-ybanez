import {
  useEffect,
  useSyncExternalStore,
} from 'react';

import {
  getProfileResult,
  type Profile,
} from './profiles';

let cachedUserId:
  | string
  | null = null;

let cachedProfile:
  | Profile
  | null = null;

let initializedUserId:
  | string
  | null = null;

let loadingUserId:
  | string
  | null = null;

let errorUserId:
  | string
  | null = null;

let cachedError:
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
    (listener) =>
      listener()
  );
}

function subscribe(
  listener: () => void
) {
  listeners.add(
    listener
  );

  return () => {
    listeners.delete(
      listener
    );
  };
}

function getSnapshot() {
  return version;
}

export function getCachedProfile(
  userId: string
) {
  if (
    cachedUserId !==
    userId
  ) {
    return null;
  }

  return cachedProfile;
}

export function getProfileCacheError(
  userId: string
) {
  if (
    errorUserId !==
    userId
  ) {
    return null;
  }

  return cachedError;
}

export function hasCachedProfile(
  userId: string
) {
  return (
    initializedUserId ===
    userId
  );
}

export function isProfileLoading(
  userId: string
) {
  return (
    loadingUserId ===
    userId
  );
}

export async function loadCachedProfile(
  userId: string,
  force = false
): Promise<Profile | null> {
  if (
    !force &&
    initializedUserId ===
      userId
  ) {
    return getCachedProfile(
      userId
    );
  }

  if (
    loadingUserId ===
      userId &&
    pendingRequest
  ) {
    return pendingRequest;
  }

  loadingUserId =
    userId;

  /*
   * Clear the previous error while a retry is running, but keep
   * an already cached profile visible during background refreshes.
   */
  if (
    errorUserId ===
    userId
  ) {
    errorUserId =
      null;

    cachedError =
      null;
  }

  notify();

  const request =
    getProfileResult(
      userId
    )
      .then(
        ({
          profile,
          error,
        }) => {
          if (
            loadingUserId !==
            userId
          ) {
            return profile;
          }

          loadingUserId =
            null;

          pendingRequest =
            null;

          initializedUserId =
            userId;

          if (error) {
            errorUserId =
              userId;

            cachedError =
              error;

            /*
             * If a profile was already cached, leave it intact.
             * A temporary network failure should not blank the UI.
             */
            notify();

            return (
              getCachedProfile(
                userId
              )
            );
          }

          cachedUserId =
            userId;

          cachedProfile =
            profile;

          if (!profile) {
            errorUserId =
              userId;

            cachedError =
              'Profile record was not found.';
          } else {
            errorUserId =
              null;

            cachedError =
              null;
          }

          notify();

          return profile;
        }
      )
      .catch(
        (error: any) => {
          if (
            loadingUserId !==
            userId
          ) {
            return (
              getCachedProfile(
                userId
              )
            );
          }

          loadingUserId =
            null;

          pendingRequest =
            null;

          initializedUserId =
            userId;

          errorUserId =
            userId;

          cachedError =
            error?.message ||
            'Unable to load profile.';

          notify();

          return (
            getCachedProfile(
              userId
            )
          );
        }
      );

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
    cachedUserId !==
      userId ||
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

  errorUserId =
    null;

  cachedError =
    null;

  notify();
}

export function clearProfileCache() {
  cachedUserId =
    null;

  cachedProfile =
    null;

  initializedUserId =
    null;

  loadingUserId =
    null;

  errorUserId =
    null;

  cachedError =
    null;

  pendingRequest =
    null;

  notify();
}

export function useCachedProfile(
  userId?:
    | string
    | null
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

  const error =
    userId
      ? getProfileCacheError(
          userId
        )
      : null;

  const loading =
    Boolean(
      userId &&
      initializedUserId !==
        userId
    );

  const refreshing =
    Boolean(
      userId &&
      loadingUserId ===
        userId
    );

  return {
    profile,
    loading,
    refreshing,
    error,
  };
}
