import { NativeScriptConfig } from '@nativescript/core';

export default {
  // Bundle id of the app (the same one registered on Google Play / App Store Connect later). Change it before the first release.
  id: 'com.leurisventura.spacefly',
  appPath: 'src',
  appResourcesPath: 'App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none',
  },
} as NativeScriptConfig;
