import { TestBed } from '@angular/core/testing';
import { PrivacyStore } from './privacy.store';

describe('PrivacyStore', () => {
  beforeEach(() => localStorage.clear());

  it('starts visible and toggles', () => {
    const store = TestBed.inject(PrivacyStore);
    expect(store.hidden()).toBe(false);
    store.toggle();
    expect(store.hidden()).toBe(true);
    store.toggle();
    expect(store.hidden()).toBe(false);
  });

  it('persists the choice across reloads', () => {
    TestBed.inject(PrivacyStore).set(true);
    expect(localStorage.getItem('spacefly.privacy')).toBe('1');
    TestBed.resetTestingModule();
    expect(TestBed.inject(PrivacyStore).hidden()).toBe(true);
  });
});
