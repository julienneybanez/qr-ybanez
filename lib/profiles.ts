import { supabase } from './supabase';

export type Role =
  | 'student'
  | 'teacher';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  student_id: string | null;
};

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const { data, error } =
    await supabase
      .from('profiles')
      .select(
        'id, email, full_name, role, student_id'
      )
      .eq('id', userId)
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    return null;
  }

  return data as Profile;
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