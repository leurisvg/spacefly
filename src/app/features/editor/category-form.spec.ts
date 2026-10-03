import { mountEditor, verifyNoPendingRequests } from '../../../testing/editor-harness';
import { CategoryForm } from './category-form';

verifyNoPendingRequests();

describe('CategoryForm', () => {
  it('creates a category', async () => {
    const h = await mountEditor(CategoryForm);
    await h.type('input[type=text]', '  Mascotas ');
    await h.type('textarea', 'Perro y gato');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'POST' && r.url === '/api/categories');
    expect(req.request.body).toEqual({ name: 'Mascotas', notes: 'Perro y gato' });
    req.flush({ id: '9' }, { status: 201, statusText: 'Created' });
    await h.settle();
    expect(h.done.count).toBe(1);
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not send an empty name and says why', async () => {
    const h = await mountEditor(CategoryForm);
    await h.click('Save');
    h.http.expectNone((r) => r.method === 'POST');
    expect(h.text()).toContain('This field is required.');
    expect(h.done.count).toBe(0);
  });

  it("shows the server's message on the name", async () => {
    const h = await mountEditor(CategoryForm);
    await h.type('input[type=text]', 'Comida');
    await h.click('Save');
    h.answer('POST', '/api/categories', { error: 'validation', message: 'x', fields: { name: ['The name is already in use.'] } }, 422);
    await h.settle();
    expect(h.text()).toContain('The name is already in use.');
    expect(h.done.count).toBe(0);
  });

  it('loads, updates and clears the notes', async () => {
    const h = await mountEditor(CategoryForm, { id: '4' });
    h.answer('GET', '/api/categories/4', { id: '4', name: 'Comida', notes: 'Super y restaurantes' });
    await h.settle();
    expect((h.el.querySelector('input[type=text]') as HTMLInputElement).value).toBe('Comida');
    expect((h.el.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Super y restaurantes');
    await h.type('textarea', '');
    await h.click('Save');
    const req = h.http.expectOne((r) => r.method === 'PUT' && r.url === '/api/categories/4');
    expect(req.request.body).toEqual({ name: 'Comida', notes: null });
    req.flush({ id: '4' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('asks before deleting, and only deletes once confirmed', async () => {
    const h = await mountEditor(CategoryForm, { id: '4' });
    h.answer('GET', '/api/categories/4', { id: '4', name: 'Comida', notes: null });
    await h.settle();
    await h.click('Delete');
    await new Promise((r) => setTimeout(r, 20));
    const dialog = document.body.querySelector('sf-confirm-dialog') as HTMLElement;
    expect(dialog.textContent).toContain('Comida');
    h.http.expectNone((r) => r.method === 'DELETE');
    ([...dialog.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Delete') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 20));
    const req = h.http.expectOne((r) => r.method === 'DELETE' && r.url === '/api/categories/4');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await h.settle();
    expect(h.done.count).toBe(1);
  });

  it('keeps the category when the confirmation is cancelled', async () => {
    const h = await mountEditor(CategoryForm, { id: '4' });
    h.answer('GET', '/api/categories/4', { id: '4', name: 'Comida', notes: null });
    await h.settle();
    await h.click('Delete');
    await new Promise((r) => setTimeout(r, 20));
    const dialog = document.body.querySelector('sf-confirm-dialog') as HTMLElement;
    ([...dialog.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Cancel') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 20));
    h.http.expectNone((r) => r.method === 'DELETE');
    expect(h.done.count).toBe(0);
  });

  it('says so when the category is gone', async () => {
    const h = await mountEditor(CategoryForm, { id: '99' });
    h.answer('GET', '/api/categories/99', { error: 'not_found' }, 404);
    await h.settle();
    expect(h.text()).toContain('no longer exists');
  });
});
