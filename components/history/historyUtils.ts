export function formatHistoryDate(
  iso: string
) {
  return new Date(
    iso
  ).toLocaleString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  );
}

export function shortProfileId(
  id: string
) {
  return id
    ? '…' + id.slice(-8)
    : 'Unknown';
}
