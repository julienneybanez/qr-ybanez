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

export function setAuth(
  session: Session | null
) {
  const previousUserId =
    globalUser?.id ?? null;

  const nextUserId =
    session?.user?.id ?? null;

  if (
    previousUserId !==
    nextUserId
  ) {
    clearProfileCache();
  }

  globalSession = session;

  globalUser =
    session?.user ?? null;

  globalLoading = false;

  notify();
}

async function restoreSession() {
  try {
    const {
      data,
      error,
    } =
      await supabase.auth
        .getSession();

    if (error) {
      console.warn(
        'Unable to restore the saved session:',
        error.message
      );

      setAuth(null);

      return;
    }

    setAuth(
      data.session ?? null
    );
  } catch (error) {
    console.warn(
      'Unable to restore the saved session:',
      error
    );

    setAuth(null);
  }
}

/*
 * Keep the in-memory auth state synchronized with Supabase.
 *
 * This covers sign-in, sign-out, token refreshes, and restored
 * sessions without requiring every screen to manage auth state.
 */
supabase.auth.onAuthStateChange(
  (_event, session) => {
    setAuth(session);
  }
);

/*
 * Restore the persisted session once when this module is loaded.
 * RootLayout keeps showing its loading state until this completes.
 */
void restoreSession();

export function useAuth(): AuthState {
  useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
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
  /*
   * Clear the local UI immediately so private screens/data are
   * no longer displayed while Supabase completes sign-out.
   */
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
