import * as FileSystem from 'expo-file-system/legacy';
import { Linking, Platform, Share } from 'react-native';
import type { EventAttendanceGroup } from './attendance';

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  return '"' + text.replace(/"/g, '""') + '"';
}

export function buildAttendanceCsv(group: EventAttendanceGroup) {
  const header = [
    'Student ID',
    'Student Name',
    'Email',
    'Event',
    'Event Code',
    'Status',
    'Recorded Via',
    'Check-in Date',
    'Check-in Time',
  ];

  const rows = group.attendees.map((attendee) => {
    const date = new Date(attendee.scannedAt);

    return [
      attendee.studentId ?? '',
      attendee.studentName ?? '',
      attendee.studentEmail ?? '',
      group.title,
      group.eventCode,
      attendee.status.charAt(0).toUpperCase() + attendee.status.slice(1),
      attendee.recordedVia,
      date.toLocaleDateString(),
      date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    ];
  });

  return [header, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n');
}

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'attendance';
}

export async function exportAttendanceCsv(group: EventAttendanceGroup) {
  const csv = buildAttendanceCsv(group);
  const fileName = safeFileName(group.title) + '-' + safeFileName(group.eventCode) + '.csv';

  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      return { error: null };
    }

    if (!FileSystem.cacheDirectory) {
      return { error: 'File export is not available on this device.' };
    }

    const uri = FileSystem.cacheDirectory + fileName;

    await FileSystem.writeAsStringAsync(uri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await Linking.openURL(contentUri);
      } else {
        await Linking.openURL(uri);
      }
    } catch {
      await Share.share({
        title: fileName,
        message: csv,
      });
    }

    return { error: null };
  } catch (error: any) {
    return {
      error: error?.message || 'Could not export attendance CSV.',
    };
  }
}
