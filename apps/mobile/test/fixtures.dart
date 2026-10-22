/// Sample answers of the SpaceFly server, shaped like libs/shared/src/dto.
library;

Map<String, Object?> txJson({
  String id = '1',
  String groupId = '1',
  int splitCount = 1,
  String date = '2026-09-10',
  String type = 'withdrawal',
  String description = 'Supermercado',
  num amount = 100,
  Map<String, Object?>? category = const {'id': 'c1', 'name': 'Comida'},
  Map<String, Object?>? budget,
  List<String> tags = const [],
  String? notes,
}) =>
    {
      'id': id,
      'groupId': groupId,
      'splitCount': splitCount,
      'date': date,
      'type': type,
      'description': description,
      'amount': amount,
      'originalAmount': amount,
      'originalCurrency': 'DOP',
      'foreignAmount': null,
      'foreignCurrency': null,
      'rate': 1,
      'category': category,
      'budget': budget,
      'bill': null,
      'tags': tags,
      'source': {'id': 'a1', 'name': 'Banco', 'type': 'asset'},
      'destination': {'id': 'a2', 'name': 'Colmado', 'type': 'expense'},
      'notes': notes,
    };

Map<String, Object?> kpiJson(num value, num previous) => {'value': value, 'previous': previous, 'spark': [1, 3, 2, value]};

Map<String, Object?> dashboardJson() => {
      'kpis': {
        'income': kpiJson(100, 80),
        'expense': kpiJson(40, 50),
        'net': kpiJson(60, 30),
        'savingsRate': kpiJson(60, 37.5),
        'netWorth': kpiJson(1000, 900),
      },
      'months': [
        {'month': '2026-08', 'income': 100, 'expense': 40, 'net': 60},
        {'month': '2026-09', 'income': 120, 'expense': 70, 'net': 50},
      ],
      'topCategories': [
        {'id': '1', 'name': 'Food', 'value': 30, 'children': []},
        {'id': '__others__', 'name': '', 'value': 10, 'children': [{'id': '7', 'name': 'Pets', 'value': 4}]},
      ],
      'netWorth': [
        {'month': '2026-08', 'value': 1000},
      ],
      'calendar': [
        {'date': '2026-09-01', 'income': 100, 'expense': 0, 'count': 1, 'balance': 100},
        {'date': '2026-09-02', 'income': 0, 'expense': 40, 'count': 1, 'balance': 60},
      ],
      'budgets': [
        {
          'id': 'b1',
          'name': 'Hogar',
          'limit': {'value': 500},
          'spent': {'value': 450},
          'remaining': 50,
          'pct': 0.9,
        },
      ],
      'upcomingBills': [
        {'id': 'bill1', 'name': 'Netflix', 'date': '2026-09-20', 'amount': 15},
      ],
      'largest': [txJson(id: '9', amount: 900, description: 'Alquiler')],
    };

Map<String, Object?> accountsJson() => {
      'months': ['2026-08', '2026-09'],
      'total': 300,
      'accounts': [
        {'id': '1', 'name': 'Banco', 'income': 10, 'expense': 4, 'balance': 100, 'balanceOriginal': 100, 'currency': 'DOP', 'role': null, 'type': 'asset', 'includeNetWorth': true, 'excluded': false},
        {'id': '2', 'name': 'Ahorros', 'income': 5, 'expense': 1, 'balance': 200, 'balanceOriginal': 200, 'currency': 'DOP', 'role': 'savingAsset', 'type': 'asset', 'includeNetWorth': true, 'excluded': false},
      ],
      'history': [
        {'id': '1', 'name': 'Banco', 'balances': [90, 100]},
        {'id': '2', 'name': 'Ahorros', 'balances': [180, 200]},
      ],
    };

Map<String, Object?> metaJson({String primary = 'DOP'}) => {
      'fireflyVersion': '6.1.0',
      'fireflyVersionOk': true,
      'minFireflyVersion': '6.0.0',
      'fireflyPublicUrl': 'https://ff.test',
      'primaryCurrency': {'code': primary, 'name': 'Peso dominicano', 'symbol': 'RD\$', 'decimals': 2},
      'displayCurrencies': [
        {'code': 'DOP', 'name': 'Peso dominicano', 'symbol': 'RD\$', 'decimals': 2},
        {'code': 'USD', 'name': 'US Dollar', 'symbol': 'US\$', 'decimals': 2},
      ],
      'email': 'a@b.c',
      'appVersion': '0.1.0',
    };

Map<String, Object?> lookupsJson() => {
      'categories': [
        {'id': 'c1', 'name': 'Comida'},
      ],
      'tags': [
        {'id': 't1', 'name': 'viaje'},
      ],
      'budgets': [
        {'id': 'b1', 'name': 'Hogar'},
      ],
      'accounts': [
        {'id': 'a1', 'name': 'Banco', 'savings': false},
      ],
    };

Map<String, Object?> txEditJson({String id = '5'}) => {
      'groupId': id,
      'journalId': '50',
      'type': 'withdrawal',
      'description': 'Cena',
      'date': '2026-09-10',
      'time': '18:30',
      'amount': '250.00',
      'currency': 'DOP',
      'foreignAmount': null,
      'foreignCurrency': null,
      'category': 'Comida',
      'budgetId': null,
      'billId': null,
      'tags': ['familia'],
      'notes': 'Con la familia',
      'source': {'id': '1', 'name': 'Banco Popular', 'kind': 'asset'},
      'destination': {'id': 'a2', 'name': 'Restaurante', 'kind': 'expense'},
    };

Map<String, Object?> editorLookupsJson() => {
      'accounts': [
        {'id': '1', 'name': 'Banco Popular', 'kind': 'asset', 'liabilityType': null, 'currency': 'DOP', 'balance': 1500, 'role': 'defaultAsset', 'group': null},
        {'id': '2', 'name': 'Cuenta USD', 'kind': 'asset', 'liabilityType': null, 'currency': 'USD', 'balance': 200, 'role': 'savingAsset', 'group': null},
        {'id': '5', 'name': 'Préstamo', 'kind': 'liability', 'liabilityType': 'loan', 'currency': 'DOP', 'balance': -50000, 'role': null, 'group': null},
        {'id': '10', 'name': 'Empresa SRL', 'kind': 'revenue', 'liabilityType': null, 'currency': 'DOP', 'balance': 0, 'role': null, 'group': null},
        {'id': '20', 'name': 'Supermercado', 'kind': 'expense', 'liabilityType': null, 'currency': 'DOP', 'balance': 0, 'role': null, 'group': null},
      ],
      'categories': [
        {'id': '1', 'name': 'Comida'},
      ],
      'tags': [
        {'id': '1', 'name': 'hogar'},
      ],
      'budgets': [
        {'id': '1', 'name': 'Hogar'},
      ],
      'bills': [
        {'id': '1', 'name': 'Luz', 'currency': 'DOP', 'active': true},
      ],
      'piggyBanks': [
        {'id': '1', 'name': 'Fondo', 'currency': 'DOP'},
      ],
      'currencies': [
        {'code': 'DOP', 'name': 'Peso', 'symbol': 'RD\$', 'decimals': 2},
        {'code': 'USD', 'name': 'Dollar', 'symbol': 'US\$', 'decimals': 2},
      ],
      'defaultAccountId': '1',
    };

Map<String, Object?> exchangeRatesJson() => {
      'primary': 'DOP',
      'currencies': ['USD', 'EUR'],
      'rates': [
        {'currency': 'USD', 'date': '2026-09-01', 'rate': 61, 'from': 'USD', 'to': 'DOP'},
        {'currency': 'EUR', 'date': '2026-08-01', 'rate': 65.123456789, 'from': 'EUR', 'to': 'DOP'},
      ],
    };

Map<String, Object?> settingsJson() => {
      'settings': {'excludedAccounts': ['1'], 'balanceMonths': 12, 'sankeyThreshold': 0.02, 'accountOrder': []},
      'rates': [],
      'accounts': [
        {'id': '1', 'name': 'Banco', 'currency': 'DOP', 'role': null},
        {'id': '2', 'name': 'Ahorros', 'currency': 'DOP', 'role': 'savingAsset'},
      ],
    };

Map<String, Object?> calendarDayJson(String date, {num income = 0, num expense = 0, num? balance}) => {'date': date, 'income': income, 'expense': expense, 'count': income > 0 || expense > 0 ? 1 : 0, 'balance': balance};

Map<String, Object?> calendarJson() => {
      'days': [
        calendarDayJson('2026-09-01', income: 100, balance: 100),
        calendarDayJson('2026-09-02', expense: 40, balance: 60),
        calendarDayJson('2026-09-03', balance: 60),
        calendarDayJson('2026-09-04'),
      ],
      'scheduled': [
        {'date': '2026-09-03', 'kind': 'bill', 'id': 'bill1', 'name': 'Netflix', 'amount': 15, 'type': 'withdrawal'},
        {'date': '2026-09-04', 'kind': 'recurrence', 'id': 'r1', 'name': 'Sueldo', 'amount': 500, 'type': 'deposit'},
      ],
      'totals': {'income': 100, 'expense': 40},
      'maxValue': 100,
    };

Map<String, Object?> yearHeatmapJson() => {
      'year': 2026,
      'max': 200,
      'days': [
        for (var d = DateTime.utc(2026, 1, 1); d.year == 2026; d = d.add(const Duration(days: 1)))
          {'date': d.toIso8601String().substring(0, 10), 'income': 0, 'expense': d.month == 9 && d.day == 10 ? 200 : 0},
      ],
    };

Map<String, Object?> amountJson(num value) => {'value': value, 'parts': []};

Map<String, Object?> monthlyJson() => {
      'kpis': {'earned': 100, 'spent': 60, 'net': 40, 'savingsRate': 40},
      'categories': [
        {'id': '1', 'name': 'Food', 'total': amountJson(-60), 'spent': 60, 'earned': 0, 'previous': -40},
        {'id': null, 'name': '', 'total': amountJson(-20), 'spent': 20, 'earned': 0, 'previous': 0},
      ],
      'zeroCategories': ['Pets', 'Gifts'],
      'previousPeriod': {'start': '2026-08-01', 'end': '2026-08-31'},
      'budgets': [
        {'id': 'b1', 'name': 'Hogar', 'limit': amountJson(500), 'spent': amountJson(450), 'remaining': 50, 'pct': 0.9},
      ],
      'zeroBudgets': {'names': ['Ocio'], 'limit': 100},
      'topExpenses': [txJson(id: '9', groupId: '9', amount: 900, description: 'Alquiler')],
      'assets': [
        {
          'id': 'a1',
          'name': 'Banco',
          'income': 100,
          'expense': 60,
          'net': 40,
          'topIncome': [txJson(id: '20', groupId: '20', type: 'deposit', description: 'Sueldo', amount: 100)],
          'topExpenses': [txJson(id: '21', groupId: '21', description: 'Colmado', amount: 60)],
        },
      ],
      'savings': {
        'months': ['2026-08', '2026-09'],
        'accounts': [
          {'id': '2', 'name': 'Ahorros', 'currency': 'DOP', 'balances': [180, 200]},
        ],
      },
      'overview': {
        'month': {'earned': amountJson(100), 'spent': amountJson(60), 'net': amountJson(40)},
        'ytd': {'earned': amountJson(900), 'spent': amountJson(500), 'net': amountJson(400)},
        'netWorth': amountJson(1000),
      },
    };

List<String> _months2026() => [for (var i = 1; i <= 12; i++) '2026-${i.toString().padLeft(2, '0')}'];

Map<String, Object?> annualJson() {
  final months = _months2026();
  return {
    'year': 2026,
    'months': months,
    'categories': [
      {'id': '1', 'name': 'Food', 'values': [for (final _ in months) 10], 'total': 120},
      {'id': null, 'name': '', 'values': [for (final _ in months) 5], 'total': 60},
      {'id': '3', 'name': 'Rent', 'values': [for (final _ in months) 100], 'total': 1200},
    ],
    'income': [for (final _ in months) 500],
    'expense': [for (final _ in months) 200],
    'savingsRate': [for (final (i, _) in months.indexed) i == 0 ? null : 60],
    'best': {'month': '2026-02', 'net': 300},
    'worst': {'month': '2026-01', 'net': 300},
    'averages': {'income': 500, 'expense': 200, 'net': 300},
  };
}

Map<String, Object?> compareJson() => {
      'groupBy': 'category',
      'a': {'start': '2026-09-01', 'end': '2026-09-30', 'income': 100, 'expense': 60},
      'b': {'start': '2026-08-01', 'end': '2026-08-31', 'income': 90, 'expense': 80},
      'rows': [
        {'id': '1', 'name': 'Food', 'a': 40, 'b': 50, 'delta': -10, 'pct': -0.2},
        {'id': null, 'name': '', 'a': 20, 'b': 30, 'delta': -10, 'pct': -0.33},
        {'id': '3', 'name': 'Gone', 'a': 0, 'b': 0, 'delta': 0, 'pct': null},
      ],
      'trend': [
        {'month': '2026-08', 'income': 90, 'expense': 80},
        {'month': '2026-09', 'income': 100, 'expense': 60},
      ],
    };

Map<String, Object?> sankeyJson() => {
      'nodes': [
        {'id': 'rev', 'label': 'Salary', 'kind': 'revenue', 'value': 100},
        {'id': 'hub', 'label': '', 'labelKey': 'sankey.totalIncome', 'kind': 'hub', 'value': 100},
        {'id': 'b1', 'label': 'Hogar', 'kind': 'budget', 'value': 60, 'filter': {'type': 'withdrawal', 'budget': 'b1'}},
        {'id': 'cat1', 'label': 'Food', 'kind': 'category', 'value': 60, 'filter': {'type': 'withdrawal', 'category': '1'}},
        {'id': 'savings', 'label': '', 'labelKey': 'sankey.savings', 'kind': 'savings', 'value': 40},
      ],
      'links': [
        {'source': 'rev', 'target': 'hub', 'value': 100},
        {'source': 'hub', 'target': 'b1', 'value': 60},
        {'source': 'b1', 'target': 'cat1', 'value': 60},
        {'source': 'hub', 'target': 'savings', 'value': 40},
      ],
      'totalIncome': 100,
      'totalExpense': 60,
      'savings': 40,
      'savingsLabel': 'savings',
    };

Map<String, Object?> rankingJson() => {
      'kind': 'expense',
      'total': 150,
      'months': ['2026-08', '2026-09'],
      'items': [
        {'id': '1', 'name': 'Food', 'value': 100, 'share': 2 / 3, 'count': 4, 'avg': 25, 'previous': 80},
        {'id': null, 'name': '', 'value': 50, 'share': 1 / 3, 'count': 1, 'avg': 50, 'previous': 0},
      ],
      'trend': [
        {
          'id': '1',
          'name': 'Food',
          'points': [
            {'month': '2026-08', 'value': 40},
            {'month': '2026-09', 'value': 60},
          ],
        },
      ],
    };

Map<String, Object?> budgetsJson() => {
      'available': {'amount': 300, 'spentInBudgets': 190, 'spentOutsideBudgets': 5},
      'budgets': [
        {
          'id': 'b1',
          'name': 'Hogar',
          'limit': 100,
          'spent': 40,
          'remaining': 60,
          'pct': 0.4,
          'autoBudget': {'type': null, 'period': null, 'amount': null},
          'projected': null,
          'categories': [
            {'id': '9', 'name': 'Food', 'value': 30},
            {'id': null, 'name': '', 'value': 10},
          ],
          'history': [
            {'month': '2026-08', 'limit': 100, 'spent': 40},
            {'month': '2026-09', 'limit': 100, 'spent': 120},
          ],
        },
        {
          'id': 'b2',
          'name': 'Ocio',
          'limit': 200,
          'spent': 150,
          'remaining': 50,
          'pct': 0.75,
          'autoBudget': {'type': 'reset', 'period': 'monthly', 'amount': 200},
          'projected': 260,
          'categories': [
            {'id': '5', 'name': 'Cine', 'value': 150},
          ],
          'history': [
            {'month': '2026-09', 'limit': 200, 'spent': 150},
          ],
        },
      ],
      'unbudgeted': 5,
      'elapsedRatio': 0.5,
    };
