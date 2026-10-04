import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MemoryStorage } from '../../testing/fakes';
import { localPref } from './local-pref';

@Component({ template: '' })
class Host {
  readonly mode = localPref<'back' | 'reset' | 'keep'>('spacefly.test.mode', 'back', (v): v is 'back' | 'reset' | 'keep' => v === 'back' || v === 'reset' || v === 'keep');
  readonly flag = localPref('spacefly.test.flag', false);
}

describe('localPref', () => {
  it('starts from the fallback and persists changes', () => {
    const storage = TestBed.inject(MemoryStorage);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('back');
    fixture.componentInstance.mode.set('keep');
    fixture.componentInstance.flag.set(true);
    TestBed.tick();
    expect(storage.get('spacefly.test.mode')).toBe('"keep"');
    expect(storage.get('spacefly.test.flag')).toBe('true');
  });

  it('restores a stored value, ignoring invalid ones', () => {
    const storage = TestBed.inject(MemoryStorage);
    storage.set('spacefly.test.mode', '"reset"');
    storage.set('spacefly.test.flag', '"not a boolean"');
    const fixture = TestBed.createComponent(Host);
    expect(fixture.componentInstance.mode()).toBe('reset');
    expect(fixture.componentInstance.flag()).toBe(false);
  });

  it('survives corrupt storage', () => {
    TestBed.inject(MemoryStorage).set('spacefly.test.mode', '{oops');
    const fixture = TestBed.createComponent(Host);
    expect(fixture.componentInstance.mode()).toBe('back');
  });
});
