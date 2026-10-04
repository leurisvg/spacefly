import { provideWebPlatform } from '../app/platform/provide-web-platform';

/** `providersFile` of the web unit tests, so specs get the web platform without wiring it. */
export default provideWebPlatform();
