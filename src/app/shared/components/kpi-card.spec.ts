import { TestBed } from '@angular/core/testing';
import { formatTestProviders } from '../../../testing/format-providers';
import { KpiCard } from './kpi-card';

function render(inputs: Record<string, unknown>) {
  TestBed.configureTestingModule({ providers: formatTestProviders('en', { kpi: { vsPrevious: 'vs previous' } }).providers });
  const fixture = TestBed.createComponent(KpiCard);
  fixture.componentRef.setInput('label', 'Income');
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { el, text: el.textContent!.replace(/\s+/g, ' ').trim() };
}

describe('KpiCard', () => {
  it('renders label, money value and the previous period', () => {
    const { text, el } = render({ value: 1234.5, previous: 1000 });
    expect(text).toContain('Income');
    expect(text).toContain('RD$1,234.50');
    expect(text).toContain('vs previous RD$1K');
    expect(el.querySelector('sf-delta')).not.toBeNull();
  });

  it('renders percent values stored as 0–100', () => {
    const { text } = render({ value: 25, previous: 20, format: 'pct' });
    expect(text).toContain('25.0%');
    expect(text).toContain('20.0%');
  });

  it('renders compact values', () => {
    expect(render({ value: 15000, format: 'compact' }).text).toContain('RD$15K');
  });

  it('marks negative values', () => {
    const { el } = render({ value: -50 });
    expect(el.querySelector('.text-negative')?.textContent).toContain('−RD$50.00');
  });

  it('hides delta and comparison without a previous value', () => {
    const { el, text } = render({ value: 10 });
    expect(el.querySelector('sf-delta')).toBeNull();
    expect(text).not.toContain('vs previous');
  });

  it('shows a skeleton instead of the value while loading', () => {
    const { el, text } = render({ value: 999, previous: 1, loading: true });
    expect(el.querySelector('[hlmSkeleton]')).not.toBeNull();
    expect(text).not.toContain('999');
    expect(el.querySelector('sf-delta')).toBeNull();
  });
});
