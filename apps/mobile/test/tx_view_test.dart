import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/features/transactions/tx_view_vm.dart';
import 'package:spacefly_mobile/api/models.g.dart' show TxKind;

import 'fixtures.dart';
import 'support.dart';

void main() {
  Future<TxViewResult> load(Object? answer, [int status = 200]) async {
    final adapter = FakeAdapter((_) => jsonBody(answer ?? {}, status));
    final c = TestEnv(config: signedInConfig, adapter: adapter).container();
    c.listen(txViewProvider('5'), (_, __) {});
    expect(c.read(txViewProvider('5')).isLoading, isTrue);
    final result = await c.read(txViewProvider('5').future);
    expect(adapter.requests.single.path, '/api/transactions/5');
    return result;
  }

  test('loads the transaction and shows it', () async {
    final r = await load(txEditJson());
    expect(r.state, TxViewState.ready);
    expect((r.tx!.description, r.tx!.type, r.tx!.amount), ('Cena', TxKind.WITHDRAWAL, '250.00'));
    expect(r.tx!.tags, ['familia']);
    expect((r.tx!.source.name, r.tx!.destination.name), ('Banco', 'Restaurante'));
  });

  test('maps a 409 to "not editable" with its reason', () async {
    final r = await load({'reason': 'splits'}, 409);
    expect((r.state, r.reason, r.tx), (TxViewState.notEditable, 'splits', null));
  });

  test('maps a 404 to "missing" and any other failure to "error"', () async {
    expect((await load({}, 404)).state, TxViewState.missing);
    expect((await load({}, 500)).state, TxViewState.error);
  });
}
