///
/// Generated file. Do not edit.
///
// coverage:ignore-file
// ignore_for_file: type=lint, unused_import
// dart format off

import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';
import 'package:slang/generated.dart';
import 'strings.g.dart';

// Path: <root>
class TranslationsEs extends Translations with BaseTranslations<AppLocale, Translations> {
	/// You can call this constructor and build your own translation instance of this locale.
	/// Constructing via the enum [AppLocale.build] is preferred.
	TranslationsEs({Map<String, Node>? overrides, PluralResolver? cardinalResolver, PluralResolver? ordinalResolver, TranslationMetadata<AppLocale, Translations>? meta})
		: assert(overrides == null, 'Set "translation_overrides: true" in order to enable this feature.'),
		  _meta = meta ?? TranslationMetadata(
		    locale: AppLocale.es,
		    overrides: overrides ?? {},
		    cardinalResolver: cardinalResolver,
		    ordinalResolver: ordinalResolver,
		  ),
		  super(cardinalResolver: cardinalResolver, ordinalResolver: ordinalResolver) {
		_meta.setFlatMapFunction(_flatMapFunction);
	}

	/// Metadata for the translations of <es>.
	final TranslationMetadata<AppLocale, Translations> _meta;
	@override TranslationMetadata<AppLocale, Translations> get $meta => _meta;

	/// Access flat map
	@override dynamic operator[](String key) => _meta.getTranslation(key) ?? super[key];

	late final TranslationsEs _root = this; // ignore: unused_field

	@override 
	TranslationsEs $copyWith({TranslationMetadata<AppLocale, Translations>? meta}) => TranslationsEs(meta: meta ?? this.$meta);

	// Translations
	@override late final _Translations$lang$es lang = _Translations$lang$es._(_root);
	@override late final _Translations$theme$es theme = _Translations$theme$es._(_root);
	@override late final _Translations$common$es common = _Translations$common$es._(_root);
	@override late final _Translations$nav$es nav = _Translations$nav$es._(_root);
	@override late final _Translations$topbar$es topbar = _Translations$topbar$es._(_root);
	@override late final _Translations$login$es login = _Translations$login$es._(_root);
	@override late final _Translations$errors$es errors = _Translations$errors$es._(_root);
	@override late final _Translations$period$es period = _Translations$period$es._(_root);
	@override late final _Translations$currency$es currency = _Translations$currency$es._(_root);
	@override late final _Translations$kpi$es kpi = _Translations$kpi$es._(_root);
	@override late final _Translations$chart$es chart = _Translations$chart$es._(_root);
	@override late final _Translations$tx$es tx = _Translations$tx$es._(_root);
	@override late final _Translations$txType$es txType = _Translations$txType$es._(_root);
	@override late final _Translations$dashboard$es dashboard = _Translations$dashboard$es._(_root);
	@override late final _Translations$monthly$es monthly = _Translations$monthly$es._(_root);
	@override late final _Translations$budget$es budget = _Translations$budget$es._(_root);
	@override late final _Translations$sankey$es sankey = _Translations$sankey$es._(_root);
	@override late final _Translations$flow$es flow = _Translations$flow$es._(_root);
	@override late final _Translations$calendar$es calendar = _Translations$calendar$es._(_root);
	@override late final _Translations$compare$es compare = _Translations$compare$es._(_root);
	@override late final _Translations$annual$es annual = _Translations$annual$es._(_root);
	@override late final _Translations$ranking$es ranking = _Translations$ranking$es._(_root);
	@override late final _Translations$accounts$es accounts = _Translations$accounts$es._(_root);
	@override late final _Translations$netWorth$es netWorth = _Translations$netWorth$es._(_root);
	@override late final _Translations$savings$es savings = _Translations$savings$es._(_root);
	@override late final _Translations$bills$es bills = _Translations$bills$es._(_root);
	@override late final _Translations$recurring$es recurring = _Translations$recurring$es._(_root);
	@override late final _Translations$goals$es goals = _Translations$goals$es._(_root);
	@override late final _Translations$projection$es projection = _Translations$projection$es._(_root);
	@override late final _Translations$explorer$es explorer = _Translations$explorer$es._(_root);
	@override late final _Translations$settings$es settings = _Translations$settings$es._(_root);
	@override late final _Translations$about$es about = _Translations$about$es._(_root);
	@override late final _Translations$forms$es forms = _Translations$forms$es._(_root);
	@override late final _Translations$editor$es editor = _Translations$editor$es._(_root);
}

// Path: lang
class _Translations$lang$es extends Translations$lang$en {
	_Translations$lang$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get es => 'Español';
	@override String get en => 'English';
}

// Path: theme
class _Translations$theme$es extends Translations$theme$en {
	_Translations$theme$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get midnight => 'Medianoche';
	@override String get earth => 'Tierra';
	@override String get dusk => 'Atardecer';
}

// Path: common
class _Translations$common$es extends Translations$common$en {
	_Translations$common$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get income => 'Ingresos';
	@override String get expenses => 'Gastos';
	@override String get net => 'Neto';
	@override String get savingsRate => 'Tasa de ahorro';
	@override String get netWorth => 'Patrimonio neto';
	@override String get month => 'Mes';
	@override String get search => 'Buscar…';
	@override String get noResults => 'Sin resultados';
	@override String get date => 'Fecha';
	@override String get amount => 'Monto';
	@override String get total => 'Total';
	@override String get category => 'Categoría';
	@override String get budget => 'Presupuesto';
	@override String get account => 'Cuenta';
	@override String get tag => 'Etiqueta';
	@override String get uncategorized => 'Sin categoría';
	@override String get untagged => 'Sin etiqueta';
	@override String get noBudget => 'Sin presupuesto';
	@override String get others => 'Otros';
	@override String get noData => 'No hay datos para este periodo';
	@override String get viewAll => 'Ver todo';
}

// Path: nav
class _Translations$nav$es extends Translations$nav$en {
	_Translations$nav$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get menu => 'Menú';
	@override String get readOnly => 'reportes y captura';
	@override String get toggle => 'Mostrar u ocultar menú';
	@override String get skipToContent => 'Saltar al contenido';
	@override String get breadcrumb => 'Ruta de navegación';
	@override late final _Translations$nav$sections$es sections = _Translations$nav$sections$es._(_root);
	@override String get dashboard => 'Dashboard';
	@override String get monthly => 'Resumen mensual';
	@override String get annual => 'Reporte anual';
	@override String get flow => 'Flujo de dinero';
	@override String get calendar => 'Calendario';
	@override String get compare => 'Comparaciones';
	@override String get categories => 'Categorías';
	@override String get tags => 'Etiquetas';
	@override String get budgets => 'Presupuestos';
	@override String get merchants => 'Comercios';
	@override String get incomeSources => 'Fuentes de ingreso';
	@override String get assetAccounts => 'Cuentas de activo';
	@override String get expenseAccounts => 'Cuentas de gasto';
	@override String get revenueAccounts => 'Cuentas de ingreso';
	@override String get accountDetail => 'Detalle de cuenta';
	@override String get netWorth => 'Patrimonio neto';
	@override String get savings => 'Ahorros';
	@override String get bills => 'Suscripciones';
	@override String get recurring => 'Recurrentes';
	@override String get goals => 'Metas';
	@override String get projection => 'Proyección de flujo';
	@override String get explorer => 'Explorador';
	@override String get newTransaction => 'Nueva transacción';
	@override String get editTransaction => 'Editar transacción';
	@override String get more => 'Más';
	@override String get settings => 'Ajustes';
	@override String get about => 'Acerca de';
}

// Path: topbar
class _Translations$topbar$es extends Translations$topbar$en {
	_Translations$topbar$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get refresh => 'Refrescar datos';
	@override String get refreshed => 'Datos actualizados desde Firefly';
	@override String get language => 'Idioma';
	@override String get theme => 'Tema';
	@override String get hideAmounts => 'Ocultar montos';
	@override String get showAmounts => 'Mostrar montos';
	@override String get account => 'Cuenta de usuario';
	@override String get openFirefly => 'Abrir Firefly III';
	@override String get logout => 'Cerrar sesión';
}

// Path: login
class _Translations$login$es extends Translations$login$en {
	_Translations$login$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get subtitle => 'Reportes interactivos para tu Firefly III';
	@override String get button => 'Iniciar sesión con Firefly';
	@override String get readOnly => 'SpaceFly lee tus datos de Firefly III y te deja registrarlos y editarlos. Tu token nunca llega al navegador.';
	@override late final _Translations$login$errors$es errors = _Translations$login$errors$es._(_root);
}

// Path: errors
class _Translations$errors$es extends Translations$errors$en {
	_Translations$errors$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get load => 'No se pudieron cargar los datos';
	@override String get generic => 'Algo salió mal. Inténtalo de nuevo.';
	@override String version({required Object version, required Object min}) => 'Tu Firefly III es ${version}; SpaceFly requiere ${min} o superior. Algunos datos pueden ser incorrectos.';
}

// Path: period
class _Translations$period$es extends Translations$period$en {
	_Translations$period$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get previous => 'Periodo anterior';
	@override String get next => 'Periodo siguiente';
	@override String get custom => 'Rango personalizado';
	@override String get from => 'Desde';
	@override String get to => 'Hasta';
	@override String get apply => 'Aplicar';
	@override String get quarterShort => 'T';
	@override String get ytdShort => 'En el año';
	@override late final _Translations$period$presets$es presets = _Translations$period$presets$es._(_root);
}

// Path: currency
class _Translations$currency$es extends Translations$currency$en {
	_Translations$currency$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get label => 'Moneda de visualización';
}

// Path: kpi
class _Translations$kpi$es extends Translations$kpi$en {
	_Translations$kpi$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get vsPrevious => 'Anterior:';
}

// Path: chart
class _Translations$chart$es extends Translations$chart$en {
	_Translations$chart$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get showTable => 'Ver como tabla';
	@override String get showChart => 'Ver gráfico';
	@override String get download => 'Descargar PNG';
	@override String get shareCsv => 'Compartir como CSV';
}

// Path: tx
class _Translations$tx$es extends Translations$tx$en {
	_Translations$tx$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get none => 'No hay transacciones';
	@override String get count => 'Transacciones';
	@override String get breakdown => 'Categorías que lo componen';
	@override String get openInFirefly => 'Abrir en Firefly';
}

// Path: txType
class _Translations$txType$es extends Translations$txType$en {
	_Translations$txType$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get withdrawal => 'Gasto';
	@override String get deposit => 'Ingreso';
	@override String get transfer => 'Transferencia';
	@override String get openingBalance => 'Saldo inicial';
	@override String get reconciliation => 'Conciliación';
	@override String get liabilityCredit => 'Crédito de pasivo';
}

// Path: dashboard
class _Translations$dashboard$es extends Translations$dashboard$en {
	_Translations$dashboard$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Tu situación financiera de un vistazo.';
	@override String get incomeVsExpense => 'Ingresos vs gastos';
	@override String get last12 => 'Últimos 12 meses';
	@override String get topCategories => 'Principales categorías de gasto';
	@override String get upcomingBills => 'Próximas suscripciones';
	@override String get noUpcoming => 'Nada programado en los próximos 30 días';
	@override String get largest => 'Gastos más grandes';
}

// Path: monthly
class _Translations$monthly$es extends Translations$monthly$en {
	_Translations$monthly$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'El reporte del email, interactivo y para cualquier periodo.';
	@override String get earned => 'Ingresado';
	@override String get spent => 'Gastado';
	@override String get netChange => 'Cambio neto';
	@override String get categories => 'Resumen por categoría';
	@override String vsPrevious({required Object month}) => 'vs ${month}';
	@override String get kNew => 'Nuevo';
	@override String get moneyFlow => 'Flujo de dinero';
	@override String get openInteractive => 'Abrir interactivo';
	@override String get dailyCashFlow => 'Flujo diario';
	@override String get budgets => 'Resumen de presupuestos';
	@override String get top5 => 'Los 5 gastos más grandes';
	@override String get assetActivity => 'Actividad por cuenta de activo';
	@override String get topIncome => 'Principales ingresos';
	@override String get topExpenses => 'Principales gastos';
	@override String savings({required Object n}) => 'Cuentas de ahorro – saldo (últimos ${n} meses)';
	@override String get overview => 'Resumen financiero';
	@override String get thisPeriod => 'Este periodo';
	@override String get ytd => 'Año hasta la fecha';
	@override String get currentNetWorth => 'Patrimonio neto actual';
}

// Path: budget
class _Translations$budget$es extends Translations$budget$en {
	_Translations$budget$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Límite vs gastado, ritmo de gasto y cumplimiento histórico.';
	@override String get limit => 'Límite';
	@override String get spent => 'Gastado';
	@override String get remaining => 'Restante';
	@override String get none => 'No hay presupuestos con actividad en este periodo';
	@override String get expectedPace => 'Ritmo esperado a la fecha';
	@override late final _Translations$budget$status$es status = _Translations$budget$status$es._(_root);
	@override late final _Translations$budget$auto$es auto = _Translations$budget$auto$es._(_root);
	@override String get totalLimit => 'Límite total';
	@override String get spentInBudgets => 'Gastado en presupuestos';
	@override String get unbudgeted => 'Fuera de presupuesto';
	@override String get available => 'Disponible para presupuestar';
	@override String get projection => 'Proyección al cierre:';
	@override String overBy({required Object amount}) => 'excede por ${amount}';
	@override String history({required Object name}) => '${name} · últimos 12 meses';
	@override String byCategory({required Object name}) => '${name} por categoría';
}

// Path: sankey
class _Translations$sankey$es extends Translations$sankey$en {
	_Translations$sankey$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get totalIncome => 'Ingreso total';
	@override String get savings => 'Ahorro';
	@override String get netSavings => 'Ahorro neto';
	@override String get deficit => 'Déficit';
	@override String get othersExpense => 'Otros gastos';
	@override String get othersIncome => 'Otras fuentes';
	@override String get othersTags => 'Otras etiquetas';
	@override late final _Translations$sankey$kinds$es kinds = _Translations$sankey$kinds$es._(_root);
}

// Path: flow
class _Translations$flow$es extends Translations$flow$en {
	_Translations$flow$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get title => 'Flujo de dinero';
	@override String get description => 'De dónde viene tu dinero y a dónde va.';
	@override String get hint => 'Pasa el cursor para resaltar una ruta · clic en un nodo para ver sus transacciones · arrastra para reordenar';
	@override String get hintTouch => 'Toca un nodo para ver sus transacciones · desliza de lado si el gráfico es ancho';
	@override String get byBudget => 'Por presupuesto';
	@override String get byTags => 'Por etiquetas';
	@override String get showBudgets => 'Presupuestos';
	@override String get showIncomeCategories => 'Categorías de ingreso';
	@override String get groupSmall => 'Agrupar flujos menores a';
	@override String get from => 'Desde';
	@override String get to => 'Hacia';
	@override String get shareOfIncome => '% del ingreso';
}

// Path: calendar
class _Translations$calendar$es extends Translations$calendar$en {
	_Translations$calendar$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get title => 'Calendario de ingresos y gastos';
	@override String get description => 'Ingresos y gastos día a día, con lo programado.';
	@override String get month => 'Mes';
	@override String get year => 'Año';
	@override String get allAccounts => 'Todas las cuentas';
	@override String get allCategories => 'Todas las categorías';
	@override String get allTags => 'Todas las etiquetas';
	@override String get endBalance => 'Saldo al cierre';
	@override String get clickDay => 'Clic en un día para ver sus transacciones';
	@override String get runningBalance => 'Saldo acumulado';
	@override String get balance => 'Saldo';
	@override String get noBalance => 'El saldo acumulado no aplica con filtros de categoría o etiqueta';
	@override String get scheduled => 'Programado este mes';
	@override String get noScheduled => 'Nada programado';
	@override String get bill => 'Suscripción';
	@override String get recurrence => 'Recurrente';
	@override String heatmapTitle({required Object year}) => 'Intensidad de gasto ${year}';
	@override String get heatmapHint => 'Cada celda es un día; más oscuro = más gasto';
}

// Path: compare
class _Translations$compare$es extends Translations$compare$en {
	_Translations$compare$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Compara dos periodos por categoría, etiqueta, presupuesto, cuenta o comercio.';
	@override String get previous => 'vs periodo anterior';
	@override String get yoy => 'vs año anterior';
	@override String get custom => 'Rango libre';
	@override String get groupBy => 'Agrupar por';
	@override String get deltaTitle => 'Mayores cambios (A − B)';
	@override String get deltaHintExpense => 'Rojo = gastaste más · azul = gastaste menos';
	@override String get deltaHintIncome => 'Azul = ingresaste más · rojo = ingresaste menos';
	@override String get trend => 'Tendencia de 12 meses';
	@override late final _Translations$compare$groups$es groups = _Translations$compare$groups$es._(_root);
}

// Path: annual
class _Translations$annual$es extends Translations$annual$en {
	_Translations$annual$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String title({required Object year}) => 'Reporte anual ${year}';
	@override String get description => 'El año mes a mes: totales, mejor y peor mes, y categorías.';
	@override String get avgIncome => 'Ingreso promedio mensual';
	@override String get avgExpense => 'Gasto promedio mensual';
	@override String get best => 'Mejor mes';
	@override String get worst => 'Peor mes';
	@override String get byMonth => 'Ingresos y gastos por mes';
	@override String get savingsRate => 'Tasa de ahorro mensual';
	@override String get matrix => 'Gasto por categoría y mes';
	@override String get matrixHint => 'Las 15 categorías principales; clic en una celda para ver transacciones';
}

// Path: ranking
class _Translations$ranking$es extends Translations$ranking$en {
	_Translations$ranking$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override late final _Translations$ranking$descriptions$es descriptions = _Translations$ranking$descriptions$es._(_root);
	@override String get items => 'Elementos';
	@override String get transactions => 'Transacciones';
	@override String get avgTicket => 'Ticket promedio';
	@override String get distribution => 'Distribución';
	@override String get trend => 'Tendencia';
	@override String get trendHint => 'Principales elementos, últimos 12 meses';
	@override String get name => 'Nombre';
	@override String get share => '% del total';
	@override String get count => 'Cant.';
	@override String get previous => 'Periodo anterior';
	@override late final _Translations$ranking$views$es views = _Translations$ranking$views$es._(_root);
}

// Path: accounts
class _Translations$accounts$es extends Translations$accounts$en {
	_Translations$accounts$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Saldos actuales y su evolución.';
	@override String get history => 'Meses de historial';
	@override String get monthsShort => 'm';
	@override String get total => 'Total en cuentas';
	@override String get balanceOriginal => 'Saldo (moneda original)';
	@override String get balance => 'Saldo';
	@override String get balanceHistory => 'Evolución de saldos';
	@override String get excluded => 'Excluida';
	@override late final _Translations$accounts$roles$es roles = _Translations$accounts$roles$es._(_root);
	@override late final _Translations$accounts$reorder$es reorder = _Translations$accounts$reorder$es._(_root);
	@override late final _Translations$accounts$counterparty$es counterparty = _Translations$accounts$counterparty$es._(_root);
	@override late final _Translations$accounts$detail$es detail = _Translations$accounts$detail$es._(_root);
}

// Path: netWorth
class _Translations$netWorth$es extends Translations$netWorth$en {
	_Translations$netWorth$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Tu patrimonio neto en el tiempo.';
	@override String get current => 'Patrimonio actual';
	@override String change({required Object n}) => 'Cambio en ${n} meses';
	@override String get total => 'Patrimonio neto total';
	@override String get byAccount => 'Por cuenta';
	@override String get stackedHint => 'Área apilada de saldos positivos';
}

// Path: savings
class _Translations$savings$es extends Translations$savings$en {
	_Translations$savings$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Saldo de tus cuentas de ahorro (sin tarjetas de crédito ni cuentas excluidas).';
	@override String get total => 'Total ahorrado';
	@override String get accounts => 'Cuentas';
	@override String get perAccount => 'Evolución por cuenta';
	@override String get manageExcluded => 'Cuentas excluidas';
}

// Path: bills
class _Translations$bills$es extends Translations$bills$en {
	_Translations$bills$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Costo, próximas fechas y pagos de tus suscripciones.';
	@override String get monthly => 'Costo mensual equivalente';
	@override String get yearly => 'Costo anual';
	@override String get paid => 'Pagadas en el periodo';
	@override String pendingAmount({required Object n}) => 'Pendientes (${n})';
	@override String get name => 'Suscripción';
	@override String get status => 'Estado';
	@override String get next => 'Próxima';
	@override String get range => 'Rango esperado';
	@override String get monthlyEq => 'Mensual eq.';
	@override String get paidThisPeriod => 'Pagos del periodo';
	@override String get outOfRange => 'Fuera de rango';
	@override String skip({required Object n}) => 'cada ${n}';
	@override String get none => 'No tienes suscripciones en Firefly';
	@override String get costRanking => 'Costo anual por suscripción';
	@override String get costRankingHint => 'Solo suscripciones activas';
	@override String get last12Months => 'Últimos 12 meses';
	@override String get selectedPeriod => 'Período seleccionado';
	@override late final _Translations$bills$statuses$es statuses = _Translations$bills$statuses$es._(_root);
	@override late final _Translations$bills$freq$es freq = _Translations$bills$freq$es._(_root);
}

// Path: recurring
class _Translations$recurring$es extends Translations$recurring$en {
	_Translations$recurring$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Transacciones recurrentes configuradas en Firefly y sus próximas fechas.';
	@override String get list => 'Recurrentes';
	@override String get next => 'Próximas fechas';
	@override String until({required Object date}) => 'Hasta ${date}';
	@override String get inactive => 'Inactiva';
	@override String get none => 'No tienes transacciones recurrentes';
}

// Path: goals
class _Translations$goals$es extends Translations$goals$en {
	_Translations$goals$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Tus huchas (piggy banks): progreso y fecha estimada según tu ritmo de aportes.';
	@override String get saved => 'Total ahorrado';
	@override String get target => 'Meta total';
	@override String get current => 'Ahorrado';
	@override String get goal => 'Meta';
	@override String get pace => 'Ritmo (6 meses)';
	@override String get month => 'mes';
	@override String get left => 'Falta';
	@override String get targetDate => 'Fecha meta';
	@override String get estimated => 'Estimada';
	@override String get noPace => 'sin aportes recientes';
	@override String get onTrack => 'A tiempo';
	@override String get behind => 'Atrasada';
	@override String get none => 'No tienes metas en Firefly';
}

// Path: projection
class _Translations$projection$es extends Translations$projection$en {
	_Translations$projection$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Saldo actual + recurrentes + suscripciones programadas.';
	@override String get daysShort => 'd';
	@override String get today => 'Saldo hoy';
	@override String kIn({required Object n}) => 'En ${n} días';
	@override String get chart => 'Saldo proyectado';
	@override String lowest({required Object amount, required Object date}) => 'Punto más bajo: ${amount} el ${date}';
	@override String get events => 'Movimientos programados';
	@override String get noEvents => 'Nada programado en este horizonte';
	@override String get inflow => 'Entradas';
	@override String get outflow => 'Salidas';
}

// Path: explorer
class _Translations$explorer$es extends Translations$explorer$en {
	_Translations$explorer$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get allTypes => 'Todos';
	@override String get description => 'Busca, filtra, ordena y exporta tus transacciones.';
	@override String get search => 'Buscar';
	@override String get clear => 'Limpiar';
	@override String get searchPlaceholder => 'Descripción, cuenta o nota…  (o sintaxis de Firefly: amount_more:500 category_is:Comida)';
	@override String get fireflySyntax => 'Buscar en todo Firefly (sintaxis de Firefly)';
	@override String get fireflySyntaxHint => 'Usa el buscador de Firefly en todas tus transacciones, sin limitarse al periodo';
	@override String get allBudgets => 'Todos los presupuestos';
	@override String results({required Object n}) => '${n} resultados';
	@override String get descriptionCol => 'Descripción';
	@override String get export => 'Exportar CSV';
	@override String get exportHidden => 'La exportación está desactivada mientras los montos están ocultos';
	@override String page({required Object page, required Object pages}) => 'Página ${page} de ${pages}';
	@override String get loadMore => 'Mostrar más';
}

// Path: settings
class _Translations$settings$es extends Translations$settings$en {
	_Translations$settings$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override late final _Translations$settings$mobile$es mobile = _Translations$settings$mobile$es._(_root);
	@override String get description => 'Preferencias de SpaceFly (se guardan en SpaceFly, nunca en Firefly).';
	@override String get save => 'Guardar';
	@override String get saved => 'Ajustes guardados';
	@override String get excluded => 'Cuentas excluidas';
	@override String get excludedHint => 'Se ocultan de ahorros, patrimonio y proyección (equivale a exclude_accounts del script).';
	@override String get preferences => 'Preferencias';
	@override String get balanceMonths => 'Meses de historial de saldos por defecto';
	@override String get sankeyThreshold => 'Umbral de "Otros" en el Sankey';
	@override late final _Translations$settings$exchange$es exchange = _Translations$settings$exchange$es._(_root);
	@override String get rates => 'Tasas en uso';
	@override String get ratesHint => 'La tasa más reciente guardada en Firefly en o antes de cada fecha; si no hay, se usa open.er-api.com.';
	@override String get pair => 'Par';
	@override String get rate => 'Tasa';
	@override String get source => 'Origen';
	@override late final _Translations$settings$sources$es sources = _Translations$settings$sources$es._(_root);
}

// Path: about
class _Translations$about$es extends Translations$about$en {
	_Translations$about$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get version => 'Versión';
	@override String supported({required Object min}) => 'Compatible (≥ ${min})';
	@override String unsupported({required Object min}) => 'No compatible (< ${min})';
	@override String get primary => 'Moneda primaria';
	@override String get user => 'Usuario';
	@override String get instance => 'Instancia';
	@override String get body => 'SpaceFly lee y escribe en Firefly III a través de su servidor, que además protege las escrituras contra peticiones de otros sitios. Tu token nunca llega al navegador.';
}

// Path: forms
class _Translations$forms$es extends Translations$forms$en {
	_Translations$forms$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String createOption({required Object name}) => 'Crear «${name}»';
	@override String moreResults({required Object count}) => '${count} más; escribe para buscar';
	@override String get today => 'Hoy';
	@override String get now => 'Ahora';
	@override String get pickDate => 'Elige una fecha';
	@override String get pickTime => 'Elige una hora';
	@override String get hour => 'Hora';
	@override String get minute => 'Minuto';
	@override String get clear => 'Quitar';
	@override String get ok => 'Aceptar';
	@override String get previousMonth => 'Mes anterior';
	@override String get nextMonth => 'Mes siguiente';
	@override String get yesterday => 'Ayer';
	@override String get save => 'Guardar';
	@override String get saving => 'Guardando…';
	@override String get cancel => 'Cancelar';
	@override String get delete => 'Eliminar';
	@override late final _Translations$forms$errors$es errors = _Translations$forms$errors$es._(_root);
	@override late final _Translations$forms$account$es account = _Translations$forms$account$es._(_root);
	@override late final _Translations$forms$accountGroups$es accountGroups = _Translations$forms$accountGroups$es._(_root);
	@override late final _Translations$forms$txType$es txType = _Translations$forms$txType$es._(_root);
	@override late final _Translations$forms$tags$es tags = _Translations$forms$tags$es._(_root);
	@override late final _Translations$forms$confirm$es confirm = _Translations$forms$confirm$es._(_root);
}

// Path: editor
class _Translations$editor$es extends Translations$editor$en {
	_Translations$editor$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get back => 'Volver';
	@override String get retry => 'Reintentar';
	@override String get networkError => 'No se pudo contactar con el servidor. Revisa tu conexión: es posible que el cambio no se haya guardado.';
	@override String get kNew => 'Nuevo';
	@override String get newTitle => 'Crear';
	@override late final _Translations$editor$tx$es tx = _Translations$editor$tx$es._(_root);
	@override String get missing => 'Ese registro ya no existe.';
	@override String get loadError => 'No se pudo cargar el registro.';
	@override String get clear => 'Quitar';
	@override late final _Translations$editor$fields$es fields = _Translations$editor$fields$es._(_root);
	@override late final _Translations$editor$entity$es entity = _Translations$editor$entity$es._(_root);
	@override late final _Translations$editor$periods$es periods = _Translations$editor$periods$es._(_root);
}

// Path: nav.sections
class _Translations$nav$sections$es extends Translations$nav$sections$en {
	_Translations$nav$sections$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get general => 'General';
	@override String get reports => 'Reportes';
	@override String get analysis => 'Análisis';
	@override String get accounts => 'Cuentas';
	@override String get planning => 'Planificación';
	@override String get transactions => 'Transacciones';
	@override String get create => 'Crear';
	@override String get system => 'Sistema';
}

// Path: login.errors
class _Translations$login$errors$es extends Translations$login$errors$en {
	_Translations$login$errors$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get invalidState => 'La sesión de inicio expiró o no es válida. Inténtalo de nuevo.';
	@override String get tokenExchange => 'Firefly rechazó el inicio de sesión. Revisa el cliente OAuth.';
	@override String get accessDenied => 'Se canceló la autorización en Firefly.';
	@override String get cfAccess => 'Cloudflare Access bloqueó la app. Revisa el service token (Client ID y secret).';
	@override String get generic => 'No se pudo iniciar sesión.';
}

// Path: period.presets
class _Translations$period$presets$es extends Translations$period$presets$en {
	_Translations$period$presets$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get thisMonth => 'Este mes';
	@override String get lastMonth => 'Mes anterior';
	@override String get last30 => 'Últimos 30 días';
	@override String get last6m => 'Últimos 6 meses';
	@override String get thisQuarter => 'Este trimestre';
	@override String get thisYear => 'Este año';
	@override String get lastYear => 'Año anterior';
	@override String get ytd => 'Año hasta la fecha';
}

// Path: budget.status
class _Translations$budget$status$es extends Translations$budget$status$en {
	_Translations$budget$status$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get good => 'En rango';
	@override String get warning => 'Cerca del límite';
	@override String get critical => 'Excedido';
}

// Path: budget.auto
class _Translations$budget$auto$es extends Translations$budget$auto$en {
	_Translations$budget$auto$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get reset => 'Auto · reinicio';
	@override String get rollover => 'Auto · acumulativo';
	@override String get adjusted => 'Auto · ajustado';
}

// Path: sankey.kinds
class _Translations$sankey$kinds$es extends Translations$sankey$kinds$en {
	_Translations$sankey$kinds$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get revenue => 'Fuente de ingreso';
	@override String get incomeCat => 'Categoría de ingreso';
	@override String get hub => 'Total';
	@override String get budget => 'Presupuesto';
	@override String get tag => 'Etiqueta';
	@override String get category => 'Categoría de gasto';
	@override String get savings => 'Ahorro';
	@override String get deficit => 'Déficit';
	@override String get other => 'Otros';
}

// Path: compare.groups
class _Translations$compare$groups$es extends Translations$compare$groups$en {
	_Translations$compare$groups$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get category => 'Categoría';
	@override String get tag => 'Etiqueta';
	@override String get budget => 'Presupuesto';
	@override String get account => 'Cuenta';
	@override String get counterparty => 'Comercio / fuente';
}

// Path: ranking.descriptions
class _Translations$ranking$descriptions$es extends Translations$ranking$descriptions$en {
	_Translations$ranking$descriptions$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get categories => 'Ranking, distribución y tendencia por categoría.';
	@override String get tags => 'Ranking, distribución y tendencia por etiqueta.';
	@override String get merchants => 'A quién le pagas más: frecuencia, ticket promedio y tendencia.';
	@override String get incomeSources => 'De dónde vienen tus ingresos.';
}

// Path: ranking.views
class _Translations$ranking$views$es extends Translations$ranking$views$en {
	_Translations$ranking$views$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get bars => 'Barras';
	@override String get treemap => 'Mapa';
	@override String get sunburst => 'Presupuestos';
}

// Path: accounts.roles
class _Translations$accounts$roles$es extends Translations$accounts$roles$en {
	_Translations$accounts$roles$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get defaultAsset => 'Principal';
	@override String get sharedAsset => 'Compartida';
	@override String get savingAsset => 'Ahorro';
	@override String get ccAsset => 'Tarjeta de crédito';
	@override String get cashWalletAsset => 'Efectivo';
}

// Path: accounts.reorder
class _Translations$accounts$reorder$es extends Translations$accounts$reorder$en {
	_Translations$accounts$reorder$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get start => 'Reordenar';
	@override String get done => 'Listo';
	@override String get reset => 'Restablecer orden';
	@override String get hint => 'Arrastra las filas o usa las flechas. El orden se guarda solo.';
	@override String up({required Object name}) => 'Subir ${name}';
	@override String down({required Object name}) => 'Bajar ${name}';
}

// Path: accounts.counterparty
class _Translations$accounts$counterparty$es extends Translations$accounts$counterparty$en {
	_Translations$accounts$counterparty$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override late final _Translations$accounts$counterparty$descriptions$es descriptions = _Translations$accounts$counterparty$descriptions$es._(_root);
	@override String get showEmpty => 'Mostrar sin actividad';
	@override String get lastActivity => 'Última actividad';
	@override String get monthly => 'Últimos 12 meses';
	@override String get topAccounts => 'Cuentas con más movimiento';
	@override String get activeAccounts => 'Cuentas con actividad';
	@override String get never => 'Sin actividad reciente';
	@override String get share => '% del total';
	@override String get notFoundHint => 'Puede que no sea una cuenta de este tipo o que se haya eliminado.';
	@override late final _Translations$accounts$counterparty$calendar$es calendar = _Translations$accounts$counterparty$calendar$es._(_root);
	@override late final _Translations$accounts$counterparty$weekday$es weekday = _Translations$accounts$counterparty$weekday$es._(_root);
	@override String get paidFrom => 'Pagado desde';
	@override String get receivedIn => 'Recibido en';
	@override String get byCategory => 'Por categoría';
	@override String get biggest => 'Mayor transacción';
	@override String get lastTransaction => 'Última transacción';
	@override String get monthlyAverage => 'Promedio mensual (12 meses)';
	@override String get total12 => 'Total de 12 meses';
	@override String get fromAccount => 'Cuenta';
}

// Path: accounts.detail
class _Translations$accounts$detail$es extends Translations$accounts$detail$en {
	_Translations$accounts$detail$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get back => 'Volver a cuentas';
	@override String get closing => 'Saldo final';
	@override String get opening => 'Saldo inicial';
	@override String get change => 'Variación';
	@override String get lowest => 'Saldo más bajo';
	@override String get highest => 'Saldo más alto';
	@override String get avgDailyExpense => 'Gasto diario promedio';
	@override String get biggestExpense => 'Mayor gasto';
	@override String get biggestIncome => 'Mayor ingreso';
	@override String get netTransfers => 'Transferencias netas';
	@override String get records => 'Registros';
	@override String get stats => 'Resumen del periodo';
	@override String get dailyBalance => 'Saldo por día';
	@override String get dailyFlow => 'Ingresos y gastos por día';
	@override String get zoomHint => 'Usa la rueda o arrastra para acercar';
	@override String get monthly => 'Últimos 12 meses';
	@override String get byWeekday => 'Gasto por día de la semana';
	@override String get topCategories => 'En qué se gasta';
	@override String get topMerchants => 'Dónde se gasta';
	@override String get topIncomeSources => 'De dónde viene el dinero';
	@override String get transferIn => 'Transferencias recibidas';
	@override String get transferOut => 'Transferencias enviadas';
	@override String get closingBalance => 'Saldo al cierre';
	@override late final _Translations$accounts$detail$tabs$es tabs = _Translations$accounts$detail$tabs$es._(_root);
	@override String get counterparty => 'Contraparte';
	@override String get balanceAfter => 'Saldo';
	@override String get periodTotal => 'Total del filtro';
	@override String get notFound => 'No encontramos esta cuenta';
	@override String get notFoundHint => 'Puede que no sea una cuenta de activo o que se haya eliminado.';
}

// Path: bills.statuses
class _Translations$bills$statuses$es extends Translations$bills$statuses$en {
	_Translations$bills$statuses$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get paid => 'Pagada';
	@override String get pending => 'Pendiente';
	@override String get notExpected => 'No toca';
}

// Path: bills.freq
class _Translations$bills$freq$es extends Translations$bills$freq$en {
	_Translations$bills$freq$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get weekly => 'Semanal';
	@override String get monthly => 'Mensual';
	@override String get quarterly => 'Trimestral';
	@override String get halfYear => 'Semestral';
	@override String get yearly => 'Anual';
}

// Path: settings.mobile
class _Translations$settings$mobile$es extends Translations$settings$mobile$en {
	_Translations$settings$mobile$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get signedIn => 'Sesión iniciada';
	@override String get server => 'Servidor';
	@override String get serverUrl => 'URL del servidor';
	@override String get invalidUrl => 'Introduce una URL válida (https://…).';
	@override String get access => 'Cloudflare Access';
	@override String get accessHint => 'Solo si tu servidor está detrás de Cloudflare Access: un service token (client ID y secret).';
	@override String get clientId => 'Client ID';
	@override String get clientSecret => 'Client secret';
	@override String get save => 'Guardar';
	@override String get saved => 'Ajustes del servidor guardados';
	@override String get test => 'Probar conexión';
	@override String get testOk => 'Conexión correcta';
	@override String get testBlocked => 'Bloqueado por Cloudflare Access: revisa el service token.';
	@override String get testFailed => 'No se pudo contactar con el servidor.';
}

// Path: settings.exchange
class _Translations$settings$exchange$es extends Translations$settings$exchange$en {
	_Translations$settings$exchange$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get title => 'Tipos de cambio';
	@override String get hint => 'Las tasas que ingreses aquí se guardan en Firefly y se usan para convertir todos los montos: aplica la tasa más reciente en o antes de cada fecha.';
	@override String get currency => 'Moneda';
	@override String get date => 'Fecha';
	@override String get rate => 'Tasa';
	@override String rateHint({required Object currency, required Object primary}) => '1 ${currency} = cuántos ${primary}';
	@override String get add => 'Agregar tasa';
	@override String get replace => 'Reemplazar tasa';
	@override String get edit => 'Editar';
	@override String get none => 'Aún no hay tasas guardadas.';
	@override String get saved => 'Tasa guardada';
	@override String get deleted => 'Tasa eliminada';
	@override String get deleteTitle => 'Eliminar tasa';
	@override String deleteMessage({required Object currency, required Object date}) => '¿Eliminar la tasa de ${currency} del ${date}? Los montos se convertirán con la tasa anterior.';
	@override String get replacing => 'Este día ya tiene una tasa: al guardar se reemplaza.';
}

// Path: settings.sources
class _Translations$settings$sources$es extends Translations$settings$sources$en {
	_Translations$settings$sources$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get firefly => 'Firefly';
	@override String get fallback => 'Respaldo';
}

// Path: forms.errors
class _Translations$forms$errors$es extends Translations$forms$errors$en {
	_Translations$forms$errors$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get required => 'Este campo es obligatorio.';
	@override String get positive => 'Escribe un monto mayor que cero.';
	@override String get amount => 'Escribe un monto válido.';
	@override String get date => 'Elige una fecha válida.';
	@override String get time => 'Escribe una hora válida, como 18:30.';
	@override String get min => 'El valor es demasiado bajo.';
	@override String get max => 'El valor es demasiado alto.';
	@override String get minlength => 'Es demasiado corto.';
	@override String get maxlength => 'Es demasiado largo.';
	@override String get pattern => 'El formato no es válido.';
	@override String get email => 'Escribe un correo válido.';
	@override String get combination => 'Estas dos cuentas no se pueden combinar.';
	@override String get foreign => 'Escribe el monto recibido.';
	@override String get range => 'El monto máximo no puede ser menor que el mínimo.';
	@override String get endDate => 'La fecha de fin debe ser posterior a la de inicio.';
	@override String get day => 'Escribe un día entre 1 y 31.';
	@override String get accounts => 'Elige al menos una cuenta.';
	@override String get interest => 'Escribe un porcentaje válido.';
	@override String get invalid => 'El valor no es válido.';
}

// Path: forms.account
class _Translations$forms$account$es extends Translations$forms$account$en {
	_Translations$forms$account$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String newExpense({required Object name}) => 'Nueva cuenta de gastos: «${name}»';
	@override String newRevenue({required Object name}) => 'Nueva fuente de ingresos: «${name}»';
	@override String get incompatible => 'No compatible';
}

// Path: forms.accountGroups
class _Translations$forms$accountGroups$es extends Translations$forms$accountGroups$en {
	_Translations$forms$accountGroups$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get asset => 'Activos';
	@override String get liability => 'Pasivos';
	@override String get expense => 'Gastos';
	@override String get revenue => 'Ingresos';
	@override String get cash => 'Efectivo';
}

// Path: forms.txType
class _Translations$forms$txType$es extends Translations$forms$txType$en {
	_Translations$forms$txType$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get pending => 'Elige las cuentas';
	@override String get invalid => 'Combinación no válida';
}

// Path: forms.tags
class _Translations$forms$tags$es extends Translations$forms$tags$en {
	_Translations$forms$tags$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get placeholder => 'Añade una etiqueta';
	@override String add({required Object name}) => 'Añadir «${name}»';
	@override String remove({required Object tag}) => 'Quitar ${tag}';
}

// Path: forms.confirm
class _Translations$forms$confirm$es extends Translations$forms$confirm$en {
	_Translations$forms$confirm$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get ok => 'Confirmar';
	@override String typeToConfirm({required Object text}) => 'Escribe «${text}» para confirmar';
}

// Path: editor.tx
class _Translations$editor$tx$es extends Translations$editor$tx$en {
	_Translations$editor$tx$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get description => 'Se deduce solo si es un gasto, un ingreso o una transferencia según las cuentas que elijas.';
	@override String get what => 'Qué pasó';
	@override String get details => 'Detalles';
	@override String get descriptionLabel => 'Descripción';
	@override String get from => 'Desde';
	@override String get to => 'Hacia';
	@override String get swap => 'Intercambiar cuentas';
	@override String get accountPlaceholder => 'Busca o escribe una cuenta';
	@override String get amount => 'Monto';
	@override String received({required Object currency}) => 'Monto recibido (${currency})';
	@override String get date => 'Fecha';
	@override String get time => 'Hora (opcional)';
	@override String get otherCurrency => 'Se pagó en otra moneda';
	@override String get foreignCurrency => 'Moneda';
	@override String get foreignAmount => 'Monto en esa moneda';
	@override String get categoryPlaceholder => 'Elige o crea una categoría';
	@override String get bill => 'Suscripción';
	@override String get noBill => 'Sin suscripción';
	@override String get notes => 'Notas';
	@override String get rules => 'Se aplicarán tus reglas y webhooks de Firefly.';
	@override String get stay => 'Seguir aquí para crear otra';
	@override String get stayEdit => 'Seguir aquí después de guardar';
	@override String get reset => 'Restablecer formulario';
	@override String get created => 'Transacción creada';
	@override String get updated => 'Transacción actualizada';
	@override String get deleted => 'Transacción eliminada';
	@override String get deleteTitle => 'Eliminar transacción';
	@override String deleteMessage({required Object name}) => '¿Eliminar «${name}»? No se puede deshacer.';
	@override String deleteMessageSplits({required Object name}) => '«${name}» tiene varias partes: se eliminará la transacción completa. No se puede deshacer.';
	@override late final _Translations$editor$tx$notEditable$es notEditable = _Translations$editor$tx$notEditable$es._(_root);
	@override String get editInFirefly => 'Editar en Firefly';
	@override String get missing => 'Esa transacción no existe.';
	@override String get loadError => 'No se pudo cargar la transacción.';
	@override String get kNew => 'Nueva transacción';
	@override String get edit => 'Editar';
	@override String get actions => 'Acciones';
}

// Path: editor.fields
class _Translations$editor$fields$es extends Translations$editor$fields$en {
	_Translations$editor$fields$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get name => 'Nombre';
	@override String get notes => 'Notas';
	@override String get description => 'Descripción';
	@override String get active => 'Activo';
	@override String get currency => 'Moneda';
	@override String get group => 'Grupo';
}

// Path: editor.entity
class _Translations$editor$entity$es extends Translations$editor$entity$en {
	_Translations$editor$entity$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override late final _Translations$editor$entity$category$es category = _Translations$editor$entity$category$es._(_root);
	@override late final _Translations$editor$entity$tag$es tag = _Translations$editor$entity$tag$es._(_root);
	@override late final _Translations$editor$entity$budget$es budget = _Translations$editor$entity$budget$es._(_root);
	@override late final _Translations$editor$entity$bill$es bill = _Translations$editor$entity$bill$es._(_root);
	@override late final _Translations$editor$entity$account$es account = _Translations$editor$entity$account$es._(_root);
	@override late final _Translations$editor$entity$piggy$es piggy = _Translations$editor$entity$piggy$es._(_root);
}

// Path: editor.periods
class _Translations$editor$periods$es extends Translations$editor$periods$en {
	_Translations$editor$periods$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get daily => 'Diario';
	@override String get weekly => 'Semanal';
	@override String get monthly => 'Mensual';
	@override String get quarterly => 'Trimestral';
	@override String get halfYear => 'Semestral';
	@override String get yearly => 'Anual';
}

// Path: accounts.counterparty.descriptions
class _Translations$accounts$counterparty$descriptions$es extends Translations$accounts$counterparty$descriptions$en {
	_Translations$accounts$counterparty$descriptions$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get expense => 'A dónde va tu dinero: totales, frecuencia y tendencia por cuenta de gasto.';
	@override String get income => 'De dónde viene tu dinero: totales, frecuencia y tendencia por cuenta de ingreso.';
}

// Path: accounts.counterparty.calendar
class _Translations$accounts$counterparty$calendar$es extends Translations$accounts$counterparty$calendar$en {
	_Translations$accounts$counterparty$calendar$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get expense => 'Gastos por día';
	@override String get income => 'Ingresos por día';
}

// Path: accounts.counterparty.weekday
class _Translations$accounts$counterparty$weekday$es extends Translations$accounts$counterparty$weekday$en {
	_Translations$accounts$counterparty$weekday$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get expense => 'Gasto por día de la semana';
	@override String get income => 'Ingreso por día de la semana';
}

// Path: accounts.detail.tabs
class _Translations$accounts$detail$tabs$es extends Translations$accounts$detail$tabs$en {
	_Translations$accounts$detail$tabs$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get all => 'Transacciones';
	@override String get expenses => 'Gastos';
	@override String get income => 'Ganancias';
	@override String get transfers => 'Transferencias';
}

// Path: editor.tx.notEditable
class _Translations$editor$tx$notEditable$es extends Translations$editor$tx$notEditable$en {
	_Translations$editor$tx$notEditable$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get title => 'Esta transacción no se puede editar aquí';
	@override String get splits => 'Tiene varias partes. Edítala en Firefly para no perder ninguna.';
	@override String get type => 'Es de un tipo que SpaceFly no edita (saldo inicial, conciliación…).';
}

// Path: editor.entity.category
class _Translations$editor$entity$category$es extends Translations$editor$entity$category$en {
	_Translations$editor$entity$category$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get kNew => 'Nueva categoría';
	@override String get edit => 'Editar categoría';
	@override String get created => 'Categoría creada';
	@override String get updated => 'Categoría actualizada';
	@override String get deleted => 'Categoría eliminada';
	@override String get deleteTitle => 'Eliminar categoría';
	@override String deleteMessage({required Object name}) => '¿Eliminar la categoría «${name}»? Sus transacciones quedarán sin categoría.';
}

// Path: editor.entity.tag
class _Translations$editor$entity$tag$es extends Translations$editor$entity$tag$en {
	_Translations$editor$entity$tag$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get kNew => 'Nueva etiqueta';
	@override String get edit => 'Editar etiqueta';
	@override String get created => 'Etiqueta creada';
	@override String get updated => 'Etiqueta actualizada';
	@override String get deleted => 'Etiqueta eliminada';
	@override String get deleteTitle => 'Eliminar etiqueta';
	@override String deleteMessage({required Object name}) => '¿Eliminar la etiqueta «${name}»? Se quitará de todas sus transacciones.';
	@override String get date => 'Fecha';
	@override String get dateHint => 'Opcional: sirve para agrupar etiquetas por momento (un viaje, un evento).';
}

// Path: editor.entity.budget
class _Translations$editor$entity$budget$es extends Translations$editor$entity$budget$en {
	_Translations$editor$entity$budget$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get kNew => 'Nuevo presupuesto';
	@override String get edit => 'Editar presupuesto';
	@override String get created => 'Presupuesto creado';
	@override String get updated => 'Presupuesto actualizado';
	@override String get deleted => 'Presupuesto eliminado';
	@override String get deleteTitle => 'Eliminar presupuesto';
	@override String deleteMessage({required Object name}) => '¿Eliminar el presupuesto «${name}»? Sus transacciones quedarán sin presupuesto.';
	@override String get auto => 'Presupuesto automático';
	@override String get autoHint => 'Firefly le asigna el monto solo al empezar cada periodo.';
	@override String get autoType => 'Tipo';
	@override String get autoAmount => 'Monto por periodo';
	@override String get autoPeriod => 'Periodo';
	@override late final _Translations$editor$entity$budget$autoTypes$es autoTypes = _Translations$editor$entity$budget$autoTypes$es._(_root);
}

// Path: editor.entity.bill
class _Translations$editor$entity$bill$es extends Translations$editor$entity$bill$en {
	_Translations$editor$entity$bill$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get kNew => 'Nueva suscripción';
	@override String get edit => 'Editar suscripción';
	@override String get created => 'Suscripción creada';
	@override String get updated => 'Suscripción actualizada';
	@override String get deleted => 'Suscripción eliminada';
	@override String get deleteTitle => 'Eliminar suscripción';
	@override String deleteMessage({required Object name}) => '¿Eliminar la suscripción «${name}»? Sus transacciones se conservan, pero dejan de estar vinculadas.';
	@override String get fixed => 'Monto fijo';
	@override String get amount => 'Monto';
	@override String get amountMin => 'Monto mínimo';
	@override String get amountMax => 'Monto máximo';
	@override String get freq => 'Frecuencia';
	@override String get skip => 'Saltar periodos';
	@override String get skipHint => '0 = cada periodo; 1 = uno sí y uno no.';
	@override String get date => 'Primera fecha';
	@override String get endDate => 'Fecha de fin';
	@override String get endDateHint => 'Opcional: déjala vacía si no termina.';
}

// Path: editor.entity.account
class _Translations$editor$entity$account$es extends Translations$editor$entity$account$en {
	_Translations$editor$entity$account$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get kNew => 'Nueva cuenta';
	@override String get edit => 'Editar cuenta';
	@override String get created => 'Cuenta creada';
	@override String get updated => 'Cuenta actualizada';
	@override String get deleted => 'Cuenta eliminada';
	@override String get deleteTitle => 'Eliminar cuenta';
	@override String deleteMessage({required Object name}) => '¿Eliminar la cuenta «${name}»?';
	@override String deleteWarning({required Object count}) => 'Se eliminarán también sus ${count} transacciones. No se puede deshacer.';
	@override String get type => 'Tipo de cuenta';
	@override late final _Translations$editor$entity$account$types$es types = _Translations$editor$entity$account$types$es._(_root);
	@override String get typeLocked => 'El tipo no se puede cambiar después de crear la cuenta.';
	@override String get role => 'Uso';
	@override String get iban => 'IBAN';
	@override String get openingBalance => 'Saldo inicial';
	@override String get openingBalanceDate => 'Fecha del saldo inicial';
	@override String get includeNetWorth => 'Incluir en el patrimonio neto';
	@override String get cardType => 'Tipo de tarjeta';
	@override late final _Translations$editor$entity$account$cardTypes$es cardTypes = _Translations$editor$entity$account$cardTypes$es._(_root);
	@override String get paymentDay => 'Día de pago';
	@override String get liabilityType => 'Tipo de pasivo';
	@override late final _Translations$editor$entity$account$liabilityTypes$es liabilityTypes = _Translations$editor$entity$account$liabilityTypes$es._(_root);
	@override String get direction => 'Quién debe';
	@override late final _Translations$editor$entity$account$directions$es directions = _Translations$editor$entity$account$directions$es._(_root);
	@override String get interest => 'Interés (%)';
	@override String get interestPeriod => 'Periodo del interés';
	@override late final _Translations$editor$entity$account$interestPeriods$es interestPeriods = _Translations$editor$entity$account$interestPeriods$es._(_root);
	@override String get owed => 'Monto adeudado';
	@override String get startDate => 'Fecha de inicio';
}

// Path: editor.entity.piggy
class _Translations$editor$entity$piggy$es extends Translations$editor$entity$piggy$en {
	_Translations$editor$entity$piggy$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get kNew => 'Nueva meta';
	@override String get edit => 'Editar meta';
	@override String get created => 'Meta creada';
	@override String get updated => 'Meta actualizada';
	@override String get deleted => 'Meta eliminada';
	@override String get deleteTitle => 'Eliminar meta';
	@override String deleteMessage({required Object name}) => '¿Eliminar la meta «${name}»? El dinero apartado vuelve a estar libre en sus cuentas.';
	@override String get target => 'Monto de la meta';
	@override String get startDate => 'Fecha de inicio';
	@override String get targetDate => 'Fecha objetivo';
	@override String get accounts => 'Cuentas';
	@override String get addAccount => 'Añadir una cuenta…';
	@override String get none => 'Elige al menos una cuenta.';
	@override String get saved => 'Apartado';
	@override String get adjust => 'Ajustar';
	@override String get adjustLabel => 'Monto a sumar o restar';
	@override String get add => 'Sumar';
	@override String get subtract => 'Restar';
	@override String remove({required Object name}) => 'Quitar ${name}';
	@override String get adjustHint => 'Suma o resta dinero apartado en cada cuenta; se guarda al pulsar Guardar.';
}

// Path: editor.entity.budget.autoTypes
class _Translations$editor$entity$budget$autoTypes$es extends Translations$editor$entity$budget$autoTypes$en {
	_Translations$editor$entity$budget$autoTypes$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get reset => 'Reiniciar cada periodo';
	@override String get rollover => 'Acumular lo que sobre';
	@override String get adjusted => 'Ajustar según lo gastado';
}

// Path: editor.entity.account.types
class _Translations$editor$entity$account$types$es extends Translations$editor$entity$account$types$en {
	_Translations$editor$entity$account$types$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get asset => 'Activo';
	@override String get liability => 'Pasivo';
	@override String get expense => 'Gastos';
	@override String get revenue => 'Ingresos';
}

// Path: editor.entity.account.cardTypes
class _Translations$editor$entity$account$cardTypes$es extends Translations$editor$entity$account$cardTypes$en {
	_Translations$editor$entity$account$cardTypes$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get monthlyFull => 'Pago mensual completo';
}

// Path: editor.entity.account.liabilityTypes
class _Translations$editor$entity$account$liabilityTypes$es extends Translations$editor$entity$account$liabilityTypes$en {
	_Translations$editor$entity$account$liabilityTypes$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get loan => 'Préstamo';
	@override String get debt => 'Deuda';
	@override String get mortgage => 'Hipoteca';
}

// Path: editor.entity.account.directions
class _Translations$editor$entity$account$directions$es extends Translations$editor$entity$account$directions$en {
	_Translations$editor$entity$account$directions$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get debit => 'Yo debo';
	@override String get credit => 'Me deben';
}

// Path: editor.entity.account.interestPeriods
class _Translations$editor$entity$account$interestPeriods$es extends Translations$editor$entity$account$interestPeriods$en {
	_Translations$editor$entity$account$interestPeriods$es._(TranslationsEs root) : this._root = root, super.internal(root);

	final TranslationsEs _root; // ignore: unused_field

	// Translations
	@override String get daily => 'Diario';
	@override String get monthly => 'Mensual';
	@override String get yearly => 'Anual';
}

/// The flat map containing all translations for locale <es>.
/// Only for edge cases! For simple maps, use the map function of this library.
///
/// The Dart AOT compiler has issues with very large switch statements,
/// so the map is split into smaller functions (512 entries each).
extension on TranslationsEs {
	dynamic _flatMapFunction(String path) {
		return switch (path) {
			'lang.es' => 'Español',
			'lang.en' => 'English',
			'theme.midnight' => 'Medianoche',
			'theme.earth' => 'Tierra',
			'theme.dusk' => 'Atardecer',
			'common.income' => 'Ingresos',
			'common.expenses' => 'Gastos',
			'common.net' => 'Neto',
			'common.savingsRate' => 'Tasa de ahorro',
			'common.netWorth' => 'Patrimonio neto',
			'common.month' => 'Mes',
			'common.search' => 'Buscar…',
			'common.noResults' => 'Sin resultados',
			'common.date' => 'Fecha',
			'common.amount' => 'Monto',
			'common.total' => 'Total',
			'common.category' => 'Categoría',
			'common.budget' => 'Presupuesto',
			'common.account' => 'Cuenta',
			'common.tag' => 'Etiqueta',
			'common.uncategorized' => 'Sin categoría',
			'common.untagged' => 'Sin etiqueta',
			'common.noBudget' => 'Sin presupuesto',
			'common.others' => 'Otros',
			'common.noData' => 'No hay datos para este periodo',
			'common.viewAll' => 'Ver todo',
			'nav.menu' => 'Menú',
			'nav.readOnly' => 'reportes y captura',
			'nav.toggle' => 'Mostrar u ocultar menú',
			'nav.skipToContent' => 'Saltar al contenido',
			'nav.breadcrumb' => 'Ruta de navegación',
			'nav.sections.general' => 'General',
			'nav.sections.reports' => 'Reportes',
			'nav.sections.analysis' => 'Análisis',
			'nav.sections.accounts' => 'Cuentas',
			'nav.sections.planning' => 'Planificación',
			'nav.sections.transactions' => 'Transacciones',
			'nav.sections.create' => 'Crear',
			'nav.sections.system' => 'Sistema',
			'nav.dashboard' => 'Dashboard',
			'nav.monthly' => 'Resumen mensual',
			'nav.annual' => 'Reporte anual',
			'nav.flow' => 'Flujo de dinero',
			'nav.calendar' => 'Calendario',
			'nav.compare' => 'Comparaciones',
			'nav.categories' => 'Categorías',
			'nav.tags' => 'Etiquetas',
			'nav.budgets' => 'Presupuestos',
			'nav.merchants' => 'Comercios',
			'nav.incomeSources' => 'Fuentes de ingreso',
			'nav.assetAccounts' => 'Cuentas de activo',
			'nav.expenseAccounts' => 'Cuentas de gasto',
			'nav.revenueAccounts' => 'Cuentas de ingreso',
			'nav.accountDetail' => 'Detalle de cuenta',
			'nav.netWorth' => 'Patrimonio neto',
			'nav.savings' => 'Ahorros',
			'nav.bills' => 'Suscripciones',
			'nav.recurring' => 'Recurrentes',
			'nav.goals' => 'Metas',
			'nav.projection' => 'Proyección de flujo',
			'nav.explorer' => 'Explorador',
			'nav.newTransaction' => 'Nueva transacción',
			'nav.editTransaction' => 'Editar transacción',
			'nav.more' => 'Más',
			'nav.settings' => 'Ajustes',
			'nav.about' => 'Acerca de',
			'topbar.refresh' => 'Refrescar datos',
			'topbar.refreshed' => 'Datos actualizados desde Firefly',
			'topbar.language' => 'Idioma',
			'topbar.theme' => 'Tema',
			'topbar.hideAmounts' => 'Ocultar montos',
			'topbar.showAmounts' => 'Mostrar montos',
			'topbar.account' => 'Cuenta de usuario',
			'topbar.openFirefly' => 'Abrir Firefly III',
			'topbar.logout' => 'Cerrar sesión',
			'login.subtitle' => 'Reportes interactivos para tu Firefly III',
			'login.button' => 'Iniciar sesión con Firefly',
			'login.readOnly' => 'SpaceFly lee tus datos de Firefly III y te deja registrarlos y editarlos. Tu token nunca llega al navegador.',
			'login.errors.invalidState' => 'La sesión de inicio expiró o no es válida. Inténtalo de nuevo.',
			'login.errors.tokenExchange' => 'Firefly rechazó el inicio de sesión. Revisa el cliente OAuth.',
			'login.errors.accessDenied' => 'Se canceló la autorización en Firefly.',
			'login.errors.cfAccess' => 'Cloudflare Access bloqueó la app. Revisa el service token (Client ID y secret).',
			'login.errors.generic' => 'No se pudo iniciar sesión.',
			'errors.load' => 'No se pudieron cargar los datos',
			'errors.generic' => 'Algo salió mal. Inténtalo de nuevo.',
			'errors.version' => ({required Object version, required Object min}) => 'Tu Firefly III es ${version}; SpaceFly requiere ${min} o superior. Algunos datos pueden ser incorrectos.',
			'period.previous' => 'Periodo anterior',
			'period.next' => 'Periodo siguiente',
			'period.custom' => 'Rango personalizado',
			'period.from' => 'Desde',
			'period.to' => 'Hasta',
			'period.apply' => 'Aplicar',
			'period.quarterShort' => 'T',
			'period.ytdShort' => 'En el año',
			'period.presets.thisMonth' => 'Este mes',
			'period.presets.lastMonth' => 'Mes anterior',
			'period.presets.last30' => 'Últimos 30 días',
			'period.presets.last6m' => 'Últimos 6 meses',
			'period.presets.thisQuarter' => 'Este trimestre',
			'period.presets.thisYear' => 'Este año',
			'period.presets.lastYear' => 'Año anterior',
			'period.presets.ytd' => 'Año hasta la fecha',
			'currency.label' => 'Moneda de visualización',
			'kpi.vsPrevious' => 'Anterior:',
			'chart.showTable' => 'Ver como tabla',
			'chart.showChart' => 'Ver gráfico',
			'chart.download' => 'Descargar PNG',
			'chart.shareCsv' => 'Compartir como CSV',
			'tx.none' => 'No hay transacciones',
			'tx.count' => 'Transacciones',
			'tx.breakdown' => 'Categorías que lo componen',
			'tx.openInFirefly' => 'Abrir en Firefly',
			'txType.withdrawal' => 'Gasto',
			'txType.deposit' => 'Ingreso',
			'txType.transfer' => 'Transferencia',
			'txType.openingBalance' => 'Saldo inicial',
			'txType.reconciliation' => 'Conciliación',
			'txType.liabilityCredit' => 'Crédito de pasivo',
			'dashboard.description' => 'Tu situación financiera de un vistazo.',
			'dashboard.incomeVsExpense' => 'Ingresos vs gastos',
			'dashboard.last12' => 'Últimos 12 meses',
			'dashboard.topCategories' => 'Principales categorías de gasto',
			'dashboard.upcomingBills' => 'Próximas suscripciones',
			'dashboard.noUpcoming' => 'Nada programado en los próximos 30 días',
			'dashboard.largest' => 'Gastos más grandes',
			'monthly.description' => 'El reporte del email, interactivo y para cualquier periodo.',
			'monthly.earned' => 'Ingresado',
			'monthly.spent' => 'Gastado',
			'monthly.netChange' => 'Cambio neto',
			'monthly.categories' => 'Resumen por categoría',
			'monthly.vsPrevious' => ({required Object month}) => 'vs ${month}',
			'monthly.kNew' => 'Nuevo',
			'monthly.moneyFlow' => 'Flujo de dinero',
			'monthly.openInteractive' => 'Abrir interactivo',
			'monthly.dailyCashFlow' => 'Flujo diario',
			'monthly.budgets' => 'Resumen de presupuestos',
			'monthly.top5' => 'Los 5 gastos más grandes',
			'monthly.assetActivity' => 'Actividad por cuenta de activo',
			'monthly.topIncome' => 'Principales ingresos',
			'monthly.topExpenses' => 'Principales gastos',
			'monthly.savings' => ({required Object n}) => 'Cuentas de ahorro – saldo (últimos ${n} meses)',
			'monthly.overview' => 'Resumen financiero',
			'monthly.thisPeriod' => 'Este periodo',
			'monthly.ytd' => 'Año hasta la fecha',
			'monthly.currentNetWorth' => 'Patrimonio neto actual',
			'budget.description' => 'Límite vs gastado, ritmo de gasto y cumplimiento histórico.',
			'budget.limit' => 'Límite',
			'budget.spent' => 'Gastado',
			'budget.remaining' => 'Restante',
			'budget.none' => 'No hay presupuestos con actividad en este periodo',
			'budget.expectedPace' => 'Ritmo esperado a la fecha',
			'budget.status.good' => 'En rango',
			'budget.status.warning' => 'Cerca del límite',
			'budget.status.critical' => 'Excedido',
			'budget.auto.reset' => 'Auto · reinicio',
			'budget.auto.rollover' => 'Auto · acumulativo',
			'budget.auto.adjusted' => 'Auto · ajustado',
			'budget.totalLimit' => 'Límite total',
			'budget.spentInBudgets' => 'Gastado en presupuestos',
			'budget.unbudgeted' => 'Fuera de presupuesto',
			'budget.available' => 'Disponible para presupuestar',
			'budget.projection' => 'Proyección al cierre:',
			'budget.overBy' => ({required Object amount}) => 'excede por ${amount}',
			'budget.history' => ({required Object name}) => '${name} · últimos 12 meses',
			'budget.byCategory' => ({required Object name}) => '${name} por categoría',
			'sankey.totalIncome' => 'Ingreso total',
			'sankey.savings' => 'Ahorro',
			'sankey.netSavings' => 'Ahorro neto',
			'sankey.deficit' => 'Déficit',
			'sankey.othersExpense' => 'Otros gastos',
			'sankey.othersIncome' => 'Otras fuentes',
			'sankey.othersTags' => 'Otras etiquetas',
			'sankey.kinds.revenue' => 'Fuente de ingreso',
			'sankey.kinds.incomeCat' => 'Categoría de ingreso',
			'sankey.kinds.hub' => 'Total',
			'sankey.kinds.budget' => 'Presupuesto',
			'sankey.kinds.tag' => 'Etiqueta',
			'sankey.kinds.category' => 'Categoría de gasto',
			'sankey.kinds.savings' => 'Ahorro',
			'sankey.kinds.deficit' => 'Déficit',
			'sankey.kinds.other' => 'Otros',
			'flow.title' => 'Flujo de dinero',
			'flow.description' => 'De dónde viene tu dinero y a dónde va.',
			'flow.hint' => 'Pasa el cursor para resaltar una ruta · clic en un nodo para ver sus transacciones · arrastra para reordenar',
			'flow.hintTouch' => 'Toca un nodo para ver sus transacciones · desliza de lado si el gráfico es ancho',
			'flow.byBudget' => 'Por presupuesto',
			'flow.byTags' => 'Por etiquetas',
			'flow.showBudgets' => 'Presupuestos',
			'flow.showIncomeCategories' => 'Categorías de ingreso',
			'flow.groupSmall' => 'Agrupar flujos menores a',
			'flow.from' => 'Desde',
			'flow.to' => 'Hacia',
			'flow.shareOfIncome' => '% del ingreso',
			'calendar.title' => 'Calendario de ingresos y gastos',
			'calendar.description' => 'Ingresos y gastos día a día, con lo programado.',
			'calendar.month' => 'Mes',
			'calendar.year' => 'Año',
			'calendar.allAccounts' => 'Todas las cuentas',
			'calendar.allCategories' => 'Todas las categorías',
			'calendar.allTags' => 'Todas las etiquetas',
			'calendar.endBalance' => 'Saldo al cierre',
			'calendar.clickDay' => 'Clic en un día para ver sus transacciones',
			'calendar.runningBalance' => 'Saldo acumulado',
			'calendar.balance' => 'Saldo',
			'calendar.noBalance' => 'El saldo acumulado no aplica con filtros de categoría o etiqueta',
			'calendar.scheduled' => 'Programado este mes',
			'calendar.noScheduled' => 'Nada programado',
			'calendar.bill' => 'Suscripción',
			'calendar.recurrence' => 'Recurrente',
			'calendar.heatmapTitle' => ({required Object year}) => 'Intensidad de gasto ${year}',
			'calendar.heatmapHint' => 'Cada celda es un día; más oscuro = más gasto',
			'compare.description' => 'Compara dos periodos por categoría, etiqueta, presupuesto, cuenta o comercio.',
			'compare.previous' => 'vs periodo anterior',
			'compare.yoy' => 'vs año anterior',
			'compare.custom' => 'Rango libre',
			'compare.groupBy' => 'Agrupar por',
			'compare.deltaTitle' => 'Mayores cambios (A − B)',
			'compare.deltaHintExpense' => 'Rojo = gastaste más · azul = gastaste menos',
			'compare.deltaHintIncome' => 'Azul = ingresaste más · rojo = ingresaste menos',
			'compare.trend' => 'Tendencia de 12 meses',
			'compare.groups.category' => 'Categoría',
			'compare.groups.tag' => 'Etiqueta',
			'compare.groups.budget' => 'Presupuesto',
			'compare.groups.account' => 'Cuenta',
			'compare.groups.counterparty' => 'Comercio / fuente',
			'annual.title' => ({required Object year}) => 'Reporte anual ${year}',
			'annual.description' => 'El año mes a mes: totales, mejor y peor mes, y categorías.',
			'annual.avgIncome' => 'Ingreso promedio mensual',
			'annual.avgExpense' => 'Gasto promedio mensual',
			'annual.best' => 'Mejor mes',
			'annual.worst' => 'Peor mes',
			'annual.byMonth' => 'Ingresos y gastos por mes',
			'annual.savingsRate' => 'Tasa de ahorro mensual',
			'annual.matrix' => 'Gasto por categoría y mes',
			'annual.matrixHint' => 'Las 15 categorías principales; clic en una celda para ver transacciones',
			'ranking.descriptions.categories' => 'Ranking, distribución y tendencia por categoría.',
			'ranking.descriptions.tags' => 'Ranking, distribución y tendencia por etiqueta.',
			'ranking.descriptions.merchants' => 'A quién le pagas más: frecuencia, ticket promedio y tendencia.',
			'ranking.descriptions.incomeSources' => 'De dónde vienen tus ingresos.',
			'ranking.items' => 'Elementos',
			'ranking.transactions' => 'Transacciones',
			'ranking.avgTicket' => 'Ticket promedio',
			'ranking.distribution' => 'Distribución',
			'ranking.trend' => 'Tendencia',
			'ranking.trendHint' => 'Principales elementos, últimos 12 meses',
			'ranking.name' => 'Nombre',
			'ranking.share' => '% del total',
			'ranking.count' => 'Cant.',
			'ranking.previous' => 'Periodo anterior',
			'ranking.views.bars' => 'Barras',
			'ranking.views.treemap' => 'Mapa',
			'ranking.views.sunburst' => 'Presupuestos',
			'accounts.description' => 'Saldos actuales y su evolución.',
			'accounts.history' => 'Meses de historial',
			'accounts.monthsShort' => 'm',
			'accounts.total' => 'Total en cuentas',
			'accounts.balanceOriginal' => 'Saldo (moneda original)',
			'accounts.balance' => 'Saldo',
			'accounts.balanceHistory' => 'Evolución de saldos',
			'accounts.excluded' => 'Excluida',
			'accounts.roles.defaultAsset' => 'Principal',
			'accounts.roles.sharedAsset' => 'Compartida',
			'accounts.roles.savingAsset' => 'Ahorro',
			'accounts.roles.ccAsset' => 'Tarjeta de crédito',
			'accounts.roles.cashWalletAsset' => 'Efectivo',
			'accounts.reorder.start' => 'Reordenar',
			'accounts.reorder.done' => 'Listo',
			'accounts.reorder.reset' => 'Restablecer orden',
			'accounts.reorder.hint' => 'Arrastra las filas o usa las flechas. El orden se guarda solo.',
			'accounts.reorder.up' => ({required Object name}) => 'Subir ${name}',
			'accounts.reorder.down' => ({required Object name}) => 'Bajar ${name}',
			'accounts.counterparty.descriptions.expense' => 'A dónde va tu dinero: totales, frecuencia y tendencia por cuenta de gasto.',
			'accounts.counterparty.descriptions.income' => 'De dónde viene tu dinero: totales, frecuencia y tendencia por cuenta de ingreso.',
			'accounts.counterparty.showEmpty' => 'Mostrar sin actividad',
			'accounts.counterparty.lastActivity' => 'Última actividad',
			'accounts.counterparty.monthly' => 'Últimos 12 meses',
			'accounts.counterparty.topAccounts' => 'Cuentas con más movimiento',
			'accounts.counterparty.activeAccounts' => 'Cuentas con actividad',
			'accounts.counterparty.never' => 'Sin actividad reciente',
			'accounts.counterparty.share' => '% del total',
			'accounts.counterparty.notFoundHint' => 'Puede que no sea una cuenta de este tipo o que se haya eliminado.',
			'accounts.counterparty.calendar.expense' => 'Gastos por día',
			'accounts.counterparty.calendar.income' => 'Ingresos por día',
			'accounts.counterparty.weekday.expense' => 'Gasto por día de la semana',
			'accounts.counterparty.weekday.income' => 'Ingreso por día de la semana',
			'accounts.counterparty.paidFrom' => 'Pagado desde',
			'accounts.counterparty.receivedIn' => 'Recibido en',
			'accounts.counterparty.byCategory' => 'Por categoría',
			'accounts.counterparty.biggest' => 'Mayor transacción',
			'accounts.counterparty.lastTransaction' => 'Última transacción',
			'accounts.counterparty.monthlyAverage' => 'Promedio mensual (12 meses)',
			'accounts.counterparty.total12' => 'Total de 12 meses',
			'accounts.counterparty.fromAccount' => 'Cuenta',
			'accounts.detail.back' => 'Volver a cuentas',
			'accounts.detail.closing' => 'Saldo final',
			'accounts.detail.opening' => 'Saldo inicial',
			'accounts.detail.change' => 'Variación',
			'accounts.detail.lowest' => 'Saldo más bajo',
			'accounts.detail.highest' => 'Saldo más alto',
			'accounts.detail.avgDailyExpense' => 'Gasto diario promedio',
			'accounts.detail.biggestExpense' => 'Mayor gasto',
			'accounts.detail.biggestIncome' => 'Mayor ingreso',
			'accounts.detail.netTransfers' => 'Transferencias netas',
			'accounts.detail.records' => 'Registros',
			'accounts.detail.stats' => 'Resumen del periodo',
			'accounts.detail.dailyBalance' => 'Saldo por día',
			'accounts.detail.dailyFlow' => 'Ingresos y gastos por día',
			'accounts.detail.zoomHint' => 'Usa la rueda o arrastra para acercar',
			'accounts.detail.monthly' => 'Últimos 12 meses',
			'accounts.detail.byWeekday' => 'Gasto por día de la semana',
			'accounts.detail.topCategories' => 'En qué se gasta',
			'accounts.detail.topMerchants' => 'Dónde se gasta',
			'accounts.detail.topIncomeSources' => 'De dónde viene el dinero',
			'accounts.detail.transferIn' => 'Transferencias recibidas',
			'accounts.detail.transferOut' => 'Transferencias enviadas',
			'accounts.detail.closingBalance' => 'Saldo al cierre',
			'accounts.detail.tabs.all' => 'Transacciones',
			'accounts.detail.tabs.expenses' => 'Gastos',
			'accounts.detail.tabs.income' => 'Ganancias',
			'accounts.detail.tabs.transfers' => 'Transferencias',
			'accounts.detail.counterparty' => 'Contraparte',
			'accounts.detail.balanceAfter' => 'Saldo',
			'accounts.detail.periodTotal' => 'Total del filtro',
			'accounts.detail.notFound' => 'No encontramos esta cuenta',
			'accounts.detail.notFoundHint' => 'Puede que no sea una cuenta de activo o que se haya eliminado.',
			'netWorth.description' => 'Tu patrimonio neto en el tiempo.',
			'netWorth.current' => 'Patrimonio actual',
			'netWorth.change' => ({required Object n}) => 'Cambio en ${n} meses',
			'netWorth.total' => 'Patrimonio neto total',
			'netWorth.byAccount' => 'Por cuenta',
			'netWorth.stackedHint' => 'Área apilada de saldos positivos',
			'savings.description' => 'Saldo de tus cuentas de ahorro (sin tarjetas de crédito ni cuentas excluidas).',
			'savings.total' => 'Total ahorrado',
			'savings.accounts' => 'Cuentas',
			'savings.perAccount' => 'Evolución por cuenta',
			'savings.manageExcluded' => 'Cuentas excluidas',
			'bills.description' => 'Costo, próximas fechas y pagos de tus suscripciones.',
			'bills.monthly' => 'Costo mensual equivalente',
			'bills.yearly' => 'Costo anual',
			'bills.paid' => 'Pagadas en el periodo',
			'bills.pendingAmount' => ({required Object n}) => 'Pendientes (${n})',
			'bills.name' => 'Suscripción',
			'bills.status' => 'Estado',
			'bills.next' => 'Próxima',
			'bills.range' => 'Rango esperado',
			'bills.monthlyEq' => 'Mensual eq.',
			'bills.paidThisPeriod' => 'Pagos del periodo',
			'bills.outOfRange' => 'Fuera de rango',
			'bills.skip' => ({required Object n}) => 'cada ${n}',
			'bills.none' => 'No tienes suscripciones en Firefly',
			'bills.costRanking' => 'Costo anual por suscripción',
			'bills.costRankingHint' => 'Solo suscripciones activas',
			'bills.last12Months' => 'Últimos 12 meses',
			'bills.selectedPeriod' => 'Período seleccionado',
			'bills.statuses.paid' => 'Pagada',
			'bills.statuses.pending' => 'Pendiente',
			'bills.statuses.notExpected' => 'No toca',
			'bills.freq.weekly' => 'Semanal',
			'bills.freq.monthly' => 'Mensual',
			'bills.freq.quarterly' => 'Trimestral',
			'bills.freq.halfYear' => 'Semestral',
			'bills.freq.yearly' => 'Anual',
			'recurring.description' => 'Transacciones recurrentes configuradas en Firefly y sus próximas fechas.',
			'recurring.list' => 'Recurrentes',
			'recurring.next' => 'Próximas fechas',
			'recurring.until' => ({required Object date}) => 'Hasta ${date}',
			'recurring.inactive' => 'Inactiva',
			'recurring.none' => 'No tienes transacciones recurrentes',
			'goals.description' => 'Tus huchas (piggy banks): progreso y fecha estimada según tu ritmo de aportes.',
			'goals.saved' => 'Total ahorrado',
			'goals.target' => 'Meta total',
			'goals.current' => 'Ahorrado',
			'goals.goal' => 'Meta',
			'goals.pace' => 'Ritmo (6 meses)',
			'goals.month' => 'mes',
			'goals.left' => 'Falta',
			'goals.targetDate' => 'Fecha meta',
			'goals.estimated' => 'Estimada',
			'goals.noPace' => 'sin aportes recientes',
			'goals.onTrack' => 'A tiempo',
			'goals.behind' => 'Atrasada',
			'goals.none' => 'No tienes metas en Firefly',
			'projection.description' => 'Saldo actual + recurrentes + suscripciones programadas.',
			'projection.daysShort' => 'd',
			'projection.today' => 'Saldo hoy',
			'projection.kIn' => ({required Object n}) => 'En ${n} días',
			'projection.chart' => 'Saldo proyectado',
			'projection.lowest' => ({required Object amount, required Object date}) => 'Punto más bajo: ${amount} el ${date}',
			'projection.events' => 'Movimientos programados',
			'projection.noEvents' => 'Nada programado en este horizonte',
			'projection.inflow' => 'Entradas',
			'projection.outflow' => 'Salidas',
			'explorer.allTypes' => 'Todos',
			'explorer.description' => 'Busca, filtra, ordena y exporta tus transacciones.',
			'explorer.search' => 'Buscar',
			'explorer.clear' => 'Limpiar',
			'explorer.searchPlaceholder' => 'Descripción, cuenta o nota…  (o sintaxis de Firefly: amount_more:500 category_is:Comida)',
			'explorer.fireflySyntax' => 'Buscar en todo Firefly (sintaxis de Firefly)',
			'explorer.fireflySyntaxHint' => 'Usa el buscador de Firefly en todas tus transacciones, sin limitarse al periodo',
			'explorer.allBudgets' => 'Todos los presupuestos',
			'explorer.results' => ({required Object n}) => '${n} resultados',
			'explorer.descriptionCol' => 'Descripción',
			'explorer.export' => 'Exportar CSV',
			'explorer.exportHidden' => 'La exportación está desactivada mientras los montos están ocultos',
			'explorer.page' => ({required Object page, required Object pages}) => 'Página ${page} de ${pages}',
			'explorer.loadMore' => 'Mostrar más',
			'settings.mobile.signedIn' => 'Sesión iniciada',
			'settings.mobile.server' => 'Servidor',
			'settings.mobile.serverUrl' => 'URL del servidor',
			'settings.mobile.invalidUrl' => 'Introduce una URL válida (https://…).',
			'settings.mobile.access' => 'Cloudflare Access',
			'settings.mobile.accessHint' => 'Solo si tu servidor está detrás de Cloudflare Access: un service token (client ID y secret).',
			'settings.mobile.clientId' => 'Client ID',
			'settings.mobile.clientSecret' => 'Client secret',
			'settings.mobile.save' => 'Guardar',
			'settings.mobile.saved' => 'Ajustes del servidor guardados',
			'settings.mobile.test' => 'Probar conexión',
			'settings.mobile.testOk' => 'Conexión correcta',
			'settings.mobile.testBlocked' => 'Bloqueado por Cloudflare Access: revisa el service token.',
			'settings.mobile.testFailed' => 'No se pudo contactar con el servidor.',
			'settings.description' => 'Preferencias de SpaceFly (se guardan en SpaceFly, nunca en Firefly).',
			'settings.save' => 'Guardar',
			'settings.saved' => 'Ajustes guardados',
			'settings.excluded' => 'Cuentas excluidas',
			'settings.excludedHint' => 'Se ocultan de ahorros, patrimonio y proyección (equivale a exclude_accounts del script).',
			'settings.preferences' => 'Preferencias',
			'settings.balanceMonths' => 'Meses de historial de saldos por defecto',
			'settings.sankeyThreshold' => 'Umbral de "Otros" en el Sankey',
			'settings.exchange.title' => 'Tipos de cambio',
			'settings.exchange.hint' => 'Las tasas que ingreses aquí se guardan en Firefly y se usan para convertir todos los montos: aplica la tasa más reciente en o antes de cada fecha.',
			'settings.exchange.currency' => 'Moneda',
			'settings.exchange.date' => 'Fecha',
			'settings.exchange.rate' => 'Tasa',
			'settings.exchange.rateHint' => ({required Object currency, required Object primary}) => '1 ${currency} = cuántos ${primary}',
			'settings.exchange.add' => 'Agregar tasa',
			'settings.exchange.replace' => 'Reemplazar tasa',
			'settings.exchange.edit' => 'Editar',
			'settings.exchange.none' => 'Aún no hay tasas guardadas.',
			'settings.exchange.saved' => 'Tasa guardada',
			'settings.exchange.deleted' => 'Tasa eliminada',
			'settings.exchange.deleteTitle' => 'Eliminar tasa',
			'settings.exchange.deleteMessage' => ({required Object currency, required Object date}) => '¿Eliminar la tasa de ${currency} del ${date}? Los montos se convertirán con la tasa anterior.',
			'settings.exchange.replacing' => 'Este día ya tiene una tasa: al guardar se reemplaza.',
			'settings.rates' => 'Tasas en uso',
			'settings.ratesHint' => 'La tasa más reciente guardada en Firefly en o antes de cada fecha; si no hay, se usa open.er-api.com.',
			'settings.pair' => 'Par',
			'settings.rate' => 'Tasa',
			'settings.source' => 'Origen',
			'settings.sources.firefly' => 'Firefly',
			'settings.sources.fallback' => 'Respaldo',
			'about.version' => 'Versión',
			'about.supported' => ({required Object min}) => 'Compatible (≥ ${min})',
			'about.unsupported' => ({required Object min}) => 'No compatible (< ${min})',
			'about.primary' => 'Moneda primaria',
			'about.user' => 'Usuario',
			'about.instance' => 'Instancia',
			'about.body' => 'SpaceFly lee y escribe en Firefly III a través de su servidor, que además protege las escrituras contra peticiones de otros sitios. Tu token nunca llega al navegador.',
			'forms.createOption' => ({required Object name}) => 'Crear «${name}»',
			'forms.moreResults' => ({required Object count}) => '${count} más; escribe para buscar',
			'forms.today' => 'Hoy',
			'forms.now' => 'Ahora',
			'forms.pickDate' => 'Elige una fecha',
			'forms.pickTime' => 'Elige una hora',
			'forms.hour' => 'Hora',
			'forms.minute' => 'Minuto',
			'forms.clear' => 'Quitar',
			'forms.ok' => 'Aceptar',
			'forms.previousMonth' => 'Mes anterior',
			'forms.nextMonth' => 'Mes siguiente',
			'forms.yesterday' => 'Ayer',
			'forms.save' => 'Guardar',
			'forms.saving' => 'Guardando…',
			'forms.cancel' => 'Cancelar',
			'forms.delete' => 'Eliminar',
			'forms.errors.required' => 'Este campo es obligatorio.',
			'forms.errors.positive' => 'Escribe un monto mayor que cero.',
			'forms.errors.amount' => 'Escribe un monto válido.',
			'forms.errors.date' => 'Elige una fecha válida.',
			'forms.errors.time' => 'Escribe una hora válida, como 18:30.',
			'forms.errors.min' => 'El valor es demasiado bajo.',
			'forms.errors.max' => 'El valor es demasiado alto.',
			'forms.errors.minlength' => 'Es demasiado corto.',
			'forms.errors.maxlength' => 'Es demasiado largo.',
			'forms.errors.pattern' => 'El formato no es válido.',
			'forms.errors.email' => 'Escribe un correo válido.',
			'forms.errors.combination' => 'Estas dos cuentas no se pueden combinar.',
			'forms.errors.foreign' => 'Escribe el monto recibido.',
			'forms.errors.range' => 'El monto máximo no puede ser menor que el mínimo.',
			'forms.errors.endDate' => 'La fecha de fin debe ser posterior a la de inicio.',
			'forms.errors.day' => 'Escribe un día entre 1 y 31.',
			'forms.errors.accounts' => 'Elige al menos una cuenta.',
			'forms.errors.interest' => 'Escribe un porcentaje válido.',
			'forms.errors.invalid' => 'El valor no es válido.',
			'forms.account.newExpense' => ({required Object name}) => 'Nueva cuenta de gastos: «${name}»',
			'forms.account.newRevenue' => ({required Object name}) => 'Nueva fuente de ingresos: «${name}»',
			'forms.account.incompatible' => 'No compatible',
			'forms.accountGroups.asset' => 'Activos',
			'forms.accountGroups.liability' => 'Pasivos',
			'forms.accountGroups.expense' => 'Gastos',
			'forms.accountGroups.revenue' => 'Ingresos',
			'forms.accountGroups.cash' => 'Efectivo',
			'forms.txType.pending' => 'Elige las cuentas',
			'forms.txType.invalid' => 'Combinación no válida',
			'forms.tags.placeholder' => 'Añade una etiqueta',
			'forms.tags.add' => ({required Object name}) => 'Añadir «${name}»',
			'forms.tags.remove' => ({required Object tag}) => 'Quitar ${tag}',
			'forms.confirm.ok' => 'Confirmar',
			'forms.confirm.typeToConfirm' => ({required Object text}) => 'Escribe «${text}» para confirmar',
			'editor.back' => 'Volver',
			'editor.retry' => 'Reintentar',
			'editor.networkError' => 'No se pudo contactar con el servidor. Revisa tu conexión: es posible que el cambio no se haya guardado.',
			'editor.kNew' => 'Nuevo',
			_ => null,
		} ?? switch (path) {
			'editor.newTitle' => 'Crear',
			'editor.tx.description' => 'Se deduce solo si es un gasto, un ingreso o una transferencia según las cuentas que elijas.',
			'editor.tx.what' => 'Qué pasó',
			'editor.tx.details' => 'Detalles',
			'editor.tx.descriptionLabel' => 'Descripción',
			'editor.tx.from' => 'Desde',
			'editor.tx.to' => 'Hacia',
			'editor.tx.swap' => 'Intercambiar cuentas',
			'editor.tx.accountPlaceholder' => 'Busca o escribe una cuenta',
			'editor.tx.amount' => 'Monto',
			'editor.tx.received' => ({required Object currency}) => 'Monto recibido (${currency})',
			'editor.tx.date' => 'Fecha',
			'editor.tx.time' => 'Hora (opcional)',
			'editor.tx.otherCurrency' => 'Se pagó en otra moneda',
			'editor.tx.foreignCurrency' => 'Moneda',
			'editor.tx.foreignAmount' => 'Monto en esa moneda',
			'editor.tx.categoryPlaceholder' => 'Elige o crea una categoría',
			'editor.tx.bill' => 'Suscripción',
			'editor.tx.noBill' => 'Sin suscripción',
			'editor.tx.notes' => 'Notas',
			'editor.tx.rules' => 'Se aplicarán tus reglas y webhooks de Firefly.',
			'editor.tx.stay' => 'Seguir aquí para crear otra',
			'editor.tx.stayEdit' => 'Seguir aquí después de guardar',
			'editor.tx.reset' => 'Restablecer formulario',
			'editor.tx.created' => 'Transacción creada',
			'editor.tx.updated' => 'Transacción actualizada',
			'editor.tx.deleted' => 'Transacción eliminada',
			'editor.tx.deleteTitle' => 'Eliminar transacción',
			'editor.tx.deleteMessage' => ({required Object name}) => '¿Eliminar «${name}»? No se puede deshacer.',
			'editor.tx.deleteMessageSplits' => ({required Object name}) => '«${name}» tiene varias partes: se eliminará la transacción completa. No se puede deshacer.',
			'editor.tx.notEditable.title' => 'Esta transacción no se puede editar aquí',
			'editor.tx.notEditable.splits' => 'Tiene varias partes. Edítala en Firefly para no perder ninguna.',
			'editor.tx.notEditable.type' => 'Es de un tipo que SpaceFly no edita (saldo inicial, conciliación…).',
			'editor.tx.editInFirefly' => 'Editar en Firefly',
			'editor.tx.missing' => 'Esa transacción no existe.',
			'editor.tx.loadError' => 'No se pudo cargar la transacción.',
			'editor.tx.kNew' => 'Nueva transacción',
			'editor.tx.edit' => 'Editar',
			'editor.tx.actions' => 'Acciones',
			'editor.missing' => 'Ese registro ya no existe.',
			'editor.loadError' => 'No se pudo cargar el registro.',
			'editor.clear' => 'Quitar',
			'editor.fields.name' => 'Nombre',
			'editor.fields.notes' => 'Notas',
			'editor.fields.description' => 'Descripción',
			'editor.fields.active' => 'Activo',
			'editor.fields.currency' => 'Moneda',
			'editor.fields.group' => 'Grupo',
			'editor.entity.category.kNew' => 'Nueva categoría',
			'editor.entity.category.edit' => 'Editar categoría',
			'editor.entity.category.created' => 'Categoría creada',
			'editor.entity.category.updated' => 'Categoría actualizada',
			'editor.entity.category.deleted' => 'Categoría eliminada',
			'editor.entity.category.deleteTitle' => 'Eliminar categoría',
			'editor.entity.category.deleteMessage' => ({required Object name}) => '¿Eliminar la categoría «${name}»? Sus transacciones quedarán sin categoría.',
			'editor.entity.tag.kNew' => 'Nueva etiqueta',
			'editor.entity.tag.edit' => 'Editar etiqueta',
			'editor.entity.tag.created' => 'Etiqueta creada',
			'editor.entity.tag.updated' => 'Etiqueta actualizada',
			'editor.entity.tag.deleted' => 'Etiqueta eliminada',
			'editor.entity.tag.deleteTitle' => 'Eliminar etiqueta',
			'editor.entity.tag.deleteMessage' => ({required Object name}) => '¿Eliminar la etiqueta «${name}»? Se quitará de todas sus transacciones.',
			'editor.entity.tag.date' => 'Fecha',
			'editor.entity.tag.dateHint' => 'Opcional: sirve para agrupar etiquetas por momento (un viaje, un evento).',
			'editor.entity.budget.kNew' => 'Nuevo presupuesto',
			'editor.entity.budget.edit' => 'Editar presupuesto',
			'editor.entity.budget.created' => 'Presupuesto creado',
			'editor.entity.budget.updated' => 'Presupuesto actualizado',
			'editor.entity.budget.deleted' => 'Presupuesto eliminado',
			'editor.entity.budget.deleteTitle' => 'Eliminar presupuesto',
			'editor.entity.budget.deleteMessage' => ({required Object name}) => '¿Eliminar el presupuesto «${name}»? Sus transacciones quedarán sin presupuesto.',
			'editor.entity.budget.auto' => 'Presupuesto automático',
			'editor.entity.budget.autoHint' => 'Firefly le asigna el monto solo al empezar cada periodo.',
			'editor.entity.budget.autoType' => 'Tipo',
			'editor.entity.budget.autoAmount' => 'Monto por periodo',
			'editor.entity.budget.autoPeriod' => 'Periodo',
			'editor.entity.budget.autoTypes.reset' => 'Reiniciar cada periodo',
			'editor.entity.budget.autoTypes.rollover' => 'Acumular lo que sobre',
			'editor.entity.budget.autoTypes.adjusted' => 'Ajustar según lo gastado',
			'editor.entity.bill.kNew' => 'Nueva suscripción',
			'editor.entity.bill.edit' => 'Editar suscripción',
			'editor.entity.bill.created' => 'Suscripción creada',
			'editor.entity.bill.updated' => 'Suscripción actualizada',
			'editor.entity.bill.deleted' => 'Suscripción eliminada',
			'editor.entity.bill.deleteTitle' => 'Eliminar suscripción',
			'editor.entity.bill.deleteMessage' => ({required Object name}) => '¿Eliminar la suscripción «${name}»? Sus transacciones se conservan, pero dejan de estar vinculadas.',
			'editor.entity.bill.fixed' => 'Monto fijo',
			'editor.entity.bill.amount' => 'Monto',
			'editor.entity.bill.amountMin' => 'Monto mínimo',
			'editor.entity.bill.amountMax' => 'Monto máximo',
			'editor.entity.bill.freq' => 'Frecuencia',
			'editor.entity.bill.skip' => 'Saltar periodos',
			'editor.entity.bill.skipHint' => '0 = cada periodo; 1 = uno sí y uno no.',
			'editor.entity.bill.date' => 'Primera fecha',
			'editor.entity.bill.endDate' => 'Fecha de fin',
			'editor.entity.bill.endDateHint' => 'Opcional: déjala vacía si no termina.',
			'editor.entity.account.kNew' => 'Nueva cuenta',
			'editor.entity.account.edit' => 'Editar cuenta',
			'editor.entity.account.created' => 'Cuenta creada',
			'editor.entity.account.updated' => 'Cuenta actualizada',
			'editor.entity.account.deleted' => 'Cuenta eliminada',
			'editor.entity.account.deleteTitle' => 'Eliminar cuenta',
			'editor.entity.account.deleteMessage' => ({required Object name}) => '¿Eliminar la cuenta «${name}»?',
			'editor.entity.account.deleteWarning' => ({required Object count}) => 'Se eliminarán también sus ${count} transacciones. No se puede deshacer.',
			'editor.entity.account.type' => 'Tipo de cuenta',
			'editor.entity.account.types.asset' => 'Activo',
			'editor.entity.account.types.liability' => 'Pasivo',
			'editor.entity.account.types.expense' => 'Gastos',
			'editor.entity.account.types.revenue' => 'Ingresos',
			'editor.entity.account.typeLocked' => 'El tipo no se puede cambiar después de crear la cuenta.',
			'editor.entity.account.role' => 'Uso',
			'editor.entity.account.iban' => 'IBAN',
			'editor.entity.account.openingBalance' => 'Saldo inicial',
			'editor.entity.account.openingBalanceDate' => 'Fecha del saldo inicial',
			'editor.entity.account.includeNetWorth' => 'Incluir en el patrimonio neto',
			'editor.entity.account.cardType' => 'Tipo de tarjeta',
			'editor.entity.account.cardTypes.monthlyFull' => 'Pago mensual completo',
			'editor.entity.account.paymentDay' => 'Día de pago',
			'editor.entity.account.liabilityType' => 'Tipo de pasivo',
			'editor.entity.account.liabilityTypes.loan' => 'Préstamo',
			'editor.entity.account.liabilityTypes.debt' => 'Deuda',
			'editor.entity.account.liabilityTypes.mortgage' => 'Hipoteca',
			'editor.entity.account.direction' => 'Quién debe',
			'editor.entity.account.directions.debit' => 'Yo debo',
			'editor.entity.account.directions.credit' => 'Me deben',
			'editor.entity.account.interest' => 'Interés (%)',
			'editor.entity.account.interestPeriod' => 'Periodo del interés',
			'editor.entity.account.interestPeriods.daily' => 'Diario',
			'editor.entity.account.interestPeriods.monthly' => 'Mensual',
			'editor.entity.account.interestPeriods.yearly' => 'Anual',
			'editor.entity.account.owed' => 'Monto adeudado',
			'editor.entity.account.startDate' => 'Fecha de inicio',
			'editor.entity.piggy.kNew' => 'Nueva meta',
			'editor.entity.piggy.edit' => 'Editar meta',
			'editor.entity.piggy.created' => 'Meta creada',
			'editor.entity.piggy.updated' => 'Meta actualizada',
			'editor.entity.piggy.deleted' => 'Meta eliminada',
			'editor.entity.piggy.deleteTitle' => 'Eliminar meta',
			'editor.entity.piggy.deleteMessage' => ({required Object name}) => '¿Eliminar la meta «${name}»? El dinero apartado vuelve a estar libre en sus cuentas.',
			'editor.entity.piggy.target' => 'Monto de la meta',
			'editor.entity.piggy.startDate' => 'Fecha de inicio',
			'editor.entity.piggy.targetDate' => 'Fecha objetivo',
			'editor.entity.piggy.accounts' => 'Cuentas',
			'editor.entity.piggy.addAccount' => 'Añadir una cuenta…',
			'editor.entity.piggy.none' => 'Elige al menos una cuenta.',
			'editor.entity.piggy.saved' => 'Apartado',
			'editor.entity.piggy.adjust' => 'Ajustar',
			'editor.entity.piggy.adjustLabel' => 'Monto a sumar o restar',
			'editor.entity.piggy.add' => 'Sumar',
			'editor.entity.piggy.subtract' => 'Restar',
			'editor.entity.piggy.remove' => ({required Object name}) => 'Quitar ${name}',
			'editor.entity.piggy.adjustHint' => 'Suma o resta dinero apartado en cada cuenta; se guarda al pulsar Guardar.',
			'editor.periods.daily' => 'Diario',
			'editor.periods.weekly' => 'Semanal',
			'editor.periods.monthly' => 'Mensual',
			'editor.periods.quarterly' => 'Trimestral',
			'editor.periods.halfYear' => 'Semestral',
			'editor.periods.yearly' => 'Anual',
			_ => null,
		};
	}
}
