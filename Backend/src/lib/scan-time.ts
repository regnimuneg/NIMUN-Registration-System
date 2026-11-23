/**
 * Time to record for a scan. Live scans use the server clock, so a phone with a
 * wrong clock cannot skew check-in times. A time sent by the phone is only used
 * for scans replayed from the offline queue (between 30 seconds and 3 days old);
 * the app already corrects that time with the server clock offset.
 */
export function scanTime(scannedAt: unknown): Date {
  const now = Date.now()
  const sent = typeof scannedAt === 'string' ? new Date(scannedAt) : null
  if (sent && !isNaN(sent.getTime())) {
    const age = now - sent.getTime()
    if (age > 30_000 && age < 3 * 86_400_000) return sent
  }
  return new Date(now)
}
