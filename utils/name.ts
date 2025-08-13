export function withDoctorPrefix(name?: string | null): string {
  const base = (name || '').trim();
  if (!base) return 'Dr. Unknown';
  // Normalize to a single "Dr. " prefix
  const noPrefix = base.replace(/^\s*dr\.?\s*/i, '').trim();
  return `Dr. ${noPrefix}`;
}

export function stripDoctorPrefix(name?: string | null): string {
  const base = (name || '').trim();
  return base.replace(/^\s*dr\.?\s*/i, '').trim();
}

