import { ListField, isMulti } from './list-model';

const MAX_OPTIONS = 100;

/** Vorkommende Werte je (einwertigem) Textfeld, sortiert, für Auswahllisten im Filter-Editor; zu viele Werte entfallen. */
export function distinctOptions<T>(fields: readonly ListField<T>[], rows: readonly T[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const field of fields) {
    if (field.type !== 'string' || isMulti(field) || field.order || field.noFilter) continue;
    const found = new Set<string>();
    for (const row of rows) {
      const v = field.value(row);
      if (typeof v === 'string' && v !== '') found.add(v);
      if (found.size > MAX_OPTIONS) break;
    }
    if (found.size > 0 && found.size <= MAX_OPTIONS) out[field.key] = [...found].sort((a, b) => a.localeCompare(b, 'de'));
  }
  return out;
}
