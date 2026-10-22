///
/// Generated file. Do not edit.
///
// coverage:ignore-file
// ignore_for_file: type=lint, unused_import
// dart format off

part of 'strings.g.dart';

// Path: <root>
typedef TranslationsEn = Translations; // ignore: unused_element
class Translations with BaseTranslations<AppLocale, Translations> {
	/// Returns the current translations of the given [context].
	///
	/// Usage:
	/// final t = Translations.of(context);
	static Translations of(BuildContext context) => InheritedLocaleData.of<AppLocale, Translations>(context).translations;

	/// You can call this constructor and build your own translation instance of this locale.
	/// Constructing via the enum [AppLocale.build] is preferred.
	Translations({Map<String, Node>? overrides, PluralResolver? cardinalResolver, PluralResolver? ordinalResolver, TranslationMetadata<AppLocale, Translations>? meta})
		: assert(overrides == null, 'Set "translation_overrides: true" in order to enable this feature.'),
		  _meta = meta ?? TranslationMetadata(
		    locale: AppLocale.en,
		    overrides: overrides ?? {},
		    cardinalResolver: cardinalResolver,
		    ordinalResolver: ordinalResolver,
		  ) {
		_meta.setFlatMapFunction(_flatMapFunction);
	}

	/// Metadata for the translations of <en>.
	final TranslationMetadata<AppLocale, Translations> _meta;
	@override TranslationMetadata<AppLocale, Translations> get $meta => _meta;

	/// Access flat map
	dynamic operator[](String key) => _meta.getTranslation(key);

	late final Translations _root = this; // ignore: unused_field

	Translations $copyWith({TranslationMetadata<AppLocale, Translations>? meta}) => Translations(meta: meta ?? this.$meta);

	// Translations
	late final Translations$lang$en lang = Translations$lang$en.internal(_root);
	late final Translations$theme$en theme = Translations$theme$en.internal(_root);
	late final Translations$common$en common = Translations$common$en.internal(_root);
	late final Translations$nav$en nav = Translations$nav$en.internal(_root);
	late final Translations$topbar$en topbar = Translations$topbar$en.internal(_root);
	late final Translations$login$en login = Translations$login$en.internal(_root);
	late final Translations$errors$en errors = Translations$errors$en.internal(_root);
	late final Translations$period$en period = Translations$period$en.internal(_root);
	late final Translations$currency$en currency = Translations$currency$en.internal(_root);
	late final Translations$kpi$en kpi = Translations$kpi$en.internal(_root);
	late final Translations$chart$en chart = Translations$chart$en.internal(_root);
	late final Translations$tx$en tx = Translations$tx$en.internal(_root);
	late final Translations$txType$en txType = Translations$txType$en.internal(_root);
	late final Translations$dashboard$en dashboard = Translations$dashboard$en.internal(_root);
	late final Translations$monthly$en monthly = Translations$monthly$en.internal(_root);
	late final Translations$budget$en budget = Translations$budget$en.internal(_root);
	late final Translations$sankey$en sankey = Translations$sankey$en.internal(_root);
	late final Translations$flow$en flow = Translations$flow$en.internal(_root);
	late final Translations$calendar$en calendar = Translations$calendar$en.internal(_root);
	late final Translations$compare$en compare = Translations$compare$en.internal(_root);
	late final Translations$annual$en annual = Translations$annual$en.internal(_root);
	late final Translations$ranking$en ranking = Translations$ranking$en.internal(_root);
	late final Translations$accounts$en accounts = Translations$accounts$en.internal(_root);
	late final Translations$netWorth$en netWorth = Translations$netWorth$en.internal(_root);
	late final Translations$savings$en savings = Translations$savings$en.internal(_root);
	late final Translations$bills$en bills = Translations$bills$en.internal(_root);
	late final Translations$recurring$en recurring = Translations$recurring$en.internal(_root);
	late final Translations$goals$en goals = Translations$goals$en.internal(_root);
	late final Translations$projection$en projection = Translations$projection$en.internal(_root);
	late final Translations$explorer$en explorer = Translations$explorer$en.internal(_root);
	late final Translations$settings$en settings = Translations$settings$en.internal(_root);
	late final Translations$about$en about = Translations$about$en.internal(_root);
	late final Translations$forms$en forms = Translations$forms$en.internal(_root);
	late final Translations$editor$en editor = Translations$editor$en.internal(_root);
}

// Path: lang
class Translations$lang$en {
	Translations$lang$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Español'
	String get es => 'Español';

	/// en: 'English'
	String get en => 'English';
}

// Path: theme
class Translations$theme$en {
	Translations$theme$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Midnight'
	String get midnight => 'Midnight';

	/// en: 'Earth'
	String get earth => 'Earth';

	/// en: 'Dusk'
	String get dusk => 'Dusk';
}

// Path: common
class Translations$common$en {
	Translations$common$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Income'
	String get income => 'Income';

	/// en: 'Expenses'
	String get expenses => 'Expenses';

	/// en: 'Net'
	String get net => 'Net';

	/// en: 'Savings rate'
	String get savingsRate => 'Savings rate';

	/// en: 'Net worth'
	String get netWorth => 'Net worth';

	/// en: 'Month'
	String get month => 'Month';

	/// en: 'Search…'
	String get search => 'Search…';

	/// en: 'No results'
	String get noResults => 'No results';

	/// en: 'Date'
	String get date => 'Date';

	/// en: 'Amount'
	String get amount => 'Amount';

	/// en: 'Total'
	String get total => 'Total';

	/// en: 'Category'
	String get category => 'Category';

	/// en: 'Budget'
	String get budget => 'Budget';

	/// en: 'Account'
	String get account => 'Account';

	/// en: 'Tag'
	String get tag => 'Tag';

	/// en: 'Uncategorized'
	String get uncategorized => 'Uncategorized';

	/// en: 'Untagged'
	String get untagged => 'Untagged';

	/// en: 'No budget'
	String get noBudget => 'No budget';

	/// en: 'Others'
	String get others => 'Others';

	/// en: 'No data for this period'
	String get noData => 'No data for this period';

	/// en: 'View all'
	String get viewAll => 'View all';
}

// Path: nav
class Translations$nav$en {
	Translations$nav$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Menu'
	String get menu => 'Menu';

	/// en: 'reports & data entry'
	String get readOnly => 'reports & data entry';

	/// en: 'Toggle menu'
	String get toggle => 'Toggle menu';

	/// en: 'Skip to content'
	String get skipToContent => 'Skip to content';

	/// en: 'Breadcrumb'
	String get breadcrumb => 'Breadcrumb';

	late final Translations$nav$sections$en sections = Translations$nav$sections$en.internal(_root);

	/// en: 'Dashboard'
	String get dashboard => 'Dashboard';

	/// en: 'Monthly summary'
	String get monthly => 'Monthly summary';

	/// en: 'Annual report'
	String get annual => 'Annual report';

	/// en: 'Money flow'
	String get flow => 'Money flow';

	/// en: 'Calendar'
	String get calendar => 'Calendar';

	/// en: 'Comparisons'
	String get compare => 'Comparisons';

	/// en: 'Categories'
	String get categories => 'Categories';

	/// en: 'Tags'
	String get tags => 'Tags';

	/// en: 'Budgets'
	String get budgets => 'Budgets';

	/// en: 'Merchants'
	String get merchants => 'Merchants';

	/// en: 'Income sources'
	String get incomeSources => 'Income sources';

	/// en: 'Asset accounts'
	String get assetAccounts => 'Asset accounts';

	/// en: 'Expense accounts'
	String get expenseAccounts => 'Expense accounts';

	/// en: 'Revenue accounts'
	String get revenueAccounts => 'Revenue accounts';

	/// en: 'Account detail'
	String get accountDetail => 'Account detail';

	/// en: 'Net worth'
	String get netWorth => 'Net worth';

	/// en: 'Savings'
	String get savings => 'Savings';

	/// en: 'Subscriptions'
	String get bills => 'Subscriptions';

	/// en: 'Recurring'
	String get recurring => 'Recurring';

	/// en: 'Goals'
	String get goals => 'Goals';

	/// en: 'Cash-flow projection'
	String get projection => 'Cash-flow projection';

	/// en: 'Explorer'
	String get explorer => 'Explorer';

	/// en: 'New transaction'
	String get newTransaction => 'New transaction';

	/// en: 'Edit transaction'
	String get editTransaction => 'Edit transaction';

	/// en: 'More'
	String get more => 'More';

	/// en: 'Settings'
	String get settings => 'Settings';

	/// en: 'About'
	String get about => 'About';
}

// Path: topbar
class Translations$topbar$en {
	Translations$topbar$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Refresh data'
	String get refresh => 'Refresh data';

	/// en: 'Data refreshed from Firefly'
	String get refreshed => 'Data refreshed from Firefly';

	/// en: 'Language'
	String get language => 'Language';

	/// en: 'Theme'
	String get theme => 'Theme';

	/// en: 'Hide amounts'
	String get hideAmounts => 'Hide amounts';

	/// en: 'Show amounts'
	String get showAmounts => 'Show amounts';

	/// en: 'User account'
	String get account => 'User account';

	/// en: 'Open Firefly III'
	String get openFirefly => 'Open Firefly III';

	/// en: 'Sign out'
	String get logout => 'Sign out';
}

// Path: login
class Translations$login$en {
	Translations$login$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Interactive reports for your Firefly III'
	String get subtitle => 'Interactive reports for your Firefly III';

	/// en: 'Sign in with Firefly'
	String get button => 'Sign in with Firefly';

	/// en: 'SpaceFly reads your Firefly III data and lets you record and edit it. Your token never reaches the browser.'
	String get readOnly => 'SpaceFly reads your Firefly III data and lets you record and edit it. Your token never reaches the browser.';

	late final Translations$login$errors$en errors = Translations$login$errors$en.internal(_root);
}

// Path: errors
class Translations$errors$en {
	Translations$errors$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Could not load the data'
	String get load => 'Could not load the data';

	/// en: 'Something went wrong. Please try again.'
	String get generic => 'Something went wrong. Please try again.';

	/// en: 'Your Firefly III is {{version}}; SpaceFly requires {{min}} or newer. Some figures may be wrong.'
	String version({required Object version, required Object min}) => 'Your Firefly III is ${version}; SpaceFly requires ${min} or newer. Some figures may be wrong.';
}

// Path: period
class Translations$period$en {
	Translations$period$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Previous period'
	String get previous => 'Previous period';

	/// en: 'Next period'
	String get next => 'Next period';

	/// en: 'Custom range'
	String get custom => 'Custom range';

	/// en: 'From'
	String get from => 'From';

	/// en: 'To'
	String get to => 'To';

	/// en: 'Apply'
	String get apply => 'Apply';

	/// en: 'Q'
	String get quarterShort => 'Q';

	/// en: 'YTD'
	String get ytdShort => 'YTD';

	late final Translations$period$presets$en presets = Translations$period$presets$en.internal(_root);
}

// Path: currency
class Translations$currency$en {
	Translations$currency$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Display currency'
	String get label => 'Display currency';
}

// Path: kpi
class Translations$kpi$en {
	Translations$kpi$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Previous:'
	String get vsPrevious => 'Previous:';
}

// Path: chart
class Translations$chart$en {
	Translations$chart$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Show as table'
	String get showTable => 'Show as table';

	/// en: 'Show chart'
	String get showChart => 'Show chart';

	/// en: 'Download PNG'
	String get download => 'Download PNG';
}

// Path: tx
class Translations$tx$en {
	Translations$tx$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'No transactions'
	String get none => 'No transactions';

	/// en: 'Transactions'
	String get count => 'Transactions';

	/// en: 'Categories in this group'
	String get breakdown => 'Categories in this group';

	/// en: 'Open in Firefly'
	String get openInFirefly => 'Open in Firefly';
}

// Path: txType
class Translations$txType$en {
	Translations$txType$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Expense'
	String get withdrawal => 'Expense';

	/// en: 'Income'
	String get deposit => 'Income';

	/// en: 'Transfer'
	String get transfer => 'Transfer';

	/// en: 'Opening balance'
	String get openingBalance => 'Opening balance';

	/// en: 'Reconciliation'
	String get reconciliation => 'Reconciliation';

	/// en: 'Liability credit'
	String get liabilityCredit => 'Liability credit';
}

// Path: dashboard
class Translations$dashboard$en {
	Translations$dashboard$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Your finances at a glance.'
	String get description => 'Your finances at a glance.';

	/// en: 'Income vs expenses'
	String get incomeVsExpense => 'Income vs expenses';

	/// en: 'Last 12 months'
	String get last12 => 'Last 12 months';

	/// en: 'Top spending categories'
	String get topCategories => 'Top spending categories';

	/// en: 'Upcoming subscriptions'
	String get upcomingBills => 'Upcoming subscriptions';

	/// en: 'Nothing scheduled in the next 30 days'
	String get noUpcoming => 'Nothing scheduled in the next 30 days';

	/// en: 'Largest expenses'
	String get largest => 'Largest expenses';
}

// Path: monthly
class Translations$monthly$en {
	Translations$monthly$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'The email report, interactive and for any period.'
	String get description => 'The email report, interactive and for any period.';

	/// en: 'Earned'
	String get earned => 'Earned';

	/// en: 'Spent'
	String get spent => 'Spent';

	/// en: 'Net change'
	String get netChange => 'Net change';

	/// en: 'Category summary'
	String get categories => 'Category summary';

	/// en: 'vs {{month}}'
	String vsPrevious({required Object month}) => 'vs ${month}';

	/// en: 'New'
	String get kNew => 'New';

	/// en: 'Money flow'
	String get moneyFlow => 'Money flow';

	/// en: 'Open interactive'
	String get openInteractive => 'Open interactive';

	/// en: 'Daily cash flow'
	String get dailyCashFlow => 'Daily cash flow';

	/// en: 'Budget summary'
	String get budgets => 'Budget summary';

	/// en: 'Top 5 largest expenses'
	String get top5 => 'Top 5 largest expenses';

	/// en: 'Asset account activity'
	String get assetActivity => 'Asset account activity';

	/// en: 'Top income'
	String get topIncome => 'Top income';

	/// en: 'Top expenses'
	String get topExpenses => 'Top expenses';

	/// en: 'Savings accounts – balance (last {{n}} months)'
	String savings({required Object n}) => 'Savings accounts – balance (last ${n} months)';

	/// en: 'Financial overview'
	String get overview => 'Financial overview';

	/// en: 'This period'
	String get thisPeriod => 'This period';

	/// en: 'Year to date'
	String get ytd => 'Year to date';

	/// en: 'Current net worth'
	String get currentNetWorth => 'Current net worth';
}

// Path: budget
class Translations$budget$en {
	Translations$budget$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Limit vs spent, spending pace and historical compliance.'
	String get description => 'Limit vs spent, spending pace and historical compliance.';

	/// en: 'Limit'
	String get limit => 'Limit';

	/// en: 'Spent'
	String get spent => 'Spent';

	/// en: 'Remaining'
	String get remaining => 'Remaining';

	/// en: 'No budgets with activity in this period'
	String get none => 'No budgets with activity in this period';

	/// en: 'Expected pace to date'
	String get expectedPace => 'Expected pace to date';

	late final Translations$budget$status$en status = Translations$budget$status$en.internal(_root);
	late final Translations$budget$auto$en auto = Translations$budget$auto$en.internal(_root);

	/// en: 'Total limit'
	String get totalLimit => 'Total limit';

	/// en: 'Spent in budgets'
	String get spentInBudgets => 'Spent in budgets';

	/// en: 'Outside budgets'
	String get unbudgeted => 'Outside budgets';

	/// en: 'Available to budget'
	String get available => 'Available to budget';

	/// en: 'Projected at period end:'
	String get projection => 'Projected at period end:';

	/// en: 'over by {{amount}}'
	String overBy({required Object amount}) => 'over by ${amount}';

	/// en: '{{name}} · last 12 months'
	String history({required Object name}) => '${name} · last 12 months';

	/// en: '{{name}} by category'
	String byCategory({required Object name}) => '${name} by category';
}

// Path: sankey
class Translations$sankey$en {
	Translations$sankey$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Total income'
	String get totalIncome => 'Total income';

	/// en: 'Savings'
	String get savings => 'Savings';

	/// en: 'Net savings'
	String get netSavings => 'Net savings';

	/// en: 'Deficit'
	String get deficit => 'Deficit';

	/// en: 'Other expenses'
	String get othersExpense => 'Other expenses';

	/// en: 'Other sources'
	String get othersIncome => 'Other sources';

	/// en: 'Other tags'
	String get othersTags => 'Other tags';

	late final Translations$sankey$kinds$en kinds = Translations$sankey$kinds$en.internal(_root);
}

// Path: flow
class Translations$flow$en {
	Translations$flow$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Money flow'
	String get title => 'Money flow';

	/// en: 'Where your money comes from and where it goes.'
	String get description => 'Where your money comes from and where it goes.';

	/// en: 'Hover to highlight a path · click a node to see its transactions · drag to rearrange'
	String get hint => 'Hover to highlight a path · click a node to see its transactions · drag to rearrange';

	/// en: 'By budget'
	String get byBudget => 'By budget';

	/// en: 'By tags'
	String get byTags => 'By tags';

	/// en: 'Budgets'
	String get showBudgets => 'Budgets';

	/// en: 'Income categories'
	String get showIncomeCategories => 'Income categories';

	/// en: 'Group flows below'
	String get groupSmall => 'Group flows below';

	/// en: 'From'
	String get from => 'From';

	/// en: 'To'
	String get to => 'To';

	/// en: '% of income'
	String get shareOfIncome => '% of income';
}

// Path: calendar
class Translations$calendar$en {
	Translations$calendar$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Income and expense calendar'
	String get title => 'Income and expense calendar';

	/// en: 'Day-by-day income and expenses, plus what's scheduled.'
	String get description => 'Day-by-day income and expenses, plus what\'s scheduled.';

	/// en: 'Month'
	String get month => 'Month';

	/// en: 'Year'
	String get year => 'Year';

	/// en: 'All accounts'
	String get allAccounts => 'All accounts';

	/// en: 'All categories'
	String get allCategories => 'All categories';

	/// en: 'All tags'
	String get allTags => 'All tags';

	/// en: 'Closing balance'
	String get endBalance => 'Closing balance';

	/// en: 'Click a day to see its transactions'
	String get clickDay => 'Click a day to see its transactions';

	/// en: 'Running balance'
	String get runningBalance => 'Running balance';

	/// en: 'Balance'
	String get balance => 'Balance';

	/// en: 'The running balance doesn't apply with category or tag filters'
	String get noBalance => 'The running balance doesn\'t apply with category or tag filters';

	/// en: 'Scheduled this month'
	String get scheduled => 'Scheduled this month';

	/// en: 'Nothing scheduled'
	String get noScheduled => 'Nothing scheduled';

	/// en: 'Subscription'
	String get bill => 'Subscription';

	/// en: 'Recurring'
	String get recurrence => 'Recurring';

	/// en: 'Spending intensity {{year}}'
	String heatmapTitle({required Object year}) => 'Spending intensity ${year}';

	/// en: 'Each cell is a day; darker = more spending'
	String get heatmapHint => 'Each cell is a day; darker = more spending';
}

// Path: compare
class Translations$compare$en {
	Translations$compare$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Compare two periods by category, tag, budget, account or merchant.'
	String get description => 'Compare two periods by category, tag, budget, account or merchant.';

	/// en: 'vs previous period'
	String get previous => 'vs previous period';

	/// en: 'vs last year'
	String get yoy => 'vs last year';

	/// en: 'Custom range'
	String get custom => 'Custom range';

	/// en: 'Group by'
	String get groupBy => 'Group by';

	/// en: 'Biggest changes (A − B)'
	String get deltaTitle => 'Biggest changes (A − B)';

	/// en: 'Red = you spent more · blue = you spent less'
	String get deltaHintExpense => 'Red = you spent more · blue = you spent less';

	/// en: 'Blue = you earned more · red = you earned less'
	String get deltaHintIncome => 'Blue = you earned more · red = you earned less';

	/// en: '12-month trend'
	String get trend => '12-month trend';

	late final Translations$compare$groups$en groups = Translations$compare$groups$en.internal(_root);
}

// Path: annual
class Translations$annual$en {
	Translations$annual$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Annual report {{year}}'
	String title({required Object year}) => 'Annual report ${year}';

	/// en: 'The year month by month: totals, best and worst month, and categories.'
	String get description => 'The year month by month: totals, best and worst month, and categories.';

	/// en: 'Average monthly income'
	String get avgIncome => 'Average monthly income';

	/// en: 'Average monthly spending'
	String get avgExpense => 'Average monthly spending';

	/// en: 'Best month'
	String get best => 'Best month';

	/// en: 'Worst month'
	String get worst => 'Worst month';

	/// en: 'Income and expenses by month'
	String get byMonth => 'Income and expenses by month';

	/// en: 'Monthly savings rate'
	String get savingsRate => 'Monthly savings rate';

	/// en: 'Spending by category and month'
	String get matrix => 'Spending by category and month';

	/// en: 'Top 15 categories; click a cell to see transactions'
	String get matrixHint => 'Top 15 categories; click a cell to see transactions';
}

// Path: ranking
class Translations$ranking$en {
	Translations$ranking$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations
	late final Translations$ranking$descriptions$en descriptions = Translations$ranking$descriptions$en.internal(_root);

	/// en: 'Items'
	String get items => 'Items';

	/// en: 'Transactions'
	String get transactions => 'Transactions';

	/// en: 'Average ticket'
	String get avgTicket => 'Average ticket';

	/// en: 'Distribution'
	String get distribution => 'Distribution';

	/// en: 'Trend'
	String get trend => 'Trend';

	/// en: 'Top items, last 12 months'
	String get trendHint => 'Top items, last 12 months';

	/// en: 'Name'
	String get name => 'Name';

	/// en: '% of total'
	String get share => '% of total';

	/// en: 'Count'
	String get count => 'Count';

	/// en: 'Previous period'
	String get previous => 'Previous period';

	late final Translations$ranking$views$en views = Translations$ranking$views$en.internal(_root);
}

// Path: accounts
class Translations$accounts$en {
	Translations$accounts$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Current balances and how they evolved.'
	String get description => 'Current balances and how they evolved.';

	/// en: 'Months of history'
	String get history => 'Months of history';

	/// en: 'm'
	String get monthsShort => 'm';

	/// en: 'Total in accounts'
	String get total => 'Total in accounts';

	/// en: 'Balance (original currency)'
	String get balanceOriginal => 'Balance (original currency)';

	/// en: 'Balance'
	String get balance => 'Balance';

	/// en: 'Balance history'
	String get balanceHistory => 'Balance history';

	/// en: 'Excluded'
	String get excluded => 'Excluded';

	late final Translations$accounts$roles$en roles = Translations$accounts$roles$en.internal(_root);
	late final Translations$accounts$reorder$en reorder = Translations$accounts$reorder$en.internal(_root);
	late final Translations$accounts$counterparty$en counterparty = Translations$accounts$counterparty$en.internal(_root);
	late final Translations$accounts$detail$en detail = Translations$accounts$detail$en.internal(_root);
}

// Path: netWorth
class Translations$netWorth$en {
	Translations$netWorth$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Your net worth over time.'
	String get description => 'Your net worth over time.';

	/// en: 'Current net worth'
	String get current => 'Current net worth';

	/// en: 'Change over {{n}} months'
	String change({required Object n}) => 'Change over ${n} months';

	/// en: 'Total net worth'
	String get total => 'Total net worth';

	/// en: 'By account'
	String get byAccount => 'By account';

	/// en: 'Stacked area of positive balances'
	String get stackedHint => 'Stacked area of positive balances';
}

// Path: savings
class Translations$savings$en {
	Translations$savings$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Balances of your savings accounts (excluding credit cards and excluded accounts).'
	String get description => 'Balances of your savings accounts (excluding credit cards and excluded accounts).';

	/// en: 'Total saved'
	String get total => 'Total saved';

	/// en: 'Accounts'
	String get accounts => 'Accounts';

	/// en: 'Per-account history'
	String get perAccount => 'Per-account history';

	/// en: 'Excluded accounts'
	String get manageExcluded => 'Excluded accounts';
}

// Path: bills
class Translations$bills$en {
	Translations$bills$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Cost, upcoming dates and payments of your subscriptions.'
	String get description => 'Cost, upcoming dates and payments of your subscriptions.';

	/// en: 'Monthly equivalent cost'
	String get monthly => 'Monthly equivalent cost';

	/// en: 'Yearly cost'
	String get yearly => 'Yearly cost';

	/// en: 'Paid this period'
	String get paid => 'Paid this period';

	/// en: 'Pending ({{n}})'
	String pendingAmount({required Object n}) => 'Pending (${n})';

	/// en: 'Subscription'
	String get name => 'Subscription';

	/// en: 'Status'
	String get status => 'Status';

	/// en: 'Next'
	String get next => 'Next';

	/// en: 'Expected range'
	String get range => 'Expected range';

	/// en: 'Monthly eq.'
	String get monthlyEq => 'Monthly eq.';

	/// en: 'Payments this period'
	String get paidThisPeriod => 'Payments this period';

	/// en: 'Out of range'
	String get outOfRange => 'Out of range';

	/// en: 'every {{n}}'
	String skip({required Object n}) => 'every ${n}';

	/// en: 'You have no subscriptions in Firefly'
	String get none => 'You have no subscriptions in Firefly';

	/// en: 'Yearly cost per subscription'
	String get costRanking => 'Yearly cost per subscription';

	/// en: 'Active subscriptions only'
	String get costRankingHint => 'Active subscriptions only';

	/// en: 'Last 12 months'
	String get last12Months => 'Last 12 months';

	/// en: 'Selected period'
	String get selectedPeriod => 'Selected period';

	late final Translations$bills$statuses$en statuses = Translations$bills$statuses$en.internal(_root);
	late final Translations$bills$freq$en freq = Translations$bills$freq$en.internal(_root);
}

// Path: recurring
class Translations$recurring$en {
	Translations$recurring$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Recurring transactions configured in Firefly and their next dates.'
	String get description => 'Recurring transactions configured in Firefly and their next dates.';

	/// en: 'Recurring'
	String get list => 'Recurring';

	/// en: 'Next dates'
	String get next => 'Next dates';

	/// en: 'Until {{date}}'
	String until({required Object date}) => 'Until ${date}';

	/// en: 'Inactive'
	String get inactive => 'Inactive';

	/// en: 'You have no recurring transactions'
	String get none => 'You have no recurring transactions';
}

// Path: goals
class Translations$goals$en {
	Translations$goals$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Your piggy banks: progress and estimated date based on your contribution pace.'
	String get description => 'Your piggy banks: progress and estimated date based on your contribution pace.';

	/// en: 'Total saved'
	String get saved => 'Total saved';

	/// en: 'Total target'
	String get target => 'Total target';

	/// en: 'Saved'
	String get current => 'Saved';

	/// en: 'Target'
	String get goal => 'Target';

	/// en: 'Pace (6 months)'
	String get pace => 'Pace (6 months)';

	/// en: 'month'
	String get month => 'month';

	/// en: 'Left'
	String get left => 'Left';

	/// en: 'Target date'
	String get targetDate => 'Target date';

	/// en: 'Estimated'
	String get estimated => 'Estimated';

	/// en: 'no recent contributions'
	String get noPace => 'no recent contributions';

	/// en: 'On track'
	String get onTrack => 'On track';

	/// en: 'Behind'
	String get behind => 'Behind';

	/// en: 'You have no piggy banks in Firefly'
	String get none => 'You have no piggy banks in Firefly';
}

// Path: projection
class Translations$projection$en {
	Translations$projection$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Current balance + scheduled recurring transactions and subscriptions.'
	String get description => 'Current balance + scheduled recurring transactions and subscriptions.';

	/// en: 'd'
	String get daysShort => 'd';

	/// en: 'Balance today'
	String get today => 'Balance today';

	/// en: 'In {{n}} days'
	String kIn({required Object n}) => 'In ${n} days';

	/// en: 'Projected balance'
	String get chart => 'Projected balance';

	/// en: 'Lowest point: {{amount}} on {{date}}'
	String lowest({required Object amount, required Object date}) => 'Lowest point: ${amount} on ${date}';

	/// en: 'Scheduled movements'
	String get events => 'Scheduled movements';

	/// en: 'Nothing scheduled in this horizon'
	String get noEvents => 'Nothing scheduled in this horizon';

	/// en: 'Inflows'
	String get inflow => 'Inflows';

	/// en: 'Outflows'
	String get outflow => 'Outflows';
}

// Path: explorer
class Translations$explorer$en {
	Translations$explorer$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'All'
	String get allTypes => 'All';

	/// en: 'Search, filter, sort and export your transactions.'
	String get description => 'Search, filter, sort and export your transactions.';

	/// en: 'Search'
	String get search => 'Search';

	/// en: 'Clear'
	String get clear => 'Clear';

	/// en: 'Description, account or note… (or Firefly syntax: amount_more:500 category_is:Food)'
	String get searchPlaceholder => 'Description, account or note…  (or Firefly syntax: amount_more:500 category_is:Food)';

	/// en: 'Search all of Firefly (Firefly syntax)'
	String get fireflySyntax => 'Search all of Firefly (Firefly syntax)';

	/// en: 'Uses Firefly's search across all your transactions, not limited to the period'
	String get fireflySyntaxHint => 'Uses Firefly\'s search across all your transactions, not limited to the period';

	/// en: 'All budgets'
	String get allBudgets => 'All budgets';

	/// en: '{{n}} results'
	String results({required Object n}) => '${n} results';

	/// en: 'Description'
	String get descriptionCol => 'Description';

	/// en: 'Export CSV'
	String get export => 'Export CSV';

	/// en: 'Export is disabled while amounts are hidden'
	String get exportHidden => 'Export is disabled while amounts are hidden';

	/// en: 'Page {{page}} of {{pages}}'
	String page({required Object page, required Object pages}) => 'Page ${page} of ${pages}';
}

// Path: settings
class Translations$settings$en {
	Translations$settings$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations
	late final Translations$settings$mobile$en mobile = Translations$settings$mobile$en.internal(_root);

	/// en: 'SpaceFly preferences (stored in SpaceFly, never in Firefly).'
	String get description => 'SpaceFly preferences (stored in SpaceFly, never in Firefly).';

	/// en: 'Save'
	String get save => 'Save';

	/// en: 'Settings saved'
	String get saved => 'Settings saved';

	/// en: 'Excluded accounts'
	String get excluded => 'Excluded accounts';

	/// en: 'Hidden from savings, net worth and projection (same as the script's exclude_accounts).'
	String get excludedHint => 'Hidden from savings, net worth and projection (same as the script\'s exclude_accounts).';

	/// en: 'Preferences'
	String get preferences => 'Preferences';

	/// en: 'Default months of balance history'
	String get balanceMonths => 'Default months of balance history';

	/// en: 'Sankey "Others" threshold'
	String get sankeyThreshold => 'Sankey "Others" threshold';

	late final Translations$settings$exchange$en exchange = Translations$settings$exchange$en.internal(_root);

	/// en: 'Rates in use'
	String get rates => 'Rates in use';

	/// en: 'The most recent rate stored in Firefly on or before each date; open.er-api.com is used when there is none.'
	String get ratesHint => 'The most recent rate stored in Firefly on or before each date; open.er-api.com is used when there is none.';

	/// en: 'Pair'
	String get pair => 'Pair';

	/// en: 'Rate'
	String get rate => 'Rate';

	/// en: 'Source'
	String get source => 'Source';

	late final Translations$settings$sources$en sources = Translations$settings$sources$en.internal(_root);
}

// Path: about
class Translations$about$en {
	Translations$about$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Version'
	String get version => 'Version';

	/// en: 'Supported (≥ {{min}})'
	String supported({required Object min}) => 'Supported (≥ ${min})';

	/// en: 'Unsupported (< {{min}})'
	String unsupported({required Object min}) => 'Unsupported (< ${min})';

	/// en: 'Primary currency'
	String get primary => 'Primary currency';

	/// en: 'User'
	String get user => 'User';

	/// en: 'Instance'
	String get instance => 'Instance';

	/// en: 'SpaceFly reads and writes your Firefly III data through its server, which also protects writes against requests from other sites. Your token never reaches the browser.'
	String get body => 'SpaceFly reads and writes your Firefly III data through its server, which also protects writes against requests from other sites. Your token never reaches the browser.';
}

// Path: forms
class Translations$forms$en {
	Translations$forms$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Create “{{name}}”'
	String createOption({required Object name}) => 'Create “${name}”';

	/// en: '{{count}} more; type to search'
	String moreResults({required Object count}) => '${count} more; type to search';

	/// en: 'Today'
	String get today => 'Today';

	/// en: 'Now'
	String get now => 'Now';

	/// en: 'Pick a date'
	String get pickDate => 'Pick a date';

	/// en: 'Pick a time'
	String get pickTime => 'Pick a time';

	/// en: 'Hour'
	String get hour => 'Hour';

	/// en: 'Minute'
	String get minute => 'Minute';

	/// en: 'Clear'
	String get clear => 'Clear';

	/// en: 'OK'
	String get ok => 'OK';

	/// en: 'Previous month'
	String get previousMonth => 'Previous month';

	/// en: 'Next month'
	String get nextMonth => 'Next month';

	/// en: 'Yesterday'
	String get yesterday => 'Yesterday';

	/// en: 'Save'
	String get save => 'Save';

	/// en: 'Saving…'
	String get saving => 'Saving…';

	/// en: 'Cancel'
	String get cancel => 'Cancel';

	/// en: 'Delete'
	String get delete => 'Delete';

	late final Translations$forms$errors$en errors = Translations$forms$errors$en.internal(_root);
	late final Translations$forms$account$en account = Translations$forms$account$en.internal(_root);
	late final Translations$forms$accountGroups$en accountGroups = Translations$forms$accountGroups$en.internal(_root);
	late final Translations$forms$txType$en txType = Translations$forms$txType$en.internal(_root);
	late final Translations$forms$tags$en tags = Translations$forms$tags$en.internal(_root);
	late final Translations$forms$confirm$en confirm = Translations$forms$confirm$en.internal(_root);
}

// Path: editor
class Translations$editor$en {
	Translations$editor$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Back'
	String get back => 'Back';

	/// en: 'Retry'
	String get retry => 'Retry';

	/// en: 'Couldn't reach the server. Check your connection: the change may not have been saved.'
	String get networkError => 'Couldn\'t reach the server. Check your connection: the change may not have been saved.';

	/// en: 'New'
	String get kNew => 'New';

	/// en: 'Create'
	String get newTitle => 'Create';

	late final Translations$editor$tx$en tx = Translations$editor$tx$en.internal(_root);

	/// en: 'That record no longer exists.'
	String get missing => 'That record no longer exists.';

	/// en: 'Couldn't load the record.'
	String get loadError => 'Couldn\'t load the record.';

	/// en: 'Clear'
	String get clear => 'Clear';

	late final Translations$editor$fields$en fields = Translations$editor$fields$en.internal(_root);
	late final Translations$editor$entity$en entity = Translations$editor$entity$en.internal(_root);
	late final Translations$editor$periods$en periods = Translations$editor$periods$en.internal(_root);
}

// Path: nav.sections
class Translations$nav$sections$en {
	Translations$nav$sections$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'General'
	String get general => 'General';

	/// en: 'Reports'
	String get reports => 'Reports';

	/// en: 'Analysis'
	String get analysis => 'Analysis';

	/// en: 'Accounts'
	String get accounts => 'Accounts';

	/// en: 'Planning'
	String get planning => 'Planning';

	/// en: 'Transactions'
	String get transactions => 'Transactions';

	/// en: 'Create'
	String get create => 'Create';

	/// en: 'System'
	String get system => 'System';
}

// Path: login.errors
class Translations$login$errors$en {
	Translations$login$errors$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'The sign-in attempt expired or is invalid. Please try again.'
	String get invalidState => 'The sign-in attempt expired or is invalid. Please try again.';

	/// en: 'Firefly rejected the sign-in. Check the OAuth client.'
	String get tokenExchange => 'Firefly rejected the sign-in. Check the OAuth client.';

	/// en: 'Authorization was cancelled in Firefly.'
	String get accessDenied => 'Authorization was cancelled in Firefly.';

	/// en: 'Cloudflare Access blocked the app. Check the service token (client ID and secret).'
	String get cfAccess => 'Cloudflare Access blocked the app. Check the service token (client ID and secret).';

	/// en: 'Could not sign in.'
	String get generic => 'Could not sign in.';
}

// Path: period.presets
class Translations$period$presets$en {
	Translations$period$presets$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'This month'
	String get thisMonth => 'This month';

	/// en: 'Last month'
	String get lastMonth => 'Last month';

	/// en: 'Last 30 days'
	String get last30 => 'Last 30 days';

	/// en: 'Last 6 months'
	String get last6m => 'Last 6 months';

	/// en: 'This quarter'
	String get thisQuarter => 'This quarter';

	/// en: 'This year'
	String get thisYear => 'This year';

	/// en: 'Last year'
	String get lastYear => 'Last year';

	/// en: 'Year to date'
	String get ytd => 'Year to date';
}

// Path: budget.status
class Translations$budget$status$en {
	Translations$budget$status$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'On track'
	String get good => 'On track';

	/// en: 'Near limit'
	String get warning => 'Near limit';

	/// en: 'Over budget'
	String get critical => 'Over budget';
}

// Path: budget.auto
class Translations$budget$auto$en {
	Translations$budget$auto$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Auto · reset'
	String get reset => 'Auto · reset';

	/// en: 'Auto · rollover'
	String get rollover => 'Auto · rollover';

	/// en: 'Auto · adjusted'
	String get adjusted => 'Auto · adjusted';
}

// Path: sankey.kinds
class Translations$sankey$kinds$en {
	Translations$sankey$kinds$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Income source'
	String get revenue => 'Income source';

	/// en: 'Income category'
	String get incomeCat => 'Income category';

	/// en: 'Total'
	String get hub => 'Total';

	/// en: 'Budget'
	String get budget => 'Budget';

	/// en: 'Tag'
	String get tag => 'Tag';

	/// en: 'Expense category'
	String get category => 'Expense category';

	/// en: 'Savings'
	String get savings => 'Savings';

	/// en: 'Deficit'
	String get deficit => 'Deficit';

	/// en: 'Others'
	String get other => 'Others';
}

// Path: compare.groups
class Translations$compare$groups$en {
	Translations$compare$groups$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Category'
	String get category => 'Category';

	/// en: 'Tag'
	String get tag => 'Tag';

	/// en: 'Budget'
	String get budget => 'Budget';

	/// en: 'Account'
	String get account => 'Account';

	/// en: 'Merchant / source'
	String get counterparty => 'Merchant / source';
}

// Path: ranking.descriptions
class Translations$ranking$descriptions$en {
	Translations$ranking$descriptions$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Ranking, distribution and trend by category.'
	String get categories => 'Ranking, distribution and trend by category.';

	/// en: 'Ranking, distribution and trend by tag.'
	String get tags => 'Ranking, distribution and trend by tag.';

	/// en: 'Who you pay the most: frequency, average ticket and trend.'
	String get merchants => 'Who you pay the most: frequency, average ticket and trend.';

	/// en: 'Where your income comes from.'
	String get incomeSources => 'Where your income comes from.';
}

// Path: ranking.views
class Translations$ranking$views$en {
	Translations$ranking$views$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Bars'
	String get bars => 'Bars';

	/// en: 'Treemap'
	String get treemap => 'Treemap';

	/// en: 'Budgets'
	String get sunburst => 'Budgets';
}

// Path: accounts.roles
class Translations$accounts$roles$en {
	Translations$accounts$roles$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Default'
	String get defaultAsset => 'Default';

	/// en: 'Shared'
	String get sharedAsset => 'Shared';

	/// en: 'Savings'
	String get savingAsset => 'Savings';

	/// en: 'Credit card'
	String get ccAsset => 'Credit card';

	/// en: 'Cash'
	String get cashWalletAsset => 'Cash';
}

// Path: accounts.reorder
class Translations$accounts$reorder$en {
	Translations$accounts$reorder$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Reorder'
	String get start => 'Reorder';

	/// en: 'Done'
	String get done => 'Done';

	/// en: 'Reset order'
	String get reset => 'Reset order';

	/// en: 'Drag the rows or use the arrows. The order saves itself.'
	String get hint => 'Drag the rows or use the arrows. The order saves itself.';

	/// en: 'Move {{name}} up'
	String up({required Object name}) => 'Move ${name} up';

	/// en: 'Move {{name}} down'
	String down({required Object name}) => 'Move ${name} down';
}

// Path: accounts.counterparty
class Translations$accounts$counterparty$en {
	Translations$accounts$counterparty$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations
	late final Translations$accounts$counterparty$descriptions$en descriptions = Translations$accounts$counterparty$descriptions$en.internal(_root);

	/// en: 'Show without activity'
	String get showEmpty => 'Show without activity';

	/// en: 'Last activity'
	String get lastActivity => 'Last activity';

	/// en: 'Last 12 months'
	String get monthly => 'Last 12 months';

	/// en: 'Busiest accounts'
	String get topAccounts => 'Busiest accounts';

	/// en: 'Accounts with activity'
	String get activeAccounts => 'Accounts with activity';

	/// en: 'No recent activity'
	String get never => 'No recent activity';

	/// en: '% of total'
	String get share => '% of total';

	/// en: 'It may not be an account of this type, or it was deleted.'
	String get notFoundHint => 'It may not be an account of this type, or it was deleted.';

	late final Translations$accounts$counterparty$calendar$en calendar = Translations$accounts$counterparty$calendar$en.internal(_root);
	late final Translations$accounts$counterparty$weekday$en weekday = Translations$accounts$counterparty$weekday$en.internal(_root);

	/// en: 'Paid from'
	String get paidFrom => 'Paid from';

	/// en: 'Received in'
	String get receivedIn => 'Received in';

	/// en: 'By category'
	String get byCategory => 'By category';

	/// en: 'Biggest transaction'
	String get biggest => 'Biggest transaction';

	/// en: 'Last transaction'
	String get lastTransaction => 'Last transaction';

	/// en: 'Monthly average (12 months)'
	String get monthlyAverage => 'Monthly average (12 months)';

	/// en: '12-month total'
	String get total12 => '12-month total';

	/// en: 'Account'
	String get fromAccount => 'Account';
}

// Path: accounts.detail
class Translations$accounts$detail$en {
	Translations$accounts$detail$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Back to accounts'
	String get back => 'Back to accounts';

	/// en: 'Closing balance'
	String get closing => 'Closing balance';

	/// en: 'Opening balance'
	String get opening => 'Opening balance';

	/// en: 'Change'
	String get change => 'Change';

	/// en: 'Lowest balance'
	String get lowest => 'Lowest balance';

	/// en: 'Highest balance'
	String get highest => 'Highest balance';

	/// en: 'Average daily spending'
	String get avgDailyExpense => 'Average daily spending';

	/// en: 'Biggest expense'
	String get biggestExpense => 'Biggest expense';

	/// en: 'Biggest income'
	String get biggestIncome => 'Biggest income';

	/// en: 'Net transfers'
	String get netTransfers => 'Net transfers';

	/// en: 'Records'
	String get records => 'Records';

	/// en: 'Period summary'
	String get stats => 'Period summary';

	/// en: 'Balance by day'
	String get dailyBalance => 'Balance by day';

	/// en: 'Income and expenses by day'
	String get dailyFlow => 'Income and expenses by day';

	/// en: 'Use the wheel or drag to zoom'
	String get zoomHint => 'Use the wheel or drag to zoom';

	/// en: 'Last 12 months'
	String get monthly => 'Last 12 months';

	/// en: 'Spending by weekday'
	String get byWeekday => 'Spending by weekday';

	/// en: 'What it's spent on'
	String get topCategories => 'What it\'s spent on';

	/// en: 'Where it's spent'
	String get topMerchants => 'Where it\'s spent';

	/// en: 'Where the money comes from'
	String get topIncomeSources => 'Where the money comes from';

	/// en: 'Transfers received'
	String get transferIn => 'Transfers received';

	/// en: 'Transfers sent'
	String get transferOut => 'Transfers sent';

	/// en: 'Closing balance'
	String get closingBalance => 'Closing balance';

	late final Translations$accounts$detail$tabs$en tabs = Translations$accounts$detail$tabs$en.internal(_root);

	/// en: 'Counterparty'
	String get counterparty => 'Counterparty';

	/// en: 'Balance'
	String get balanceAfter => 'Balance';

	/// en: 'Filter total'
	String get periodTotal => 'Filter total';

	/// en: 'We couldn't find this account'
	String get notFound => 'We couldn\'t find this account';

	/// en: 'It may not be an asset account, or it was deleted.'
	String get notFoundHint => 'It may not be an asset account, or it was deleted.';
}

// Path: bills.statuses
class Translations$bills$statuses$en {
	Translations$bills$statuses$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Paid'
	String get paid => 'Paid';

	/// en: 'Pending'
	String get pending => 'Pending';

	/// en: 'Not due'
	String get notExpected => 'Not due';
}

// Path: bills.freq
class Translations$bills$freq$en {
	Translations$bills$freq$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Weekly'
	String get weekly => 'Weekly';

	/// en: 'Monthly'
	String get monthly => 'Monthly';

	/// en: 'Quarterly'
	String get quarterly => 'Quarterly';

	/// en: 'Half-yearly'
	String get halfYear => 'Half-yearly';

	/// en: 'Yearly'
	String get yearly => 'Yearly';
}

// Path: settings.mobile
class Translations$settings$mobile$en {
	Translations$settings$mobile$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Signed in'
	String get signedIn => 'Signed in';

	/// en: 'Server'
	String get server => 'Server';

	/// en: 'Server URL'
	String get serverUrl => 'Server URL';

	/// en: 'Enter a valid URL (https://…).'
	String get invalidUrl => 'Enter a valid URL (https://…).';

	/// en: 'Cloudflare Access'
	String get access => 'Cloudflare Access';

	/// en: 'Only needed if your server sits behind Cloudflare Access: a service token (client ID and secret).'
	String get accessHint => 'Only needed if your server sits behind Cloudflare Access: a service token (client ID and secret).';

	/// en: 'Client ID'
	String get clientId => 'Client ID';

	/// en: 'Client secret'
	String get clientSecret => 'Client secret';

	/// en: 'Save'
	String get save => 'Save';

	/// en: 'Server settings saved'
	String get saved => 'Server settings saved';

	/// en: 'Test connection'
	String get test => 'Test connection';

	/// en: 'Connection OK'
	String get testOk => 'Connection OK';

	/// en: 'Blocked by Cloudflare Access: check the service token.'
	String get testBlocked => 'Blocked by Cloudflare Access: check the service token.';

	/// en: 'Could not reach the server.'
	String get testFailed => 'Could not reach the server.';
}

// Path: settings.exchange
class Translations$settings$exchange$en {
	Translations$settings$exchange$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Exchange rates'
	String get title => 'Exchange rates';

	/// en: 'Rates you enter here are saved in Firefly and used to convert every amount: the most recent rate on or before each date applies.'
	String get hint => 'Rates you enter here are saved in Firefly and used to convert every amount: the most recent rate on or before each date applies.';

	/// en: 'Currency'
	String get currency => 'Currency';

	/// en: 'Date'
	String get date => 'Date';

	/// en: 'Rate'
	String get rate => 'Rate';

	/// en: '1 {{currency}} = how many {{primary}}'
	String rateHint({required Object currency, required Object primary}) => '1 ${currency} = how many ${primary}';

	/// en: 'Add rate'
	String get add => 'Add rate';

	/// en: 'Replace rate'
	String get replace => 'Replace rate';

	/// en: 'Edit'
	String get edit => 'Edit';

	/// en: 'No rates stored yet.'
	String get none => 'No rates stored yet.';

	/// en: 'Rate saved'
	String get saved => 'Rate saved';

	/// en: 'Rate deleted'
	String get deleted => 'Rate deleted';

	/// en: 'Delete rate'
	String get deleteTitle => 'Delete rate';

	/// en: 'Delete the {{currency}} rate of {{date}}? Amounts will convert with the previous rate.'
	String deleteMessage({required Object currency, required Object date}) => 'Delete the ${currency} rate of ${date}? Amounts will convert with the previous rate.';

	/// en: 'This day already has a rate: saving replaces it.'
	String get replacing => 'This day already has a rate: saving replaces it.';
}

// Path: settings.sources
class Translations$settings$sources$en {
	Translations$settings$sources$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Firefly'
	String get firefly => 'Firefly';

	/// en: 'Fallback'
	String get fallback => 'Fallback';
}

// Path: forms.errors
class Translations$forms$errors$en {
	Translations$forms$errors$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'This field is required.'
	String get required => 'This field is required.';

	/// en: 'Enter an amount greater than zero.'
	String get positive => 'Enter an amount greater than zero.';

	/// en: 'Enter a valid amount.'
	String get amount => 'Enter a valid amount.';

	/// en: 'Pick a valid date.'
	String get date => 'Pick a valid date.';

	/// en: 'Enter a valid time, like 18:30.'
	String get time => 'Enter a valid time, like 18:30.';

	/// en: 'The value is too low.'
	String get min => 'The value is too low.';

	/// en: 'The value is too high.'
	String get max => 'The value is too high.';

	/// en: 'It is too short.'
	String get minlength => 'It is too short.';

	/// en: 'It is too long.'
	String get maxlength => 'It is too long.';

	/// en: 'The format is not valid.'
	String get pattern => 'The format is not valid.';

	/// en: 'Enter a valid email.'
	String get email => 'Enter a valid email.';

	/// en: 'These two accounts can't be combined.'
	String get combination => 'These two accounts can\'t be combined.';

	/// en: 'Enter the received amount.'
	String get foreign => 'Enter the received amount.';

	/// en: 'The maximum amount can't be lower than the minimum.'
	String get range => 'The maximum amount can\'t be lower than the minimum.';

	/// en: 'The end date must be after the start date.'
	String get endDate => 'The end date must be after the start date.';

	/// en: 'Enter a day between 1 and 31.'
	String get day => 'Enter a day between 1 and 31.';

	/// en: 'Pick at least one account.'
	String get accounts => 'Pick at least one account.';

	/// en: 'Enter a valid percentage.'
	String get interest => 'Enter a valid percentage.';

	/// en: 'The value is not valid.'
	String get invalid => 'The value is not valid.';
}

// Path: forms.account
class Translations$forms$account$en {
	Translations$forms$account$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'New expense account: “{{name}}”'
	String newExpense({required Object name}) => 'New expense account: “${name}”';

	/// en: 'New income source: “{{name}}”'
	String newRevenue({required Object name}) => 'New income source: “${name}”';

	/// en: 'Not compatible'
	String get incompatible => 'Not compatible';
}

// Path: forms.accountGroups
class Translations$forms$accountGroups$en {
	Translations$forms$accountGroups$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Assets'
	String get asset => 'Assets';

	/// en: 'Liabilities'
	String get liability => 'Liabilities';

	/// en: 'Expenses'
	String get expense => 'Expenses';

	/// en: 'Income'
	String get revenue => 'Income';

	/// en: 'Cash'
	String get cash => 'Cash';
}

// Path: forms.txType
class Translations$forms$txType$en {
	Translations$forms$txType$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Pick the accounts'
	String get pending => 'Pick the accounts';

	/// en: 'Invalid combination'
	String get invalid => 'Invalid combination';
}

// Path: forms.tags
class Translations$forms$tags$en {
	Translations$forms$tags$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Add a tag'
	String get placeholder => 'Add a tag';

	/// en: 'Add “{{name}}”'
	String add({required Object name}) => 'Add “${name}”';

	/// en: 'Remove {{tag}}'
	String remove({required Object tag}) => 'Remove ${tag}';
}

// Path: forms.confirm
class Translations$forms$confirm$en {
	Translations$forms$confirm$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Confirm'
	String get ok => 'Confirm';

	/// en: 'Type “{{text}}” to confirm'
	String typeToConfirm({required Object text}) => 'Type “${text}” to confirm';
}

// Path: editor.tx
class Translations$editor$tx$en {
	Translations$editor$tx$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Whether it's an expense, income or transfer follows from the accounts you pick.'
	String get description => 'Whether it\'s an expense, income or transfer follows from the accounts you pick.';

	/// en: 'What happened'
	String get what => 'What happened';

	/// en: 'Details'
	String get details => 'Details';

	/// en: 'Description'
	String get descriptionLabel => 'Description';

	/// en: 'From'
	String get from => 'From';

	/// en: 'To'
	String get to => 'To';

	/// en: 'Swap accounts'
	String get swap => 'Swap accounts';

	/// en: 'Search or type an account'
	String get accountPlaceholder => 'Search or type an account';

	/// en: 'Amount'
	String get amount => 'Amount';

	/// en: 'Received amount ({{currency}})'
	String received({required Object currency}) => 'Received amount (${currency})';

	/// en: 'Date'
	String get date => 'Date';

	/// en: 'Time (optional)'
	String get time => 'Time (optional)';

	/// en: 'Paid in another currency'
	String get otherCurrency => 'Paid in another currency';

	/// en: 'Currency'
	String get foreignCurrency => 'Currency';

	/// en: 'Amount in that currency'
	String get foreignAmount => 'Amount in that currency';

	/// en: 'Pick or create a category'
	String get categoryPlaceholder => 'Pick or create a category';

	/// en: 'Subscription'
	String get bill => 'Subscription';

	/// en: 'No subscription'
	String get noBill => 'No subscription';

	/// en: 'Notes'
	String get notes => 'Notes';

	/// en: 'Your Firefly rules and webhooks will run.'
	String get rules => 'Your Firefly rules and webhooks will run.';

	/// en: 'Stay here to create another'
	String get stay => 'Stay here to create another';

	/// en: 'Stay here after saving'
	String get stayEdit => 'Stay here after saving';

	/// en: 'Reset the form'
	String get reset => 'Reset the form';

	/// en: 'Transaction created'
	String get created => 'Transaction created';

	/// en: 'Transaction updated'
	String get updated => 'Transaction updated';

	/// en: 'Transaction deleted'
	String get deleted => 'Transaction deleted';

	/// en: 'Delete transaction'
	String get deleteTitle => 'Delete transaction';

	/// en: 'Delete “{{name}}”? This can't be undone.'
	String deleteMessage({required Object name}) => 'Delete “${name}”? This can\'t be undone.';

	/// en: '“{{name}}” has several parts: the whole transaction will be deleted. This can't be undone.'
	String deleteMessageSplits({required Object name}) => '“${name}” has several parts: the whole transaction will be deleted. This can\'t be undone.';

	late final Translations$editor$tx$notEditable$en notEditable = Translations$editor$tx$notEditable$en.internal(_root);

	/// en: 'Edit in Firefly'
	String get editInFirefly => 'Edit in Firefly';

	/// en: 'That transaction doesn't exist.'
	String get missing => 'That transaction doesn\'t exist.';

	/// en: 'Couldn't load the transaction.'
	String get loadError => 'Couldn\'t load the transaction.';

	/// en: 'New transaction'
	String get kNew => 'New transaction';

	/// en: 'Edit'
	String get edit => 'Edit';

	/// en: 'Actions'
	String get actions => 'Actions';
}

// Path: editor.fields
class Translations$editor$fields$en {
	Translations$editor$fields$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Name'
	String get name => 'Name';

	/// en: 'Notes'
	String get notes => 'Notes';

	/// en: 'Description'
	String get description => 'Description';

	/// en: 'Active'
	String get active => 'Active';

	/// en: 'Currency'
	String get currency => 'Currency';

	/// en: 'Group'
	String get group => 'Group';
}

// Path: editor.entity
class Translations$editor$entity$en {
	Translations$editor$entity$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations
	late final Translations$editor$entity$category$en category = Translations$editor$entity$category$en.internal(_root);
	late final Translations$editor$entity$tag$en tag = Translations$editor$entity$tag$en.internal(_root);
	late final Translations$editor$entity$budget$en budget = Translations$editor$entity$budget$en.internal(_root);
	late final Translations$editor$entity$bill$en bill = Translations$editor$entity$bill$en.internal(_root);
	late final Translations$editor$entity$account$en account = Translations$editor$entity$account$en.internal(_root);
	late final Translations$editor$entity$piggy$en piggy = Translations$editor$entity$piggy$en.internal(_root);
}

// Path: editor.periods
class Translations$editor$periods$en {
	Translations$editor$periods$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Daily'
	String get daily => 'Daily';

	/// en: 'Weekly'
	String get weekly => 'Weekly';

	/// en: 'Monthly'
	String get monthly => 'Monthly';

	/// en: 'Quarterly'
	String get quarterly => 'Quarterly';

	/// en: 'Half-yearly'
	String get halfYear => 'Half-yearly';

	/// en: 'Yearly'
	String get yearly => 'Yearly';
}

// Path: accounts.counterparty.descriptions
class Translations$accounts$counterparty$descriptions$en {
	Translations$accounts$counterparty$descriptions$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Where your money goes: totals, frequency and trend by expense account.'
	String get expense => 'Where your money goes: totals, frequency and trend by expense account.';

	/// en: 'Where your money comes from: totals, frequency and trend by revenue account.'
	String get income => 'Where your money comes from: totals, frequency and trend by revenue account.';
}

// Path: accounts.counterparty.calendar
class Translations$accounts$counterparty$calendar$en {
	Translations$accounts$counterparty$calendar$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Spending by day'
	String get expense => 'Spending by day';

	/// en: 'Income by day'
	String get income => 'Income by day';
}

// Path: accounts.counterparty.weekday
class Translations$accounts$counterparty$weekday$en {
	Translations$accounts$counterparty$weekday$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Spending by weekday'
	String get expense => 'Spending by weekday';

	/// en: 'Income by weekday'
	String get income => 'Income by weekday';
}

// Path: accounts.detail.tabs
class Translations$accounts$detail$tabs$en {
	Translations$accounts$detail$tabs$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Transactions'
	String get all => 'Transactions';

	/// en: 'Expenses'
	String get expenses => 'Expenses';

	/// en: 'Income'
	String get income => 'Income';

	/// en: 'Transfers'
	String get transfers => 'Transfers';
}

// Path: editor.tx.notEditable
class Translations$editor$tx$notEditable$en {
	Translations$editor$tx$notEditable$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'This transaction can't be edited here'
	String get title => 'This transaction can\'t be edited here';

	/// en: 'It has several parts. Edit it in Firefly so none is lost.'
	String get splits => 'It has several parts. Edit it in Firefly so none is lost.';

	/// en: 'It is a kind SpaceFly doesn't edit (opening balance, reconciliation…).'
	String get type => 'It is a kind SpaceFly doesn\'t edit (opening balance, reconciliation…).';
}

// Path: editor.entity.category
class Translations$editor$entity$category$en {
	Translations$editor$entity$category$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'New category'
	String get kNew => 'New category';

	/// en: 'Edit category'
	String get edit => 'Edit category';

	/// en: 'Category created'
	String get created => 'Category created';

	/// en: 'Category updated'
	String get updated => 'Category updated';

	/// en: 'Category deleted'
	String get deleted => 'Category deleted';

	/// en: 'Delete category'
	String get deleteTitle => 'Delete category';

	/// en: 'Delete the category “{{name}}”? Its transactions will become uncategorized.'
	String deleteMessage({required Object name}) => 'Delete the category “${name}”? Its transactions will become uncategorized.';
}

// Path: editor.entity.tag
class Translations$editor$entity$tag$en {
	Translations$editor$entity$tag$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'New tag'
	String get kNew => 'New tag';

	/// en: 'Edit tag'
	String get edit => 'Edit tag';

	/// en: 'Tag created'
	String get created => 'Tag created';

	/// en: 'Tag updated'
	String get updated => 'Tag updated';

	/// en: 'Tag deleted'
	String get deleted => 'Tag deleted';

	/// en: 'Delete tag'
	String get deleteTitle => 'Delete tag';

	/// en: 'Delete the tag “{{name}}”? It will be removed from all its transactions.'
	String deleteMessage({required Object name}) => 'Delete the tag “${name}”? It will be removed from all its transactions.';

	/// en: 'Date'
	String get date => 'Date';

	/// en: 'Optional: groups tags by moment (a trip, an event).'
	String get dateHint => 'Optional: groups tags by moment (a trip, an event).';
}

// Path: editor.entity.budget
class Translations$editor$entity$budget$en {
	Translations$editor$entity$budget$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'New budget'
	String get kNew => 'New budget';

	/// en: 'Edit budget'
	String get edit => 'Edit budget';

	/// en: 'Budget created'
	String get created => 'Budget created';

	/// en: 'Budget updated'
	String get updated => 'Budget updated';

	/// en: 'Budget deleted'
	String get deleted => 'Budget deleted';

	/// en: 'Delete budget'
	String get deleteTitle => 'Delete budget';

	/// en: 'Delete the budget “{{name}}”? Its transactions will have no budget.'
	String deleteMessage({required Object name}) => 'Delete the budget “${name}”? Its transactions will have no budget.';

	/// en: 'Automatic budget'
	String get auto => 'Automatic budget';

	/// en: 'Firefly sets the amount by itself at the start of each period.'
	String get autoHint => 'Firefly sets the amount by itself at the start of each period.';

	/// en: 'Type'
	String get autoType => 'Type';

	/// en: 'Amount per period'
	String get autoAmount => 'Amount per period';

	/// en: 'Period'
	String get autoPeriod => 'Period';

	late final Translations$editor$entity$budget$autoTypes$en autoTypes = Translations$editor$entity$budget$autoTypes$en.internal(_root);
}

// Path: editor.entity.bill
class Translations$editor$entity$bill$en {
	Translations$editor$entity$bill$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'New subscription'
	String get kNew => 'New subscription';

	/// en: 'Edit subscription'
	String get edit => 'Edit subscription';

	/// en: 'Subscription created'
	String get created => 'Subscription created';

	/// en: 'Subscription updated'
	String get updated => 'Subscription updated';

	/// en: 'Subscription deleted'
	String get deleted => 'Subscription deleted';

	/// en: 'Delete subscription'
	String get deleteTitle => 'Delete subscription';

	/// en: 'Delete the subscription “{{name}}”? Its transactions are kept but no longer linked.'
	String deleteMessage({required Object name}) => 'Delete the subscription “${name}”? Its transactions are kept but no longer linked.';

	/// en: 'Fixed amount'
	String get fixed => 'Fixed amount';

	/// en: 'Amount'
	String get amount => 'Amount';

	/// en: 'Minimum amount'
	String get amountMin => 'Minimum amount';

	/// en: 'Maximum amount'
	String get amountMax => 'Maximum amount';

	/// en: 'Frequency'
	String get freq => 'Frequency';

	/// en: 'Skip periods'
	String get skip => 'Skip periods';

	/// en: '0 = every period; 1 = every other one.'
	String get skipHint => '0 = every period; 1 = every other one.';

	/// en: 'First date'
	String get date => 'First date';

	/// en: 'End date'
	String get endDate => 'End date';

	/// en: 'Optional: leave empty if it doesn't end.'
	String get endDateHint => 'Optional: leave empty if it doesn\'t end.';
}

// Path: editor.entity.account
class Translations$editor$entity$account$en {
	Translations$editor$entity$account$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'New account'
	String get kNew => 'New account';

	/// en: 'Edit account'
	String get edit => 'Edit account';

	/// en: 'Account created'
	String get created => 'Account created';

	/// en: 'Account updated'
	String get updated => 'Account updated';

	/// en: 'Account deleted'
	String get deleted => 'Account deleted';

	/// en: 'Delete account'
	String get deleteTitle => 'Delete account';

	/// en: 'Delete the account “{{name}}”?'
	String deleteMessage({required Object name}) => 'Delete the account “${name}”?';

	/// en: 'Its {{count}} transactions will be deleted too. This can't be undone.'
	String deleteWarning({required Object count}) => 'Its ${count} transactions will be deleted too. This can\'t be undone.';

	/// en: 'Account type'
	String get type => 'Account type';

	late final Translations$editor$entity$account$types$en types = Translations$editor$entity$account$types$en.internal(_root);

	/// en: 'The type can't be changed after the account is created.'
	String get typeLocked => 'The type can\'t be changed after the account is created.';

	/// en: 'Use'
	String get role => 'Use';

	/// en: 'IBAN'
	String get iban => 'IBAN';

	/// en: 'Opening balance'
	String get openingBalance => 'Opening balance';

	/// en: 'Opening balance date'
	String get openingBalanceDate => 'Opening balance date';

	/// en: 'Include in net worth'
	String get includeNetWorth => 'Include in net worth';

	/// en: 'Card type'
	String get cardType => 'Card type';

	late final Translations$editor$entity$account$cardTypes$en cardTypes = Translations$editor$entity$account$cardTypes$en.internal(_root);

	/// en: 'Payment day'
	String get paymentDay => 'Payment day';

	/// en: 'Liability type'
	String get liabilityType => 'Liability type';

	late final Translations$editor$entity$account$liabilityTypes$en liabilityTypes = Translations$editor$entity$account$liabilityTypes$en.internal(_root);

	/// en: 'Who owes'
	String get direction => 'Who owes';

	late final Translations$editor$entity$account$directions$en directions = Translations$editor$entity$account$directions$en.internal(_root);

	/// en: 'Interest (%)'
	String get interest => 'Interest (%)';

	/// en: 'Interest period'
	String get interestPeriod => 'Interest period';

	late final Translations$editor$entity$account$interestPeriods$en interestPeriods = Translations$editor$entity$account$interestPeriods$en.internal(_root);

	/// en: 'Amount owed'
	String get owed => 'Amount owed';

	/// en: 'Start date'
	String get startDate => 'Start date';
}

// Path: editor.entity.piggy
class Translations$editor$entity$piggy$en {
	Translations$editor$entity$piggy$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'New goal'
	String get kNew => 'New goal';

	/// en: 'Edit goal'
	String get edit => 'Edit goal';

	/// en: 'Goal created'
	String get created => 'Goal created';

	/// en: 'Goal updated'
	String get updated => 'Goal updated';

	/// en: 'Goal deleted'
	String get deleted => 'Goal deleted';

	/// en: 'Delete goal'
	String get deleteTitle => 'Delete goal';

	/// en: 'Delete the goal “{{name}}”? The money set aside becomes free again in its accounts.'
	String deleteMessage({required Object name}) => 'Delete the goal “${name}”? The money set aside becomes free again in its accounts.';

	/// en: 'Goal amount'
	String get target => 'Goal amount';

	/// en: 'Start date'
	String get startDate => 'Start date';

	/// en: 'Target date'
	String get targetDate => 'Target date';

	/// en: 'Accounts'
	String get accounts => 'Accounts';

	/// en: 'Add an account…'
	String get addAccount => 'Add an account…';

	/// en: 'Pick at least one account.'
	String get none => 'Pick at least one account.';

	/// en: 'Set aside'
	String get saved => 'Set aside';

	/// en: 'Adjust'
	String get adjust => 'Adjust';

	/// en: 'Amount to add or remove'
	String get adjustLabel => 'Amount to add or remove';

	/// en: 'Add'
	String get add => 'Add';

	/// en: 'Remove'
	String get subtract => 'Remove';

	/// en: 'Remove {{name}}'
	String remove({required Object name}) => 'Remove ${name}';

	/// en: 'Add or remove money set aside in each account; it is saved when you press Save.'
	String get adjustHint => 'Add or remove money set aside in each account; it is saved when you press Save.';
}

// Path: editor.entity.budget.autoTypes
class Translations$editor$entity$budget$autoTypes$en {
	Translations$editor$entity$budget$autoTypes$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Reset every period'
	String get reset => 'Reset every period';

	/// en: 'Roll over what's left'
	String get rollover => 'Roll over what\'s left';

	/// en: 'Adjust to what was spent'
	String get adjusted => 'Adjust to what was spent';
}

// Path: editor.entity.account.types
class Translations$editor$entity$account$types$en {
	Translations$editor$entity$account$types$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Asset'
	String get asset => 'Asset';

	/// en: 'Liability'
	String get liability => 'Liability';

	/// en: 'Expense'
	String get expense => 'Expense';

	/// en: 'Income'
	String get revenue => 'Income';
}

// Path: editor.entity.account.cardTypes
class Translations$editor$entity$account$cardTypes$en {
	Translations$editor$entity$account$cardTypes$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Full monthly payment'
	String get monthlyFull => 'Full monthly payment';
}

// Path: editor.entity.account.liabilityTypes
class Translations$editor$entity$account$liabilityTypes$en {
	Translations$editor$entity$account$liabilityTypes$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Loan'
	String get loan => 'Loan';

	/// en: 'Debt'
	String get debt => 'Debt';

	/// en: 'Mortgage'
	String get mortgage => 'Mortgage';
}

// Path: editor.entity.account.directions
class Translations$editor$entity$account$directions$en {
	Translations$editor$entity$account$directions$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'I owe'
	String get debit => 'I owe';

	/// en: 'I am owed'
	String get credit => 'I am owed';
}

// Path: editor.entity.account.interestPeriods
class Translations$editor$entity$account$interestPeriods$en {
	Translations$editor$entity$account$interestPeriods$en.internal(this._root);

	final Translations _root; // ignore: unused_field

	// Translations

	/// en: 'Daily'
	String get daily => 'Daily';

	/// en: 'Monthly'
	String get monthly => 'Monthly';

	/// en: 'Yearly'
	String get yearly => 'Yearly';
}

/// The flat map containing all translations for locale <en>.
/// Only for edge cases! For simple maps, use the map function of this library.
///
/// The Dart AOT compiler has issues with very large switch statements,
/// so the map is split into smaller functions (512 entries each).
extension on Translations {
	dynamic _flatMapFunction(String path) {
		return switch (path) {
			'lang.es' => 'Español',
			'lang.en' => 'English',
			'theme.midnight' => 'Midnight',
			'theme.earth' => 'Earth',
			'theme.dusk' => 'Dusk',
			'common.income' => 'Income',
			'common.expenses' => 'Expenses',
			'common.net' => 'Net',
			'common.savingsRate' => 'Savings rate',
			'common.netWorth' => 'Net worth',
			'common.month' => 'Month',
			'common.search' => 'Search…',
			'common.noResults' => 'No results',
			'common.date' => 'Date',
			'common.amount' => 'Amount',
			'common.total' => 'Total',
			'common.category' => 'Category',
			'common.budget' => 'Budget',
			'common.account' => 'Account',
			'common.tag' => 'Tag',
			'common.uncategorized' => 'Uncategorized',
			'common.untagged' => 'Untagged',
			'common.noBudget' => 'No budget',
			'common.others' => 'Others',
			'common.noData' => 'No data for this period',
			'common.viewAll' => 'View all',
			'nav.menu' => 'Menu',
			'nav.readOnly' => 'reports & data entry',
			'nav.toggle' => 'Toggle menu',
			'nav.skipToContent' => 'Skip to content',
			'nav.breadcrumb' => 'Breadcrumb',
			'nav.sections.general' => 'General',
			'nav.sections.reports' => 'Reports',
			'nav.sections.analysis' => 'Analysis',
			'nav.sections.accounts' => 'Accounts',
			'nav.sections.planning' => 'Planning',
			'nav.sections.transactions' => 'Transactions',
			'nav.sections.create' => 'Create',
			'nav.sections.system' => 'System',
			'nav.dashboard' => 'Dashboard',
			'nav.monthly' => 'Monthly summary',
			'nav.annual' => 'Annual report',
			'nav.flow' => 'Money flow',
			'nav.calendar' => 'Calendar',
			'nav.compare' => 'Comparisons',
			'nav.categories' => 'Categories',
			'nav.tags' => 'Tags',
			'nav.budgets' => 'Budgets',
			'nav.merchants' => 'Merchants',
			'nav.incomeSources' => 'Income sources',
			'nav.assetAccounts' => 'Asset accounts',
			'nav.expenseAccounts' => 'Expense accounts',
			'nav.revenueAccounts' => 'Revenue accounts',
			'nav.accountDetail' => 'Account detail',
			'nav.netWorth' => 'Net worth',
			'nav.savings' => 'Savings',
			'nav.bills' => 'Subscriptions',
			'nav.recurring' => 'Recurring',
			'nav.goals' => 'Goals',
			'nav.projection' => 'Cash-flow projection',
			'nav.explorer' => 'Explorer',
			'nav.newTransaction' => 'New transaction',
			'nav.editTransaction' => 'Edit transaction',
			'nav.more' => 'More',
			'nav.settings' => 'Settings',
			'nav.about' => 'About',
			'topbar.refresh' => 'Refresh data',
			'topbar.refreshed' => 'Data refreshed from Firefly',
			'topbar.language' => 'Language',
			'topbar.theme' => 'Theme',
			'topbar.hideAmounts' => 'Hide amounts',
			'topbar.showAmounts' => 'Show amounts',
			'topbar.account' => 'User account',
			'topbar.openFirefly' => 'Open Firefly III',
			'topbar.logout' => 'Sign out',
			'login.subtitle' => 'Interactive reports for your Firefly III',
			'login.button' => 'Sign in with Firefly',
			'login.readOnly' => 'SpaceFly reads your Firefly III data and lets you record and edit it. Your token never reaches the browser.',
			'login.errors.invalidState' => 'The sign-in attempt expired or is invalid. Please try again.',
			'login.errors.tokenExchange' => 'Firefly rejected the sign-in. Check the OAuth client.',
			'login.errors.accessDenied' => 'Authorization was cancelled in Firefly.',
			'login.errors.cfAccess' => 'Cloudflare Access blocked the app. Check the service token (client ID and secret).',
			'login.errors.generic' => 'Could not sign in.',
			'errors.load' => 'Could not load the data',
			'errors.generic' => 'Something went wrong. Please try again.',
			'errors.version' => ({required Object version, required Object min}) => 'Your Firefly III is ${version}; SpaceFly requires ${min} or newer. Some figures may be wrong.',
			'period.previous' => 'Previous period',
			'period.next' => 'Next period',
			'period.custom' => 'Custom range',
			'period.from' => 'From',
			'period.to' => 'To',
			'period.apply' => 'Apply',
			'period.quarterShort' => 'Q',
			'period.ytdShort' => 'YTD',
			'period.presets.thisMonth' => 'This month',
			'period.presets.lastMonth' => 'Last month',
			'period.presets.last30' => 'Last 30 days',
			'period.presets.last6m' => 'Last 6 months',
			'period.presets.thisQuarter' => 'This quarter',
			'period.presets.thisYear' => 'This year',
			'period.presets.lastYear' => 'Last year',
			'period.presets.ytd' => 'Year to date',
			'currency.label' => 'Display currency',
			'kpi.vsPrevious' => 'Previous:',
			'chart.showTable' => 'Show as table',
			'chart.showChart' => 'Show chart',
			'chart.download' => 'Download PNG',
			'tx.none' => 'No transactions',
			'tx.count' => 'Transactions',
			'tx.breakdown' => 'Categories in this group',
			'tx.openInFirefly' => 'Open in Firefly',
			'txType.withdrawal' => 'Expense',
			'txType.deposit' => 'Income',
			'txType.transfer' => 'Transfer',
			'txType.openingBalance' => 'Opening balance',
			'txType.reconciliation' => 'Reconciliation',
			'txType.liabilityCredit' => 'Liability credit',
			'dashboard.description' => 'Your finances at a glance.',
			'dashboard.incomeVsExpense' => 'Income vs expenses',
			'dashboard.last12' => 'Last 12 months',
			'dashboard.topCategories' => 'Top spending categories',
			'dashboard.upcomingBills' => 'Upcoming subscriptions',
			'dashboard.noUpcoming' => 'Nothing scheduled in the next 30 days',
			'dashboard.largest' => 'Largest expenses',
			'monthly.description' => 'The email report, interactive and for any period.',
			'monthly.earned' => 'Earned',
			'monthly.spent' => 'Spent',
			'monthly.netChange' => 'Net change',
			'monthly.categories' => 'Category summary',
			'monthly.vsPrevious' => ({required Object month}) => 'vs ${month}',
			'monthly.kNew' => 'New',
			'monthly.moneyFlow' => 'Money flow',
			'monthly.openInteractive' => 'Open interactive',
			'monthly.dailyCashFlow' => 'Daily cash flow',
			'monthly.budgets' => 'Budget summary',
			'monthly.top5' => 'Top 5 largest expenses',
			'monthly.assetActivity' => 'Asset account activity',
			'monthly.topIncome' => 'Top income',
			'monthly.topExpenses' => 'Top expenses',
			'monthly.savings' => ({required Object n}) => 'Savings accounts – balance (last ${n} months)',
			'monthly.overview' => 'Financial overview',
			'monthly.thisPeriod' => 'This period',
			'monthly.ytd' => 'Year to date',
			'monthly.currentNetWorth' => 'Current net worth',
			'budget.description' => 'Limit vs spent, spending pace and historical compliance.',
			'budget.limit' => 'Limit',
			'budget.spent' => 'Spent',
			'budget.remaining' => 'Remaining',
			'budget.none' => 'No budgets with activity in this period',
			'budget.expectedPace' => 'Expected pace to date',
			'budget.status.good' => 'On track',
			'budget.status.warning' => 'Near limit',
			'budget.status.critical' => 'Over budget',
			'budget.auto.reset' => 'Auto · reset',
			'budget.auto.rollover' => 'Auto · rollover',
			'budget.auto.adjusted' => 'Auto · adjusted',
			'budget.totalLimit' => 'Total limit',
			'budget.spentInBudgets' => 'Spent in budgets',
			'budget.unbudgeted' => 'Outside budgets',
			'budget.available' => 'Available to budget',
			'budget.projection' => 'Projected at period end:',
			'budget.overBy' => ({required Object amount}) => 'over by ${amount}',
			'budget.history' => ({required Object name}) => '${name} · last 12 months',
			'budget.byCategory' => ({required Object name}) => '${name} by category',
			'sankey.totalIncome' => 'Total income',
			'sankey.savings' => 'Savings',
			'sankey.netSavings' => 'Net savings',
			'sankey.deficit' => 'Deficit',
			'sankey.othersExpense' => 'Other expenses',
			'sankey.othersIncome' => 'Other sources',
			'sankey.othersTags' => 'Other tags',
			'sankey.kinds.revenue' => 'Income source',
			'sankey.kinds.incomeCat' => 'Income category',
			'sankey.kinds.hub' => 'Total',
			'sankey.kinds.budget' => 'Budget',
			'sankey.kinds.tag' => 'Tag',
			'sankey.kinds.category' => 'Expense category',
			'sankey.kinds.savings' => 'Savings',
			'sankey.kinds.deficit' => 'Deficit',
			'sankey.kinds.other' => 'Others',
			'flow.title' => 'Money flow',
			'flow.description' => 'Where your money comes from and where it goes.',
			'flow.hint' => 'Hover to highlight a path · click a node to see its transactions · drag to rearrange',
			'flow.byBudget' => 'By budget',
			'flow.byTags' => 'By tags',
			'flow.showBudgets' => 'Budgets',
			'flow.showIncomeCategories' => 'Income categories',
			'flow.groupSmall' => 'Group flows below',
			'flow.from' => 'From',
			'flow.to' => 'To',
			'flow.shareOfIncome' => '% of income',
			'calendar.title' => 'Income and expense calendar',
			'calendar.description' => 'Day-by-day income and expenses, plus what\'s scheduled.',
			'calendar.month' => 'Month',
			'calendar.year' => 'Year',
			'calendar.allAccounts' => 'All accounts',
			'calendar.allCategories' => 'All categories',
			'calendar.allTags' => 'All tags',
			'calendar.endBalance' => 'Closing balance',
			'calendar.clickDay' => 'Click a day to see its transactions',
			'calendar.runningBalance' => 'Running balance',
			'calendar.balance' => 'Balance',
			'calendar.noBalance' => 'The running balance doesn\'t apply with category or tag filters',
			'calendar.scheduled' => 'Scheduled this month',
			'calendar.noScheduled' => 'Nothing scheduled',
			'calendar.bill' => 'Subscription',
			'calendar.recurrence' => 'Recurring',
			'calendar.heatmapTitle' => ({required Object year}) => 'Spending intensity ${year}',
			'calendar.heatmapHint' => 'Each cell is a day; darker = more spending',
			'compare.description' => 'Compare two periods by category, tag, budget, account or merchant.',
			'compare.previous' => 'vs previous period',
			'compare.yoy' => 'vs last year',
			'compare.custom' => 'Custom range',
			'compare.groupBy' => 'Group by',
			'compare.deltaTitle' => 'Biggest changes (A − B)',
			'compare.deltaHintExpense' => 'Red = you spent more · blue = you spent less',
			'compare.deltaHintIncome' => 'Blue = you earned more · red = you earned less',
			'compare.trend' => '12-month trend',
			'compare.groups.category' => 'Category',
			'compare.groups.tag' => 'Tag',
			'compare.groups.budget' => 'Budget',
			'compare.groups.account' => 'Account',
			'compare.groups.counterparty' => 'Merchant / source',
			'annual.title' => ({required Object year}) => 'Annual report ${year}',
			'annual.description' => 'The year month by month: totals, best and worst month, and categories.',
			'annual.avgIncome' => 'Average monthly income',
			'annual.avgExpense' => 'Average monthly spending',
			'annual.best' => 'Best month',
			'annual.worst' => 'Worst month',
			'annual.byMonth' => 'Income and expenses by month',
			'annual.savingsRate' => 'Monthly savings rate',
			'annual.matrix' => 'Spending by category and month',
			'annual.matrixHint' => 'Top 15 categories; click a cell to see transactions',
			'ranking.descriptions.categories' => 'Ranking, distribution and trend by category.',
			'ranking.descriptions.tags' => 'Ranking, distribution and trend by tag.',
			'ranking.descriptions.merchants' => 'Who you pay the most: frequency, average ticket and trend.',
			'ranking.descriptions.incomeSources' => 'Where your income comes from.',
			'ranking.items' => 'Items',
			'ranking.transactions' => 'Transactions',
			'ranking.avgTicket' => 'Average ticket',
			'ranking.distribution' => 'Distribution',
			'ranking.trend' => 'Trend',
			'ranking.trendHint' => 'Top items, last 12 months',
			'ranking.name' => 'Name',
			'ranking.share' => '% of total',
			'ranking.count' => 'Count',
			'ranking.previous' => 'Previous period',
			'ranking.views.bars' => 'Bars',
			'ranking.views.treemap' => 'Treemap',
			'ranking.views.sunburst' => 'Budgets',
			'accounts.description' => 'Current balances and how they evolved.',
			'accounts.history' => 'Months of history',
			'accounts.monthsShort' => 'm',
			'accounts.total' => 'Total in accounts',
			'accounts.balanceOriginal' => 'Balance (original currency)',
			'accounts.balance' => 'Balance',
			'accounts.balanceHistory' => 'Balance history',
			'accounts.excluded' => 'Excluded',
			'accounts.roles.defaultAsset' => 'Default',
			'accounts.roles.sharedAsset' => 'Shared',
			'accounts.roles.savingAsset' => 'Savings',
			'accounts.roles.ccAsset' => 'Credit card',
			'accounts.roles.cashWalletAsset' => 'Cash',
			'accounts.reorder.start' => 'Reorder',
			'accounts.reorder.done' => 'Done',
			'accounts.reorder.reset' => 'Reset order',
			'accounts.reorder.hint' => 'Drag the rows or use the arrows. The order saves itself.',
			'accounts.reorder.up' => ({required Object name}) => 'Move ${name} up',
			'accounts.reorder.down' => ({required Object name}) => 'Move ${name} down',
			'accounts.counterparty.descriptions.expense' => 'Where your money goes: totals, frequency and trend by expense account.',
			'accounts.counterparty.descriptions.income' => 'Where your money comes from: totals, frequency and trend by revenue account.',
			'accounts.counterparty.showEmpty' => 'Show without activity',
			'accounts.counterparty.lastActivity' => 'Last activity',
			'accounts.counterparty.monthly' => 'Last 12 months',
			'accounts.counterparty.topAccounts' => 'Busiest accounts',
			'accounts.counterparty.activeAccounts' => 'Accounts with activity',
			'accounts.counterparty.never' => 'No recent activity',
			'accounts.counterparty.share' => '% of total',
			'accounts.counterparty.notFoundHint' => 'It may not be an account of this type, or it was deleted.',
			'accounts.counterparty.calendar.expense' => 'Spending by day',
			'accounts.counterparty.calendar.income' => 'Income by day',
			'accounts.counterparty.weekday.expense' => 'Spending by weekday',
			'accounts.counterparty.weekday.income' => 'Income by weekday',
			'accounts.counterparty.paidFrom' => 'Paid from',
			'accounts.counterparty.receivedIn' => 'Received in',
			'accounts.counterparty.byCategory' => 'By category',
			'accounts.counterparty.biggest' => 'Biggest transaction',
			'accounts.counterparty.lastTransaction' => 'Last transaction',
			'accounts.counterparty.monthlyAverage' => 'Monthly average (12 months)',
			'accounts.counterparty.total12' => '12-month total',
			'accounts.counterparty.fromAccount' => 'Account',
			'accounts.detail.back' => 'Back to accounts',
			'accounts.detail.closing' => 'Closing balance',
			'accounts.detail.opening' => 'Opening balance',
			'accounts.detail.change' => 'Change',
			'accounts.detail.lowest' => 'Lowest balance',
			'accounts.detail.highest' => 'Highest balance',
			'accounts.detail.avgDailyExpense' => 'Average daily spending',
			'accounts.detail.biggestExpense' => 'Biggest expense',
			'accounts.detail.biggestIncome' => 'Biggest income',
			'accounts.detail.netTransfers' => 'Net transfers',
			'accounts.detail.records' => 'Records',
			'accounts.detail.stats' => 'Period summary',
			'accounts.detail.dailyBalance' => 'Balance by day',
			'accounts.detail.dailyFlow' => 'Income and expenses by day',
			'accounts.detail.zoomHint' => 'Use the wheel or drag to zoom',
			'accounts.detail.monthly' => 'Last 12 months',
			'accounts.detail.byWeekday' => 'Spending by weekday',
			'accounts.detail.topCategories' => 'What it\'s spent on',
			'accounts.detail.topMerchants' => 'Where it\'s spent',
			'accounts.detail.topIncomeSources' => 'Where the money comes from',
			'accounts.detail.transferIn' => 'Transfers received',
			'accounts.detail.transferOut' => 'Transfers sent',
			'accounts.detail.closingBalance' => 'Closing balance',
			'accounts.detail.tabs.all' => 'Transactions',
			'accounts.detail.tabs.expenses' => 'Expenses',
			'accounts.detail.tabs.income' => 'Income',
			'accounts.detail.tabs.transfers' => 'Transfers',
			'accounts.detail.counterparty' => 'Counterparty',
			'accounts.detail.balanceAfter' => 'Balance',
			'accounts.detail.periodTotal' => 'Filter total',
			'accounts.detail.notFound' => 'We couldn\'t find this account',
			'accounts.detail.notFoundHint' => 'It may not be an asset account, or it was deleted.',
			'netWorth.description' => 'Your net worth over time.',
			'netWorth.current' => 'Current net worth',
			'netWorth.change' => ({required Object n}) => 'Change over ${n} months',
			'netWorth.total' => 'Total net worth',
			'netWorth.byAccount' => 'By account',
			'netWorth.stackedHint' => 'Stacked area of positive balances',
			'savings.description' => 'Balances of your savings accounts (excluding credit cards and excluded accounts).',
			'savings.total' => 'Total saved',
			'savings.accounts' => 'Accounts',
			'savings.perAccount' => 'Per-account history',
			'savings.manageExcluded' => 'Excluded accounts',
			'bills.description' => 'Cost, upcoming dates and payments of your subscriptions.',
			'bills.monthly' => 'Monthly equivalent cost',
			'bills.yearly' => 'Yearly cost',
			'bills.paid' => 'Paid this period',
			'bills.pendingAmount' => ({required Object n}) => 'Pending (${n})',
			'bills.name' => 'Subscription',
			'bills.status' => 'Status',
			'bills.next' => 'Next',
			'bills.range' => 'Expected range',
			'bills.monthlyEq' => 'Monthly eq.',
			'bills.paidThisPeriod' => 'Payments this period',
			'bills.outOfRange' => 'Out of range',
			'bills.skip' => ({required Object n}) => 'every ${n}',
			'bills.none' => 'You have no subscriptions in Firefly',
			'bills.costRanking' => 'Yearly cost per subscription',
			'bills.costRankingHint' => 'Active subscriptions only',
			'bills.last12Months' => 'Last 12 months',
			'bills.selectedPeriod' => 'Selected period',
			'bills.statuses.paid' => 'Paid',
			'bills.statuses.pending' => 'Pending',
			'bills.statuses.notExpected' => 'Not due',
			'bills.freq.weekly' => 'Weekly',
			'bills.freq.monthly' => 'Monthly',
			'bills.freq.quarterly' => 'Quarterly',
			'bills.freq.halfYear' => 'Half-yearly',
			'bills.freq.yearly' => 'Yearly',
			'recurring.description' => 'Recurring transactions configured in Firefly and their next dates.',
			'recurring.list' => 'Recurring',
			'recurring.next' => 'Next dates',
			'recurring.until' => ({required Object date}) => 'Until ${date}',
			'recurring.inactive' => 'Inactive',
			'recurring.none' => 'You have no recurring transactions',
			'goals.description' => 'Your piggy banks: progress and estimated date based on your contribution pace.',
			'goals.saved' => 'Total saved',
			'goals.target' => 'Total target',
			'goals.current' => 'Saved',
			'goals.goal' => 'Target',
			'goals.pace' => 'Pace (6 months)',
			'goals.month' => 'month',
			'goals.left' => 'Left',
			'goals.targetDate' => 'Target date',
			'goals.estimated' => 'Estimated',
			'goals.noPace' => 'no recent contributions',
			'goals.onTrack' => 'On track',
			'goals.behind' => 'Behind',
			'goals.none' => 'You have no piggy banks in Firefly',
			'projection.description' => 'Current balance + scheduled recurring transactions and subscriptions.',
			'projection.daysShort' => 'd',
			'projection.today' => 'Balance today',
			'projection.kIn' => ({required Object n}) => 'In ${n} days',
			'projection.chart' => 'Projected balance',
			'projection.lowest' => ({required Object amount, required Object date}) => 'Lowest point: ${amount} on ${date}',
			'projection.events' => 'Scheduled movements',
			'projection.noEvents' => 'Nothing scheduled in this horizon',
			'projection.inflow' => 'Inflows',
			'projection.outflow' => 'Outflows',
			'explorer.allTypes' => 'All',
			'explorer.description' => 'Search, filter, sort and export your transactions.',
			'explorer.search' => 'Search',
			'explorer.clear' => 'Clear',
			'explorer.searchPlaceholder' => 'Description, account or note…  (or Firefly syntax: amount_more:500 category_is:Food)',
			'explorer.fireflySyntax' => 'Search all of Firefly (Firefly syntax)',
			'explorer.fireflySyntaxHint' => 'Uses Firefly\'s search across all your transactions, not limited to the period',
			'explorer.allBudgets' => 'All budgets',
			'explorer.results' => ({required Object n}) => '${n} results',
			'explorer.descriptionCol' => 'Description',
			'explorer.export' => 'Export CSV',
			'explorer.exportHidden' => 'Export is disabled while amounts are hidden',
			'explorer.page' => ({required Object page, required Object pages}) => 'Page ${page} of ${pages}',
			'settings.mobile.signedIn' => 'Signed in',
			'settings.mobile.server' => 'Server',
			'settings.mobile.serverUrl' => 'Server URL',
			'settings.mobile.invalidUrl' => 'Enter a valid URL (https://…).',
			'settings.mobile.access' => 'Cloudflare Access',
			'settings.mobile.accessHint' => 'Only needed if your server sits behind Cloudflare Access: a service token (client ID and secret).',
			'settings.mobile.clientId' => 'Client ID',
			'settings.mobile.clientSecret' => 'Client secret',
			'settings.mobile.save' => 'Save',
			'settings.mobile.saved' => 'Server settings saved',
			'settings.mobile.test' => 'Test connection',
			'settings.mobile.testOk' => 'Connection OK',
			'settings.mobile.testBlocked' => 'Blocked by Cloudflare Access: check the service token.',
			'settings.mobile.testFailed' => 'Could not reach the server.',
			'settings.description' => 'SpaceFly preferences (stored in SpaceFly, never in Firefly).',
			'settings.save' => 'Save',
			'settings.saved' => 'Settings saved',
			'settings.excluded' => 'Excluded accounts',
			'settings.excludedHint' => 'Hidden from savings, net worth and projection (same as the script\'s exclude_accounts).',
			'settings.preferences' => 'Preferences',
			'settings.balanceMonths' => 'Default months of balance history',
			'settings.sankeyThreshold' => 'Sankey "Others" threshold',
			'settings.exchange.title' => 'Exchange rates',
			'settings.exchange.hint' => 'Rates you enter here are saved in Firefly and used to convert every amount: the most recent rate on or before each date applies.',
			'settings.exchange.currency' => 'Currency',
			'settings.exchange.date' => 'Date',
			'settings.exchange.rate' => 'Rate',
			'settings.exchange.rateHint' => ({required Object currency, required Object primary}) => '1 ${currency} = how many ${primary}',
			'settings.exchange.add' => 'Add rate',
			'settings.exchange.replace' => 'Replace rate',
			'settings.exchange.edit' => 'Edit',
			'settings.exchange.none' => 'No rates stored yet.',
			'settings.exchange.saved' => 'Rate saved',
			'settings.exchange.deleted' => 'Rate deleted',
			'settings.exchange.deleteTitle' => 'Delete rate',
			'settings.exchange.deleteMessage' => ({required Object currency, required Object date}) => 'Delete the ${currency} rate of ${date}? Amounts will convert with the previous rate.',
			'settings.exchange.replacing' => 'This day already has a rate: saving replaces it.',
			'settings.rates' => 'Rates in use',
			'settings.ratesHint' => 'The most recent rate stored in Firefly on or before each date; open.er-api.com is used when there is none.',
			'settings.pair' => 'Pair',
			'settings.rate' => 'Rate',
			'settings.source' => 'Source',
			'settings.sources.firefly' => 'Firefly',
			'settings.sources.fallback' => 'Fallback',
			'about.version' => 'Version',
			'about.supported' => ({required Object min}) => 'Supported (≥ ${min})',
			'about.unsupported' => ({required Object min}) => 'Unsupported (< ${min})',
			'about.primary' => 'Primary currency',
			'about.user' => 'User',
			'about.instance' => 'Instance',
			'about.body' => 'SpaceFly reads and writes your Firefly III data through its server, which also protects writes against requests from other sites. Your token never reaches the browser.',
			'forms.createOption' => ({required Object name}) => 'Create “${name}”',
			'forms.moreResults' => ({required Object count}) => '${count} more; type to search',
			'forms.today' => 'Today',
			'forms.now' => 'Now',
			'forms.pickDate' => 'Pick a date',
			'forms.pickTime' => 'Pick a time',
			'forms.hour' => 'Hour',
			'forms.minute' => 'Minute',
			'forms.clear' => 'Clear',
			'forms.ok' => 'OK',
			'forms.previousMonth' => 'Previous month',
			'forms.nextMonth' => 'Next month',
			'forms.yesterday' => 'Yesterday',
			'forms.save' => 'Save',
			'forms.saving' => 'Saving…',
			'forms.cancel' => 'Cancel',
			'forms.delete' => 'Delete',
			'forms.errors.required' => 'This field is required.',
			'forms.errors.positive' => 'Enter an amount greater than zero.',
			'forms.errors.amount' => 'Enter a valid amount.',
			'forms.errors.date' => 'Pick a valid date.',
			'forms.errors.time' => 'Enter a valid time, like 18:30.',
			'forms.errors.min' => 'The value is too low.',
			'forms.errors.max' => 'The value is too high.',
			'forms.errors.minlength' => 'It is too short.',
			'forms.errors.maxlength' => 'It is too long.',
			'forms.errors.pattern' => 'The format is not valid.',
			'forms.errors.email' => 'Enter a valid email.',
			'forms.errors.combination' => 'These two accounts can\'t be combined.',
			'forms.errors.foreign' => 'Enter the received amount.',
			'forms.errors.range' => 'The maximum amount can\'t be lower than the minimum.',
			'forms.errors.endDate' => 'The end date must be after the start date.',
			'forms.errors.day' => 'Enter a day between 1 and 31.',
			'forms.errors.accounts' => 'Pick at least one account.',
			'forms.errors.interest' => 'Enter a valid percentage.',
			'forms.errors.invalid' => 'The value is not valid.',
			'forms.account.newExpense' => ({required Object name}) => 'New expense account: “${name}”',
			'forms.account.newRevenue' => ({required Object name}) => 'New income source: “${name}”',
			'forms.account.incompatible' => 'Not compatible',
			'forms.accountGroups.asset' => 'Assets',
			'forms.accountGroups.liability' => 'Liabilities',
			'forms.accountGroups.expense' => 'Expenses',
			'forms.accountGroups.revenue' => 'Income',
			'forms.accountGroups.cash' => 'Cash',
			'forms.txType.pending' => 'Pick the accounts',
			'forms.txType.invalid' => 'Invalid combination',
			'forms.tags.placeholder' => 'Add a tag',
			'forms.tags.add' => ({required Object name}) => 'Add “${name}”',
			'forms.tags.remove' => ({required Object tag}) => 'Remove ${tag}',
			'forms.confirm.ok' => 'Confirm',
			'forms.confirm.typeToConfirm' => ({required Object text}) => 'Type “${text}” to confirm',
			'editor.back' => 'Back',
			'editor.retry' => 'Retry',
			'editor.networkError' => 'Couldn\'t reach the server. Check your connection: the change may not have been saved.',
			'editor.kNew' => 'New',
			'editor.newTitle' => 'Create',
			'editor.tx.description' => 'Whether it\'s an expense, income or transfer follows from the accounts you pick.',
			'editor.tx.what' => 'What happened',
			_ => null,
		} ?? switch (path) {
			'editor.tx.details' => 'Details',
			'editor.tx.descriptionLabel' => 'Description',
			'editor.tx.from' => 'From',
			'editor.tx.to' => 'To',
			'editor.tx.swap' => 'Swap accounts',
			'editor.tx.accountPlaceholder' => 'Search or type an account',
			'editor.tx.amount' => 'Amount',
			'editor.tx.received' => ({required Object currency}) => 'Received amount (${currency})',
			'editor.tx.date' => 'Date',
			'editor.tx.time' => 'Time (optional)',
			'editor.tx.otherCurrency' => 'Paid in another currency',
			'editor.tx.foreignCurrency' => 'Currency',
			'editor.tx.foreignAmount' => 'Amount in that currency',
			'editor.tx.categoryPlaceholder' => 'Pick or create a category',
			'editor.tx.bill' => 'Subscription',
			'editor.tx.noBill' => 'No subscription',
			'editor.tx.notes' => 'Notes',
			'editor.tx.rules' => 'Your Firefly rules and webhooks will run.',
			'editor.tx.stay' => 'Stay here to create another',
			'editor.tx.stayEdit' => 'Stay here after saving',
			'editor.tx.reset' => 'Reset the form',
			'editor.tx.created' => 'Transaction created',
			'editor.tx.updated' => 'Transaction updated',
			'editor.tx.deleted' => 'Transaction deleted',
			'editor.tx.deleteTitle' => 'Delete transaction',
			'editor.tx.deleteMessage' => ({required Object name}) => 'Delete “${name}”? This can\'t be undone.',
			'editor.tx.deleteMessageSplits' => ({required Object name}) => '“${name}” has several parts: the whole transaction will be deleted. This can\'t be undone.',
			'editor.tx.notEditable.title' => 'This transaction can\'t be edited here',
			'editor.tx.notEditable.splits' => 'It has several parts. Edit it in Firefly so none is lost.',
			'editor.tx.notEditable.type' => 'It is a kind SpaceFly doesn\'t edit (opening balance, reconciliation…).',
			'editor.tx.editInFirefly' => 'Edit in Firefly',
			'editor.tx.missing' => 'That transaction doesn\'t exist.',
			'editor.tx.loadError' => 'Couldn\'t load the transaction.',
			'editor.tx.kNew' => 'New transaction',
			'editor.tx.edit' => 'Edit',
			'editor.tx.actions' => 'Actions',
			'editor.missing' => 'That record no longer exists.',
			'editor.loadError' => 'Couldn\'t load the record.',
			'editor.clear' => 'Clear',
			'editor.fields.name' => 'Name',
			'editor.fields.notes' => 'Notes',
			'editor.fields.description' => 'Description',
			'editor.fields.active' => 'Active',
			'editor.fields.currency' => 'Currency',
			'editor.fields.group' => 'Group',
			'editor.entity.category.kNew' => 'New category',
			'editor.entity.category.edit' => 'Edit category',
			'editor.entity.category.created' => 'Category created',
			'editor.entity.category.updated' => 'Category updated',
			'editor.entity.category.deleted' => 'Category deleted',
			'editor.entity.category.deleteTitle' => 'Delete category',
			'editor.entity.category.deleteMessage' => ({required Object name}) => 'Delete the category “${name}”? Its transactions will become uncategorized.',
			'editor.entity.tag.kNew' => 'New tag',
			'editor.entity.tag.edit' => 'Edit tag',
			'editor.entity.tag.created' => 'Tag created',
			'editor.entity.tag.updated' => 'Tag updated',
			'editor.entity.tag.deleted' => 'Tag deleted',
			'editor.entity.tag.deleteTitle' => 'Delete tag',
			'editor.entity.tag.deleteMessage' => ({required Object name}) => 'Delete the tag “${name}”? It will be removed from all its transactions.',
			'editor.entity.tag.date' => 'Date',
			'editor.entity.tag.dateHint' => 'Optional: groups tags by moment (a trip, an event).',
			'editor.entity.budget.kNew' => 'New budget',
			'editor.entity.budget.edit' => 'Edit budget',
			'editor.entity.budget.created' => 'Budget created',
			'editor.entity.budget.updated' => 'Budget updated',
			'editor.entity.budget.deleted' => 'Budget deleted',
			'editor.entity.budget.deleteTitle' => 'Delete budget',
			'editor.entity.budget.deleteMessage' => ({required Object name}) => 'Delete the budget “${name}”? Its transactions will have no budget.',
			'editor.entity.budget.auto' => 'Automatic budget',
			'editor.entity.budget.autoHint' => 'Firefly sets the amount by itself at the start of each period.',
			'editor.entity.budget.autoType' => 'Type',
			'editor.entity.budget.autoAmount' => 'Amount per period',
			'editor.entity.budget.autoPeriod' => 'Period',
			'editor.entity.budget.autoTypes.reset' => 'Reset every period',
			'editor.entity.budget.autoTypes.rollover' => 'Roll over what\'s left',
			'editor.entity.budget.autoTypes.adjusted' => 'Adjust to what was spent',
			'editor.entity.bill.kNew' => 'New subscription',
			'editor.entity.bill.edit' => 'Edit subscription',
			'editor.entity.bill.created' => 'Subscription created',
			'editor.entity.bill.updated' => 'Subscription updated',
			'editor.entity.bill.deleted' => 'Subscription deleted',
			'editor.entity.bill.deleteTitle' => 'Delete subscription',
			'editor.entity.bill.deleteMessage' => ({required Object name}) => 'Delete the subscription “${name}”? Its transactions are kept but no longer linked.',
			'editor.entity.bill.fixed' => 'Fixed amount',
			'editor.entity.bill.amount' => 'Amount',
			'editor.entity.bill.amountMin' => 'Minimum amount',
			'editor.entity.bill.amountMax' => 'Maximum amount',
			'editor.entity.bill.freq' => 'Frequency',
			'editor.entity.bill.skip' => 'Skip periods',
			'editor.entity.bill.skipHint' => '0 = every period; 1 = every other one.',
			'editor.entity.bill.date' => 'First date',
			'editor.entity.bill.endDate' => 'End date',
			'editor.entity.bill.endDateHint' => 'Optional: leave empty if it doesn\'t end.',
			'editor.entity.account.kNew' => 'New account',
			'editor.entity.account.edit' => 'Edit account',
			'editor.entity.account.created' => 'Account created',
			'editor.entity.account.updated' => 'Account updated',
			'editor.entity.account.deleted' => 'Account deleted',
			'editor.entity.account.deleteTitle' => 'Delete account',
			'editor.entity.account.deleteMessage' => ({required Object name}) => 'Delete the account “${name}”?',
			'editor.entity.account.deleteWarning' => ({required Object count}) => 'Its ${count} transactions will be deleted too. This can\'t be undone.',
			'editor.entity.account.type' => 'Account type',
			'editor.entity.account.types.asset' => 'Asset',
			'editor.entity.account.types.liability' => 'Liability',
			'editor.entity.account.types.expense' => 'Expense',
			'editor.entity.account.types.revenue' => 'Income',
			'editor.entity.account.typeLocked' => 'The type can\'t be changed after the account is created.',
			'editor.entity.account.role' => 'Use',
			'editor.entity.account.iban' => 'IBAN',
			'editor.entity.account.openingBalance' => 'Opening balance',
			'editor.entity.account.openingBalanceDate' => 'Opening balance date',
			'editor.entity.account.includeNetWorth' => 'Include in net worth',
			'editor.entity.account.cardType' => 'Card type',
			'editor.entity.account.cardTypes.monthlyFull' => 'Full monthly payment',
			'editor.entity.account.paymentDay' => 'Payment day',
			'editor.entity.account.liabilityType' => 'Liability type',
			'editor.entity.account.liabilityTypes.loan' => 'Loan',
			'editor.entity.account.liabilityTypes.debt' => 'Debt',
			'editor.entity.account.liabilityTypes.mortgage' => 'Mortgage',
			'editor.entity.account.direction' => 'Who owes',
			'editor.entity.account.directions.debit' => 'I owe',
			'editor.entity.account.directions.credit' => 'I am owed',
			'editor.entity.account.interest' => 'Interest (%)',
			'editor.entity.account.interestPeriod' => 'Interest period',
			'editor.entity.account.interestPeriods.daily' => 'Daily',
			'editor.entity.account.interestPeriods.monthly' => 'Monthly',
			'editor.entity.account.interestPeriods.yearly' => 'Yearly',
			'editor.entity.account.owed' => 'Amount owed',
			'editor.entity.account.startDate' => 'Start date',
			'editor.entity.piggy.kNew' => 'New goal',
			'editor.entity.piggy.edit' => 'Edit goal',
			'editor.entity.piggy.created' => 'Goal created',
			'editor.entity.piggy.updated' => 'Goal updated',
			'editor.entity.piggy.deleted' => 'Goal deleted',
			'editor.entity.piggy.deleteTitle' => 'Delete goal',
			'editor.entity.piggy.deleteMessage' => ({required Object name}) => 'Delete the goal “${name}”? The money set aside becomes free again in its accounts.',
			'editor.entity.piggy.target' => 'Goal amount',
			'editor.entity.piggy.startDate' => 'Start date',
			'editor.entity.piggy.targetDate' => 'Target date',
			'editor.entity.piggy.accounts' => 'Accounts',
			'editor.entity.piggy.addAccount' => 'Add an account…',
			'editor.entity.piggy.none' => 'Pick at least one account.',
			'editor.entity.piggy.saved' => 'Set aside',
			'editor.entity.piggy.adjust' => 'Adjust',
			'editor.entity.piggy.adjustLabel' => 'Amount to add or remove',
			'editor.entity.piggy.add' => 'Add',
			'editor.entity.piggy.subtract' => 'Remove',
			'editor.entity.piggy.remove' => ({required Object name}) => 'Remove ${name}',
			'editor.entity.piggy.adjustHint' => 'Add or remove money set aside in each account; it is saved when you press Save.',
			'editor.periods.daily' => 'Daily',
			'editor.periods.weekly' => 'Weekly',
			'editor.periods.monthly' => 'Monthly',
			'editor.periods.quarterly' => 'Quarterly',
			'editor.periods.halfYear' => 'Half-yearly',
			'editor.periods.yearly' => 'Yearly',
			_ => null,
		};
	}
}
