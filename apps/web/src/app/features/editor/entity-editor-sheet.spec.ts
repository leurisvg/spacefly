import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { mountEditor, verifyNoPendingRequests } from '../../../testing/editor-harness';
import { EntityEditorSheet } from './entity-editor-sheet';
import { EntityEditor } from '@spacefly/client/state/entity-editor.service';

verifyNoPendingRequests();

@Component({ template: '' })
class Page {}

async function mount() {
  const h = await mountEditor(EntityEditorSheet, {}, [provideRouter([{ path: 'a', component: Page }, { path: 'b', component: Page }])]);
  return { ...h, editor: TestBed.inject(EntityEditor), router: TestBed.inject(Router) };
}
const sheet = () => document.body.querySelector('hlm-sheet-content') as HTMLElement | null;

describe('EntityEditorSheet', () => {
  it('is closed until something is opened', async () => {
    const h = await mount();
    expect(sheet()).toBeNull();
    h.editor.open('category');
    await h.settle();
    await new Promise((r) => setTimeout(r, 30));
    expect(sheet()!.textContent).toContain('New category');
    expect(sheet()!.querySelector('sf-category-form')).not.toBeNull();
  });

  it('opens the editor of a record to edit', async () => {
    const h = await mount();
    h.editor.open('tag', '7');
    await h.settle();
    await new Promise((r) => setTimeout(r, 30));
    expect(sheet()!.textContent).toContain('Edit tag');
    h.http.expectOne('/api/tags/7').flush({ id: '7', tag: 'hogar', date: null, description: null });
    await h.settle();
  });

  it('closes when the form is done', async () => {
    const h = await mount();
    h.editor.open('category');
    await h.settle();
    await new Promise((r) => setTimeout(r, 30));
    (sheet()!.querySelector('sf-form-footer button') as HTMLButtonElement).click(); // Cancel
    await h.settle();
    expect(h.editor.request()).toBeNull();
  });

  it('closes when the page changes, not when only the query string does', async () => {
    const h = await mount();
    await h.router.navigateByUrl('/a');
    h.editor.open('category');
    await h.settle();
    await h.router.navigateByUrl('/a?p=month');
    expect(h.editor.request()).not.toBeNull();
    await h.router.navigateByUrl('/b');
    expect(h.editor.request()).toBeNull();
  });
});
