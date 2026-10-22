import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';

/// A PKCE (RFC 7636) pair: a 64-character verifier and its S256 challenge.
class Pkce {
  const Pkce(this.verifier, this.challenge);
  final String verifier;
  final String challenge;
}

typedef RandomBytes = Uint8List Function(int length);

/// Cryptographically secure random bytes from the operating system.
Uint8List secureRandomBytes(int length) {
  final random = Random.secure();
  return Uint8List.fromList(List<int>.generate(length, (_) => random.nextInt(256)));
}

String base64Url(List<int> bytes) => base64UrlEncode(bytes).replaceAll('=', '');

String challengeOf(String verifier) => base64Url(sha256.convert(utf8.encode(verifier)).bytes);

/// `random` is injectable for tests.
Pkce createPkce([RandomBytes random = secureRandomBytes]) {
  final verifier = base64Url(random(48)); // 48 bytes → 64 base64url characters
  return Pkce(verifier, challengeOf(verifier));
}

String randomState([RandomBytes random = secureRandomBytes]) => base64Url(random(16));
