import { catalogUrl } from './transloco-loader';

describe('catalogUrl', () => {
  it('asks for the version the server stamped on the page', () => {
    expect(catalogUrl('es', 'a1b2c3d4e5')).toBe('/i18n/es.json?v=a1b2c3d4e5');
  });

  it('uses the plain URL when the page has no version (ng serve)', () => {
    expect(catalogUrl('en', null)).toBe('/i18n/en.json');
    expect(catalogUrl('en', undefined)).toBe('/i18n/en.json');
    expect(catalogUrl('en', '')).toBe('/i18n/en.json');
  });
});
