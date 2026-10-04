import { supabase } from './supabase';

export type EventStatus = 'open' | 'closed';

export type Event = {
  eventId: string;
  title: string;
  venue: string;
  description: string;
  start: string;
  end: string;
};

export type EventUpdate = {
  title: string;
  venue: string;
  description: string;
  start: string;
  end: string;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  venue: string | null;
  description: string | null;
  status: EventStatus;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
};

export async function createEvent(
  event: Event
): Promise<{
  data: CloudEvent | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: null,
      error: 'You must be signed in to create an event.',
    };
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      event_code: event.eventId,
      title: event.title,
      venue: event.venue || null,
      description: event.description || null,
      start_time: event.start || null,
      end_time: event.end || null,
      status: 'open',
      created_by: user.id,
    })
    .select('*')
    .single();

  return {
    data: data ? (data as CloudEvent) : null,
    error: error?.message ?? null,
  };
}

export async function updateEvent(
  eventId: string,
  updates: EventUpdate
): Promise<{
  data: CloudEvent | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: null,
      error: 'You must be signed in to update an event.',
    };
  }

  const { data, error } = await supabase
    .from('events')
    .update({
      title: updates.title,
      venue: updates.venue || null,
      description: updates.description || null,
      start_time: updates.start || null,
      end_time: updates.end || null,
    })
    .eq('id', eventId)
    .eq('created_by', user.id)
    .select('*')
    .single();

  return {
    data: data ? (data as CloudEvent) : null,
    error: error?.message ?? null,
  };
}

export async function closeEvent(
  eventId: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'You must be signed in to close an event.',
    };
  }

  const { error } = await supabase
    .from('events')
    .update({ status: 'closed' })
    .eq('id', eventId)
    .eq('created_by', user.id);

  return { error: error?.message ?? null };
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CloudEvent[];
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}
