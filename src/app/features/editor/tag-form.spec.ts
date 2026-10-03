import { mountEditor, verifyNoPendingRequests } from '../../../testing/editor-harness';
import { TagForm } from './tag-form';

verifyNoPendingRequests();

describe('TagForm', () => {
  it('creates a tag with a date and description', async () => {
    const h = await mountEditor(TagForm);
    await h.type('input[type=text]', 'viaje-2027');
    await h.type('input[type=date]', '2027-03-01');
    await h.type('textarea', 'Vacaciones');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST' && r.url === '/api/tags');
    expect(req.request.body).toEqual({ tag: 'viaje-2027', date: '2027-03-01', description: 'Vacaciones' });
    req.flush({ id: '3' }, { status: 201, statusText: 'Created' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('sends nothing for the optional fields left empty', async () => {
    const h = await mountEditor(TagForm);
    await h.type('input[type=text]', 'hogar');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toEqual({ tag: 'hogar', date: null, description: null });
    req.flush({ id: '1' }, { status: 201, statusText: 'Created' });
    await h.settle();
  });

  it('loads a tag and lets the date be cleared', async () => {
    const h = await mountEditor(TagForm, { id: '2' });
    h.answer('GET', '/api/tags/2', { id: '2', tag: 'viaje', date: '2026-07-01', description: null });
    await h.settle();
    expect((h.el.querySelector('input[type=date]') as HTMLInputElement).value).toBe('2026-07-01');
    await h.click('Clear');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'PUT' && r.url === '/api/tags/2');
    expect(req.request.body).toEqual({ tag: 'viaje', date: null, description: null });
    req.flush({ id: '2' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('requires a name', async () => {
    const h = await mountEditor(TagForm);
    await h.click('Save');
    h.http.expectNone((r) => r.method === 'POST');
    expect(h.text()).toContain('This field is required.');
  });
});
