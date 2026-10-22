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
      'calendar': [],
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
