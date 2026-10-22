import { suggestionsFor } from './suggest';

const opts = ['Café Central', 'Supermercado', 'El café', 'Cena'].map((v) => ({ value: v, label: v }));

describe('suggestionsFor', () => {
  it('matches without case or accents and puts prefix matches first', () => {
    expect(suggestionsFor(opts, 'cafe').map((o) => o.value)).toEqual(['Café Central', 'El café']);
    expect(suggestionsFor(opts, 'ce').map((o) => o.value)).toEqual(['Cena', 'Café Central']);
  });

  it('offers the first options for an empty text, capped', () => {
    expect(suggestionsFor(opts, '', 2).map((o) => o.value)).toEqual(['Café Central', 'Supermercado']);
  });

  it('offers nothing once the text is one of the options', () => {
    expect(suggestionsFor(opts, ' cena ')).toEqual([]);
  });

  it('offers nothing when nothing matches', () => {
    expect(suggestionsFor(opts, 'zzz')).toEqual([]);
  });
});
