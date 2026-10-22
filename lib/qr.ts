export type QRPayload = { v: 2; event: string; token: string };

export function buildQRPayload(eventCode: string, token: string): string {
  return JSON.stringify({ v: 2, event: eventCode, token });
}

export type ParseQRResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function parseQRPayload(raw: string): ParseQRResult {
  let parsed: any;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'Invalid QR code.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, message: 'Not an attendance QR code.' };
  }

  if (parsed.v !== 2) {
    return { ok: false, message: 'This is an old QR code. Scan the current rotating QR.' };
  }

  if (
    typeof parsed.event !== 'string' || !parsed.event.trim() ||
    typeof parsed.token !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.token)
  ) {
    return { ok: false, message: 'Invalid or incomplete attendance QR.' };
  }

  return {
    ok: true,
    payload: { v: 2, event: parsed.event.trim(), token: parsed.token },
  };
}
