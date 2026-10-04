export type QRPayload = {
  v: 1;
  event: string;
};

export function buildQRPayload(event: {
  eventId: string;
}): string {
  const payload: QRPayload = {
    v: 1,
    event: event.eventId,
  };

  return JSON.stringify(payload);
}

export type ParseQRResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function parseQRPayload(
  raw: string
): ParseQRResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      message: 'Invalid QR code.',
    };
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('v' in parsed) ||
    !('event' in parsed)
  ) {
    return {
      ok: false,
      message: 'Not an attendance QR code.',
    };
  }

  const candidate = parsed as {
    v?: unknown;
    event?: unknown;
  };

  if (
    candidate.v !== 1 ||
    typeof candidate.event !== 'string' ||
    !candidate.event.trim()
  ) {
    return {
      ok: false,
      message: 'Not an attendance QR code.',
    };
  }

  return {
    ok: true,
    payload: {
      v: 1,
      event: candidate.event.trim(),
    },
  };
}
