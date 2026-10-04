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

/*
 * Supabase emits INITIAL_SESSION after it has checked the
 * configured persistent storage. We use that event as the
 * single source of truth for cold-start restoration.
 *
 * Do not call getSession() in parallel with this during startup.
 * In React Native/Expo that can leave a pending auth lock behind,
 * causing a later signInWithPassword() call to appear frozen.
 */
const {
  data:
    authSubscription,
} =
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

/*
 * Defensive fallback only for the UI. It does not start another
 * Supabase auth request, so it cannot compete for the auth lock.
 * If INITIAL_SESSION has not arrived after a few seconds, allow
 * the user to reach Login instead of showing an endless spinner.
 */
const startupFallback =
  setTimeout(
    () => {
      if (
        globalLoading
      ) {
        globalLoading =
          false;

        notify();
      }
    },
    4000
  );

void authSubscription;
void startupFallback;

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

  const {
    error,
  } =
    await supabase.auth
      .signOut();

  if (!error) {
    setAuth(null);
  }

  return {
    error,
  };
}
