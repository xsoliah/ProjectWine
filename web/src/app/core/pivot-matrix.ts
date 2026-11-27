/**
 * Flache Tabelle (für CSV) aus den Daten eines DevExtreme-Pivots: je sichtbarer Zeile ein Eintrag mit allen
 * Zeilenebenen, je sichtbarer Spalte die Spaltenüberschrift über alle Ebenen, dazu die Zellwerte.
 */
export interface PivotItem {
  value?: unknown;
  text?: string;
  index?: number;
  /** `T` = Summe einer Ebene, `GT` = Gesamtsumme, sonst Wert. */
  type?: string;
  children?: PivotItem[];
}

export interface PivotData {
  rows: PivotItem[];
  columns: PivotItem[];
  /** `values[zeilenindex][spaltenindex][kennzahlindex]` oder (bei einer Kennzahl) direkt der Wert. */
  values: unknown[][];
  grandTotalRowIndex?: number;
  grandTotalColumnIndex?: number;
}

interface Leaf {
  labels: string[];
  index: number;
}

function leaves(items: PivotItem[], prefix: string[], out: Leaf[]): void {
  for (const item of items) {
    const label = item.text ?? String(item.value ?? '');
    const labels = [...prefix, label];
    if (item.children && item.children.length > 0) {
      leaves(item.children, labels, out);
      if (item.index !== undefined) out.push({ labels: [...labels, 'Summe'], index: item.index });
    } else if (item.index !== undefined) {
      out.push({ labels: item.type === 'GT' ? ['Gesamt'] : labels, index: item.index });
    }
  }
}

function cellText(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : String(value);
}

/** `header` und `body` für {@link toCsv}; mehrere Kennzahlen ergeben je Spalte mehrere Spalten. */
export function pivotMatrix(
  data: PivotData,
  fields: readonly { area?: string; caption?: string }[],
  measureCaptions: readonly string[] = [],
): { header: string[]; body: (string | number | null)[][] } {
  const rowLeaves: Leaf[] = [];
  const colLeaves: Leaf[] = [];
  leaves(data.rows ?? [], [], rowLeaves);
  leaves(data.columns ?? [], [], colLeaves);
  const rowTitles = fields.filter((f) => f.area === 'row').map((f) => f.caption ?? '');
  const depth = Math.max(1, ...rowLeaves.map((l) => l.labels.length));
  const headerRows = Array.from({ length: depth }, (_, i) => rowTitles[i] ?? (i === 0 ? 'Zeile' : ''));
  if (data.grandTotalRowIndex !== undefined) rowLeaves.push({ labels: ['Gesamt'], index: data.grandTotalRowIndex });
  const columns = [...colLeaves, { labels: ['Gesamt'], index: data.grandTotalColumnIndex ?? 0 }];
  const header: string[] = [...headerRows];
  const measures = Math.max(1, measureCaptions.length);
  for (const col of columns) {
    for (let m = 0; m < measures; m++) {
      const base = col.labels.join(' / ');
      header.push(measures > 1 ? `${base} – ${measureCaptions[m]}` : base);
    }
  }
  const body = rowLeaves.map((row) => {
    const labels = Array.from({ length: depth }, (_, i) => row.labels[i] ?? '');
    const cells: (string | number | null)[] = [];
    for (const col of columns) {
      const cell = data.values?.[row.index]?.[col.index] as unknown;
      for (let m = 0; m < measures; m++) cells.push(cellText(Array.isArray(cell) ? cell[m] : cell));
    }
    return [...labels, ...cells];
  });
  return { header, body };
}
