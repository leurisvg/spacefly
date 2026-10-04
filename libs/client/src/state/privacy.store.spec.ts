import { TestBed } from '@angular/core/testing';
import { KeyValueStorage } from '../platform/key-value-storage';
import { MemoryStorage } from '../../testing/fakes';
import { PrivacyStore } from './privacy.store';

describe('PrivacyStore', () => {
  it('starts visible and toggles', () => {
    const store = TestBed.inject(PrivacyStore);
    expect(store.hidden()).toBe(false);
    store.toggle();
    expect(store.hidden()).toBe(true);
    store.toggle();
    expect(store.hidden()).toBe(false);
  });

  it('persists the choice across reloads', () => {
    const storage = new MemoryStorage();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: KeyValueStorage, useValue: storage }] });
    TestBed.inject(PrivacyStore).set(true);
    expect(storage.get('spacefly.privacy')).toBe('1');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: KeyValueStorage, useValue: storage }] });
    expect(TestBed.inject(PrivacyStore).hidden()).toBe(true);
  });
});
