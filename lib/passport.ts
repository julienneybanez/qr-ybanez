import { supabase } from './supabase';
import { regularStampTheme, stampYear, type StampTheme } from '@/constants/stampThemes';

export type StampCollection = {
  id: string;
  collection_key: string;
  category: 'christmas_party' | 'ccs_week' | 'foundation_day' | 'intramurals';
  edition_year: number;
  display_name: string;
  theme_key: 'holiday' | 'digital' | 'heritage' | 'victory';
  is_published: boolean;
  created_at: string;
};

export type PassportStamp = {
  key: string;
  collectionId: string | null;
  kind: 'signature' | 'regular';
  title: string;
  year: string;
  theme: StampTheme;
  earnedAt: string | null;
  eventTitle: string | null;
  venue: string | null;
  eventIds: string[];
  eventCodes: string[];
};

export type PassportData = {
  signature: PassportStamp[];
  regular: PassportStamp[];
  earnedCount: number;
};

type AttendanceRow = {
  id: string;
  scanned_at: string;
  status: 'present' | 'late' | 'excused';
  events: {
    id: string;
    event_code: string;
    title: string;
    venue: string | null;
    start_time: string | null;
    stamp_collection_id: string | null;
  } | null;
};

const CATEGORY_ORDER: Record<string,number> = {
  christmas_party: 0, ccs_week: 1, foundation_day: 2, intramurals: 3,
};

export async function getStampCollections(): Promise<{ data: StampCollection[]; error: string | null }> {
  const { data, error } = await supabase.from('stamp_collections')
    .select('id,collection_key,category,edition_year,display_name,theme_key,is_published,created_at')
    .order('edition_year', { ascending: true });
  return { data: (data ?? []) as StampCollection[], error: error?.message ?? null };
}

export async function getMyPassport(): Promise<{ data: PassportData | null; error: string | null }> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { data: null, error: 'Sign in to view your event passport.' };

  const [collectionsResult, attendanceResult] = await Promise.all([
    getStampCollections(),
    supabase.from('attendance')
      .select('id,scanned_at,status,events(id,event_code,title,venue,start_time,stamp_collection_id)')
      .eq('student_id', auth.user.id)
      .in('status', ['present', 'late'])
      .order('scanned_at', { ascending: true }),
  ]);
  if (collectionsResult.error || attendanceResult.error) {
    return { data: null, error: collectionsResult.error ?? attendanceResult.error?.message ?? 'Could not load passport.' };
  }

  const collections = collectionsResult.data.filter(item => item.is_published);
  const byId = new Map(collections.map(item => [item.id, item]));
  const signature: PassportStamp[] = collections.map(item => ({
    key: 'collection:' + item.id,
    collectionId: item.id,
    kind: 'signature',
    title: item.display_name,
    year: String(item.edition_year),
    theme: item.theme_key,
    earnedAt: null,
    eventTitle: null,
    venue: null,
    eventIds: [],
    eventCodes: [],
  }));
  const signaturesById = new Map(signature.map(item => [item.collectionId, item]));
  const regularByEvent = new Map<string, PassportStamp>();
  const rows = (attendanceResult.data ?? []) as unknown as AttendanceRow[];
  for (const record of rows) {
    const event = record.events;
    if (!event) continue;
    const collectionId = event.stamp_collection_id;
    if (collectionId) {
      // Unpublished or deleted collections must not silently produce regular stamps.
      if (!byId.has(collectionId)) continue;
      const stamp = signaturesById.get(collectionId);
      if (!stamp) continue;
      stamp.eventIds.push(event.id);
      stamp.eventCodes.push(event.event_code);
      if (!stamp.earnedAt || record.scanned_at < stamp.earnedAt) {
        stamp.earnedAt = record.scanned_at;
        stamp.eventTitle = event.title;
        stamp.venue = event.venue;
      }
    } else {
      if (regularByEvent.has(event.id)) continue;
      regularByEvent.set(event.id, {
        key: 'event:' + event.id,
        collectionId: null,
        kind: 'regular',
        title: event.title,
        year: stampYear(event.start_time ?? record.scanned_at),
        theme: regularStampTheme(event.id),
        earnedAt: record.scanned_at,
        eventTitle: event.title,
        venue: event.venue,
        eventIds: [event.id],
        eventCodes: [event.event_code],
      });
    }
  }

  signature.sort((a,b) => {
    const x = collections.find(c => c.id === a.collectionId);
    const y = collections.find(c => c.id === b.collectionId);
    return Number(a.year)-Number(b.year) ||
      (CATEGORY_ORDER[x?.category ?? ''] ?? 99) - (CATEGORY_ORDER[y?.category ?? ''] ?? 99);
  });
  const regular = Array.from(regularByEvent.values()).sort((a,b) =>
    (b.earnedAt ?? '').localeCompare(a.earnedAt ?? '')
  );
  return {
    data: {
      signature, regular,
      earnedCount: signature.filter(item => item.earnedAt !== null).length + regular.length,
    },
    error: null,
  };
}

export function findNewlyEarnedStamp(before: PassportData, after: PassportData, eventCode: string): PassportStamp | null {
  const oldKeys = new Set([...before.signature, ...before.regular].filter(item => item.earnedAt).map(item => item.key));
  return [...after.signature, ...after.regular].find(item =>
    Boolean(item.earnedAt) && !oldKeys.has(item.key) && item.eventCodes.includes(eventCode)
  ) ?? null;
}

export async function setStampCollectionPublished(collectionId: string, published: boolean): Promise<string | null> {
  // RLS permits updates only for authenticated Admin profiles.
  const { error } = await supabase.from('stamp_collections')
    .update({ is_published: published })
    .eq('id', collectionId);
  return error?.message ?? null;
}
