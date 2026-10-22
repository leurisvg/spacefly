import 'package:flutter_test/flutter_test.dart';
import 'package:spacefly_mobile/api/models.g.dart' show AccountKind, AccountSlot, TxKind;
import 'package:spacefly_mobile/shared/amount.dart';
import 'package:spacefly_mobile/shared/tx_type.dart';
import 'package:spacefly_mobile/ui_logic/fold.dart';
import 'package:spacefly_mobile/ui_logic/suggest.dart';
import 'package:spacefly_mobile/ui_logic/time.dart';

void main() {
  group('amounts', () {
    test('only a canonical decimal above zero is a positive amount', () {
      for (final ok in ['1', '0.01', '1234.56']) {
        expect(isPositiveAmount(ok), isTrue, reason: ok);
      }
      for (final bad in [null, '', '0', '0.00', '-1', '1,5', 'abc', '1.2.3', '.5', '5.']) {
        expect(isPositiveAmount(bad), isFalse, reason: '$bad');
      }
    });

    test('drops the padding zeros Firefly stores amounts with, keeping two decimals and any real digit', () {
      expect(trimAmountZeros('12800.00000000'), '12800.00');
      expect(trimAmountZeros('0.12345600'), '0.123456');
      expect(trimAmountZeros('120.50'), '120.50');
      expect(trimAmountZeros('5'), '5');
      expect(trimAmountZeros(''), '');
      expect(trimAmountZeros('abc'), 'abc');
      expect(trimAmountZeros('-3.5000'), '-3.50');
    });
  });

  group('transaction type', () {
    TxKind? infer(AccountSlot? from, AccountSlot? to) => inferTransactionType(from, to);

    test('follows from the kinds of the two accounts', () {
      expect(infer(AccountSlot.ASSET, AccountSlot.EXPENSE), TxKind.WITHDRAWAL);
      expect(infer(AccountSlot.ASSET, AccountSlot.CASH), TxKind.WITHDRAWAL);
      expect(infer(AccountSlot.ASSET, AccountSlot.LIABILITY), TxKind.WITHDRAWAL);
      expect(infer(AccountSlot.ASSET, AccountSlot.ASSET), TxKind.TRANSFER);
      expect(infer(AccountSlot.REVENUE, AccountSlot.ASSET), TxKind.DEPOSIT);
      expect(infer(AccountSlot.CASH, AccountSlot.ASSET), TxKind.DEPOSIT);
      expect(infer(AccountSlot.LIABILITY, AccountSlot.ASSET), TxKind.DEPOSIT);
      expect(infer(AccountSlot.LIABILITY, AccountSlot.LIABILITY), TxKind.TRANSFER);
      expect(infer(AccountSlot.LIABILITY, AccountSlot.EXPENSE), TxKind.WITHDRAWAL);
    });

    test('a new name is an expense account as a destination and a revenue account as a source', () {
      expect(infer(AccountSlot.ASSET, AccountSlot.NEW), TxKind.WITHDRAWAL);
      expect(infer(AccountSlot.NEW, AccountSlot.ASSET), TxKind.DEPOSIT);
      expect(infer(AccountSlot.NEW, AccountSlot.NEW), isNull);
    });

    test('refuses the pairs that make no transaction, and waits for both sides', () {
      expect(infer(AccountSlot.REVENUE, AccountSlot.EXPENSE), isNull);
      expect(infer(AccountSlot.EXPENSE, AccountSlot.ASSET), isNull);
      expect(infer(AccountSlot.ASSET, AccountSlot.REVENUE), isNull);
      expect(infer(null, AccountSlot.ASSET), isNull);
      expect(infer(AccountSlot.ASSET, null), isNull);
    });

    test('the amount is in the destination currency only for income', () {
      expect(amountSide(TxKind.DEPOSIT), AmountSide.destination);
      expect(amountSide(TxKind.WITHDRAWAL), AmountSide.source);
      expect(amountSide(TxKind.TRANSFER), AmountSide.source);
    });

    test('reads every spelling of an account type', () {
      expect(accountKind('Asset account'), AccountKind.ASSET);
      expect(accountKind(' expense '), AccountKind.EXPENSE);
      expect(accountKind('Beneficiary'), AccountKind.EXPENSE);
      expect(accountKind('mortgage'), AccountKind.LIABILITY);
      expect(accountKind('Initial balance account'), isNull);
      expect(accountKind(null), isNull);
      expect(txKindName(TxKind.WITHDRAWAL), 'withdrawal');
    });
  });

  group('times and dates', () {
    test('reads typed times', () {
      expect(parseTime('930'), '09:30');
      expect(parseTime('9'), '09:00');
      expect(parseTime('9:30'), '09:30');
      expect(parseTime('0930'), '09:30');
      expect(parseTime('21.05'), '21:05');
      expect(parseTime(' 7:05 '), '07:05');
      for (final bad in ['24:00', '12:60', 'abc', '', '123456', '1:2']) {
        expect(parseTime(bad), isNull, reason: bad);
      }
      expect(nowTime(DateTime(2026, 9, 15, 7, 5)), '07:05');
    });

    test('moves a date through a native picker and back', () {
      expect(isoToLocalDate('2026-09-15', '2000-01-01'), DateTime(2026, 9, 15));
      expect(isoToLocalDate('nope', '2026-01-05'), DateTime(2026, 1, 5));
      expect(localDateToIso(DateTime(2026, 3, 4)), '2026-03-04');
      expect(timeOfDayToText(7, 5), '07:05');
    });
  });

  group('text search', () {
    test('folds case and accents', () {
      expect(fold('Café ÑANDÚ'), 'cafe nandu');
      expect(fold('Café Åre, Łódź 100%'), 'cafe are, lodz 100%');
    });

    final options = [const Suggestion('1', 'Comida'), const Suggestion('2', 'Supermercado'), const Suggestion('3', 'Cafetería'), const Suggestion('4', 'Mercado')];

    test('offers what contains the text, best matches (prefix) first', () {
      expect(suggestionsFor(options, 'mer').map((o) => o.label), ['Mercado', 'Supermercado']);
      expect(suggestionsFor(options, 'CAFE').map((o) => o.label), ['Cafetería']);
      expect(suggestionsFor(options, 'zzz'), isEmpty);
    });

    test('offers everything for an empty text, up to the maximum', () {
      expect(suggestionsFor(options, '').length, 4);
      expect(suggestionsFor(options, '', max: 2).length, 2);
    });

    test('offers nothing once the text already is an option, so the list closes after a pick', () {
      expect(suggestionsFor(options, 'comida'), isEmpty);
      expect(suggestionsFor(options, ' Cafeteria '), isEmpty);
    });
  });
}
