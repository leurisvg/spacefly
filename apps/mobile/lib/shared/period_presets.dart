import 'dates.dart';

/// One entry of the period picker. Port of libs/client/src/ui-logic/period-presets.ts.
class PresetOption {
  const PresetOption(this.key, this.preset, this.monthsBack);

  /// Key under `period.presets` in the catalog.
  final String key;
  final PeriodPreset preset;

  /// How far the anchor is from today (months); `lastMonth` and `lastYear` anchor in the past.
  final int monthsBack;

  String anchor(String today) => monthsBack == 0 ? today : addMonths(today, -monthsBack);

  Period period(String today) => presetPeriod(preset, anchor(today));
}

/// The presets the period pickers offer, in display order.
const periodPresetOptions = <PresetOption>[
  PresetOption('thisMonth', PeriodPreset.month, 0),
  PresetOption('lastMonth', PeriodPreset.month, 1),
  PresetOption('last30', PeriodPreset.last30, 0),
  PresetOption('last6m', PeriodPreset.last6m, 0),
  PresetOption('thisQuarter', PeriodPreset.quarter, 0),
  PresetOption('thisYear', PeriodPreset.year, 0),
  PresetOption('lastYear', PeriodPreset.year, 12),
  PresetOption('ytd', PeriodPreset.ytd, 0),
];

/// Whether `current` (with its preset) is exactly what choosing [option] would produce.
bool isPresetSelected(PresetOption option, PeriodPreset preset, Period current, String today) =>
    preset == option.preset && option.period(today) == current;

/// The text a period picker shows for the active period: "September 2026", "Q3 2026", "2026", "YTD 2026" or a range.
String periodLabel(
  PeriodPreset preset,
  Period p, {
  required String Function(String iso, String style) date,
  required String quarterShort,
  required String ytdShort,
}) {
  switch (preset) {
    case PeriodPreset.month:
      return date(p.start, 'month');
    case PeriodPreset.quarter:
      return '$quarterShort${(int.parse(p.start.substring(5, 7)) - 1) ~/ 3 + 1} ${p.start.substring(0, 4)}';
    case PeriodPreset.year:
      return p.start.substring(0, 4);
    case PeriodPreset.ytd:
      return '$ytdShort ${p.start.substring(0, 4)}';
    case PeriodPreset.custom:
    case PeriodPreset.last30:
    case PeriodPreset.last6m:
      return '${date(p.start, 'short')} – ${date(p.end, 'long')}';
  }
}
