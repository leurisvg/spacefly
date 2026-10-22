import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/auth/pkce.dart';

void main() {
  test('the S256 challenge matches the RFC 7636 example', () {
    expect(challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  test('base64Url has no padding and only URL-safe characters', () {
    expect(base64Url([0xfb, 0xff, 0xfe]), '-__-');
    expect(base64Url([1]), 'AQ');
    expect(base64Url(List.filled(48, 255)), isNot(contains(RegExp('[+/=]'))));
  });

  test('createPkce makes a 64-character verifier and its challenge', () {
    final pkce = createPkce((n) => Uint8List.fromList(List.generate(n, (i) => i)));
    expect(pkce.verifier, hasLength(64));
    expect(pkce.challenge, challengeOf(pkce.verifier));
    expect(pkce.challenge, matches(RegExp(r'^[A-Za-z0-9_-]{43}$')));
  });

  test('the secure random source gives different values', () {
    expect(createPkce().verifier, isNot(createPkce().verifier));
    expect(randomState(), hasLength(22));
  });
}
