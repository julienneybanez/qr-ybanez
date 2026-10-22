import { supabase } from './supabase';

export type Role =
  | 'student'
  | 'teacher'
  | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  student_id: string | null;
};

export type ProfileFetchResult = {
  profile: Profile | null;
  error: string | null;
};

export async function getProfileResult(
  userId: string
): Promise<ProfileFetchResult> {
  const { data, error } =
    await supabase
      .from('profiles')
      .select(
        'id, email, full_name, role, student_id'
      )
      .eq('id', userId)
      .maybeSingle();

  if (error) {
    return {
      profile: null,
      error:
        error.message ||
        'Unable to load profile.',
    };
  }

  if (!data) {
    return {
      profile: null,
      error:
        'Profile record was not found.',
    };
  }

  return {
    profile:
      data as Profile,
    error: null,
  };
}

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const {
    profile,
  } =
    await getProfileResult(
      userId
    );

  return profile;
}

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
  }
): Promise<{
  error: string | null;
}> {
  const { error } =
    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

  return {
    error:
      error?.message ?? null,
  };
}
