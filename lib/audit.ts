import { supabase } from './supabase';

export type AuditLog = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export async function getAuditLogs(limit = 20): Promise<{
  data: AuditLog[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, actor_id, action, entity_type, entity_id, details, created_at, profiles ( full_name, email )')
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    data: (data ?? []).map((row: any) => ({
      id: row.id,
      actorId: row.actor_id ?? null,
      actorName: row.profiles?.full_name ?? null,
      actorEmail: row.profiles?.email ?? null,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id ?? null,
      details: row.details ?? {},
      createdAt: row.created_at,
    })),
    error: error?.message ?? null,
  };
}

export function formatAuditAction(log: AuditLog) {
  const actor = log.actorName || log.actorEmail || 'System';
  const details = log.details ?? {};

  if (log.action === 'attendance_recorded') {
    const title = typeof details.event_title === 'string' ? details.event_title : 'an event';
    const status = typeof details.status === 'string' ? details.status : 'present';
    return `${actor} checked in to ${title} — ${status.charAt(0).toUpperCase() + status.slice(1)}`;
  }

  if (log.action === 'attendance_updated') {
    return `${actor} corrected an attendance record`;
  }

  if (log.action === 'attendance_deleted') {
    return `${actor} removed an attendance record`;
  }

  if (log.action === 'event_created') {
    const title = typeof details.title === 'string' ? details.title : 'an event';
    return `${actor} created ${title}`;
  }

  if (log.action === 'event_closed') {
    const title = typeof details.title === 'string' ? details.title : 'an event';
    return `${actor} closed ${title}`;
  }

  if (log.action === 'event_updated') {
    const title = typeof details.title === 'string' ? details.title : 'an event';
    return `${actor} updated ${title}`;
  }

  if (log.action === 'profile_updated') {
    return `${actor} updated a user profile`;
  }

  return `${actor} · ${log.action.replace(/_/g, ' ')}`;
}
