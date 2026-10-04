import {
  useSyncExternalStore,
} from 'react';

import type {
  Session,
  User,
} from '@supabase/supabase-js';

import {
  clearProfileCache,
} from './profile-cache';

import {
  supabase,
} from './supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export type SignUpProfile = {
  full_name: string;

  role:
    | 'student'
    | 'teacher';

  student_id:
    | string
    | null;
};

let globalSession:
  | Session
  | null = null;

let globalUser:
  | User
  | null = null;

let globalLoading = true;

let authListenerStarted =
  false;

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

function withTimeout<T>(
  promise:
    PromiseLike<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const timeoutId =
        setTimeout(
          () => {
            reject(
              new Error(
                'Session restoration timed out.'
              )
            );
          },
          timeoutMs
        );

      Promise.resolve(
        promise
      ).then(
        (value) => {
          clearTimeout(
            timeoutId
          );

          resolve(value);
        },
        (error) => {
          clearTimeout(
            timeoutId
          );

          reject(error);
        }
      );
    }
  );
}

export function setAuth(
  session: Session | null
) {
  const previousUserId =
    globalUser?.id ??
    null;

  const nextUserId =
    session?.user?.id ??
    null;

  if (
    previousUserId !==
    nextUserId
  ) {
    clearProfileCache();
  }

  globalSession =
    session;

  globalUser =
    session?.user ??
    null;

  globalLoading =
    false;

  notify();
}

function startAuthListener() {
  if (
    authListenerStarted
  ) {
    return;
  }

  authListenerStarted =
    true;

  supabase.auth
    .onAuthStateChange(
      (
        _event,
        session
      ) => {
        setAuth(
          session
        );
      }
    );
}

async function initializeAuth() {
  try {
    /*
     * Restore first, then subscribe. Doing both simultaneously
     * can leave auth initialization waiting on storage in some
     * React Native / Expo environments.
     */
    const {
      data,
      error,
    } =
      await withTimeout(
        supabase.auth
          .getSession(),
        8000
      );

    if (error) {
      console.warn(
        'Unable to restore the saved session:',
        error.message
      );

      setAuth(null);

      return;
    }

    setAuth(
      data.session ??
      null
    );
  } catch (error) {
    /*
     * Never leave the whole app behind an endless startup
     * spinner. If restoration fails or times out, continue as
     * signed out and allow a normal login.
     */
    console.warn(
      'Unable to restore the saved session:',
      error
    );

    setAuth(null);
  } finally {
    startAuthListener();
  }
}

void initializeAuth();

export function useAuth(): AuthState {
  useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  return {
    session:
      globalSession,

    user:
      globalUser,

    loading:
      globalLoading,
  };
}

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const {
    data,
    error,
  } =
    await supabase.auth
      .signUp({
        email,
        password,

        options: profile
          ? {
              data: {
                full_name:
                  profile.full_name,

                role:
                  profile.role,

                student_id:
                  profile.student_id,
              },
            }
          : undefined,
      });

  if (
    !error &&
    data.session
  ) {
    setAuth(
      data.session
    );
  }

  return {
    data,
    error,
  };
}

export async function signIn(
  email: string,
  password: string
) {
  const {
    data,
    error,
  } =
    await supabase.auth
      .signInWithPassword({
        email,
        password,
      });

  if (
    !error &&
    data.session
  ) {
    setAuth(
      data.session
    );
  }

  return {
    data,
    error,
  };
}

export async function signOut() {
  clearProfileCache();

  setAuth(null);

  const {
    error,
  } =
    await supabase.auth
      .signOut();

  return {
    error,
  };
}
