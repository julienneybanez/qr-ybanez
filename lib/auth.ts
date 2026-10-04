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

let authState: AuthState = {
  session: null,
  user: null,
  loading: true,
};

let initializationPromise:
  | Promise<void>
  | null = null;

const listeners =
  new Set<() => void>();

function notify() {
  listeners.forEach(
    (listener) =>
      listener()
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
  return authState;
}

export function setAuth(
  session: Session | null
) {
  const previousUserId =
    authState.user?.id ??
    null;

  const nextUser =
    session?.user ??
    null;

  const nextUserId =
    nextUser?.id ??
    null;

  if (
    previousUserId &&
    previousUserId !==
      nextUserId
  ) {
    clearProfileCache();
  }

  authState = {
    session,
    user: nextUser,
    loading: false,
  };

  notify();
}

export function initializeAuth() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise =
    (async () => {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth
            .getSession();

        if (error) {
          console.warn(
            'Unable to restore session:',
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
        console.warn(
          'Unable to initialize authentication:',
          error
        );

        setAuth(null);
      }
    })();

  return initializationPromise;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );
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
    clearProfileCache();

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
    clearProfileCache();

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
  const {
    error,
  } =
    await supabase.auth
      .signOut();

  if (!error) {
    clearProfileCache();

    setAuth(null);
  }

  return {
    error,
  };
}