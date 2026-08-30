/**
 * Postgres.js hands timestamp columns back as either a Date or a string
 * depending on the driver path, so every conversion goes through here rather
 * than calling .toISOString() on a value the type annotation only claims is a Date.
 */
export function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toEpochMilliseconds(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}
