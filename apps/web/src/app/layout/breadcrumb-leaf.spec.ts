import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BreadcrumbLeaf } from './breadcrumb-leaf';

function screenWith(name: () => string | null | undefined) {
  @Component({ selector: 'sf-test-screen', template: '' })
  class Screen {
    constructor() {
      TestBed.inject(BreadcrumbLeaf).track(name);
    }
  }
  return Screen;
}

describe('BreadcrumbLeaf', () => {
  it('follows the name of the record and is cleared when the screen goes away', () => {
    const name = signal<string | null>(null);
    const leaf = TestBed.inject(BreadcrumbLeaf);
    const fixture = TestBed.createComponent(screenWith(name));
    fixture.detectChanges();
    expect(leaf.label()).toBeNull();
    name.set('  Cuenta USD ');
    fixture.detectChanges();
    expect(leaf.label()).toBe('Cuenta USD');
    fixture.destroy();
    expect(leaf.label()).toBeNull();
  });

  it('a screen that replaces another keeps its own name when the old one is destroyed late', () => {
    const leaf = TestBed.inject(BreadcrumbLeaf);
    const first = TestBed.createComponent(screenWith(() => 'Old'));
    first.detectChanges();
    const second = TestBed.createComponent(screenWith(() => 'New'));
    second.detectChanges();
    first.destroy();
    expect(leaf.label()).toBe('New');
    second.destroy();
    expect(leaf.label()).toBeNull();
  });
});
