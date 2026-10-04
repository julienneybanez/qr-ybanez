import {
  supabase,
} from './supabase';

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

export type ProfileFetchResult = {
  profile: Profile | null;
  error: string | null;
};

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
                'Profile request timed out.'
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

export async function getProfileResult(
  userId: string
): Promise<ProfileFetchResult> {
  try {
    const request =
      supabase
        .from('profiles')
        .select(
          'id, email, full_name, role, student_id'
        )
        .eq(
          'id',
          userId
        )
        .maybeSingle();

    const {
      data,
      error,
    } =
      await withTimeout(
        request,
        10000
      );

    if (error) {
      return {
        profile: null,

        error:
          error.message ||
          'Unable to load profile.',
      };
    }

    return {
      profile:
        data
          ? data as Profile
          : null,

      error: null,
    };
  } catch (error: any) {
    return {
      profile: null,

      error:
        error?.message ||
        'Unable to load profile.',
    };
  }
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
  const {
    error,
  } =
    await supabase
      .from('profiles')
      .update(updates)
      .eq(
        'id',
        userId
      );

  return {
    error:
      error?.message ??
      null,
  };
}
