import { readFileSync } from 'node:fs';

/** The hand-cursor rule lives in styles.css; read the real selector and check what it matches. */
function cursorRuleSelector(): string {
  const css = readFileSync('src/styles.css', 'utf8');
  const m = css.match(/\n(:is\([\s\S]*?\):not\([\s\S]*?\))\s*\{\s*cursor:\s*pointer;\s*\}/);
  expect(m, 'cursor:pointer rule not found in src/styles.css').not.toBeNull();
  return m![1].replace(/\s+/g, ' ');
}

function el(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

describe('clickable elements get the hand cursor', () => {
  const selector = cursorRuleSelector();
  const matches = (html: string) => el(html).matches(selector);

  it.each([
    ['button', '<button>Go</button>'],
    ['link', '<a href="/x">x</a>'],
    ['select', '<select></select>'],
    ['checkbox', '<input type="checkbox">'],
    ['label for a control', '<label for="x">x</label>'],
    ['menu item', '<div role="menuitem"></div>'],
    ['select option', '<div role="option"></div>'],
    ['tab', '<button role="tab"></button>'],
    ['switch', '<button role="switch"></button>'],
    ['role=button', '<div role="button"></div>'],
  ])('%s', (_name, html) => {
    expect(matches(html)).toBe(true);
  });

  it.each([
    ['disabled button', '<button disabled>x</button>'],
    ['aria-disabled item', '<div role="menuitem" aria-disabled="true"></div>'],
    ['data-disabled item', '<div role="option" data-disabled=""></div>'],
    ['sidebar rail (has resize cursors)', '<button data-sidebar="rail"></button>'],
    ['text input', '<input type="text">'],
    ['search combobox input', '<input type="text" role="combobox">'],
    ['plain text', '<span>x</span>'],
    ['link without href', '<a>x</a>'],
  ])('not: %s', (_name, html) => {
    expect(matches(html)).toBe(false);
  });
});
