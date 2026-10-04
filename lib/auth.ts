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
import { supabase } from './supabase';

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

let globalLoading = false;

const listeners =
  new Set<() => void>();

function notify() {
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
  return globalSession;
}

export function setAuth(
  session: Session | null
) {
  const previousUserId =
    globalUser?.id ?? null;

  const nextUserId =
    session?.user?.id ?? null;

  if (
    previousUserId &&
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

export function useAuth(): AuthState {
  const session =
    useSyncExternalStore(
      subscribe,
      getSnapshot,
      getSnapshot
    );

  return {
    session,
    user:
      session?.user ??
      globalUser,
    loading: globalLoading,
  };
}

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } =
    await supabase.auth.signUp({
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

    setAuth(data.session);
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
  const { data, error } =
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

    setAuth(data.session);
  }

  return {
    data,
    error,
  };
}

export async function signOut() {
  clearProfileCache();

  setAuth(null);

  supabase.auth
    .signOut()
    .catch(() => {});

  return {
    error: null,
  };
}