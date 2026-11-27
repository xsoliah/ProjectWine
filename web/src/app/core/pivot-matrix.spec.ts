import { describe, expect, it } from 'vitest';
import { PivotData, pivotMatrix } from './pivot-matrix';

describe('pivotMatrix', () => {
  // Form der Daten von PivotGridDataSource.getData(): Knoten mit Kindern tragen den Index ihrer Summenzeile.
  const data: PivotData = {
    rows: [
      {
        value: 2024,
        text: '2024',
        index: 14,
        children: [
          { value: 1, text: 'Q1', index: 17 },
          { value: 4, text: 'Q4', index: 15 },
        ],
      },
      { value: 2025, text: '2025', index: 9 },
    ],
    columns: [
      { value: 'Getrunken', text: 'Getrunken', index: 1 },
      { value: 'Verkauft', text: 'Verkauft', index: 3 },
    ],
    values: [],
    grandTotalRowIndex: 0,
    grandTotalColumnIndex: 0,
  };
  data.values[0] = [[16], [12], [], [2]];
  data.values[14] = [[3], [2], [], [1]];
  data.values[17] = [[1], [1], [], [null]];
  data.values[15] = [[2], [1], [], [1]];
  data.values[9] = [[13], [9], [], [1]];

  it('liefert Kopfzeile, Zeilen mit Summen und Gesamtsumme', () => {
    const { header, body } = pivotMatrix(data, [{ area: 'row', caption: 'Jahr' }]);
    expect(header).toEqual(['Jahr', '', 'Getrunken', 'Verkauft', 'Gesamt']);
    expect(body).toEqual([
      ['2024', 'Q1', 1, null, 1],
      ['2024', 'Q4', 1, 1, 2],
      ['2024', 'Summe', 2, 1, 3],
      ['2025', '', 9, 1, 13],
      ['Gesamt', '', 12, 2, 16],
    ]);
  });
});
