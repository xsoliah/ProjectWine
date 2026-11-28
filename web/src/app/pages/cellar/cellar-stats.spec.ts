import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Wine } from '../../core/models';
import { CellarStats } from './cellar-stats';

const wine = (o: Partial<Wine> & { name: string; quantity: number }): Wine =>
  ({
    id: o.name,
    type: 'Red',
    country: null,
    region: null,
    grapes: [],
    slots: [],
    unplacedCount: o.quantity,
    purchasePrice: null,
    drinkFrom: null,
    drinkUntil: null,
    ...o,
  }) as unknown as Wine;

function render(wines: Wine[]) {
  const fixture = TestBed.createComponent(CellarStats);
  fixture.componentRef.setInput('wines', wines);
  fixture.componentRef.setInput('year', 2026);
  const drilled: unknown[] = [];
  fixture.componentInstance.drill.subscribe((f) => drilled.push(f));
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, drilled };
}

const rackSlot = { slotId: 's', rackId: 'r1', rackName: 'Keller links', row: 1, column: 1 };

describe('CellarStats', () => {
  it('zeigt Kennzahlen, Regalkarte und Aufteilungen', () => {
    const { el } = render([
      wine({ name: 'a', quantity: 2, purchasePrice: 10, country: { id: 'i', name: 'Italien' }, region: { id: 't', name: 'Toskana' }, slots: [rackSlot, { ...rackSlot, slotId: 's2', column: 2 }], unplacedCount: 0 }),
    ]);
    const text = el.textContent ?? '';
    expect(text).toContain('Geschätzter Wert');
    expect(text).toContain('20,00');
    expect(el.querySelector('button.rack')?.textContent).toContain('Keller links');
    expect(text).toContain('Nach Land und Region');
    expect(text).toContain('Toskana');
    expect(el.querySelector('canvas, svg, dx-chart')).toBeNull();
  });

  it('öffnet beim Antippen der Regalkarte die Tabelle mit Regalfilter (auch per Tastatur-Klick)', () => {
    const { el, drilled } = render([wine({ name: 'a', quantity: 1, slots: [rackSlot], unplacedCount: 0 })]);
    (el.querySelector('button.rack') as HTMLButtonElement).click();
    expect(drilled).toEqual([[['rack', 'contains', 'Keller links']]]);
    expect(el.querySelector('button.rack')?.getAttribute('aria-label')).toContain('Keller links');
  });

  it('öffnet beim Antippen einer Regionenzeile Land und Region als Filter', () => {
    const { el, drilled } = render([
      wine({ name: 'a', quantity: 3, country: { id: 'i', name: 'Italien' }, region: { id: 't', name: 'Toskana' } }),
    ]);
    const button = [...el.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('Italien, Toskana'));
    button?.click();
    expect(drilled).toEqual([[[['country', '=', 'Italien']], 'and', [['region', '=', 'Toskana']]]]);
  });
});
