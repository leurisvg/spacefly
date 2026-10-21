import { Component, computed, effect, inject, NO_ERRORS_SCHEMA, signal, untracked } from '@angular/core';
import { Application, Utils, type AndroidActivityBackPressedEventData } from '@nativescript/core';
import { I18n } from '@spacefly/client/i18n/i18n';
import { fold } from '@spacefly/client/ui-logic/fold';
import { isoToLocalDate, localDateToIso, localDateToTime, timeToLocalDate } from '@spacefly/client/ui-logic/pick-datetime';
import { closeSheet, sheet, type DateSheet, type ListSheet, type TimeSheet } from './sheet-state';

interface Row {
  value: string;
  label: string;
  create: boolean;
}

const ROW_HEIGHT = 50;
const MAX_LIST_HEIGHT = 330;

/**
 * Draws the open sheet (see `pickOne`, `pickDate`, `pickTime`) over every page; the app root hosts it. It is part of the root view, so
 * it wears the app theme, which the native dialogs cannot. Android's back button closes it.
 */
@Component({
  selector: 'ns-sheet-host',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    @if (open(); as s) {
      <GridLayout rows="*, auto">
        <GridLayout row="0" rowSpan="2" class="sheet-backdrop" (tap)="dismiss()"></GridLayout>
        <StackLayout row="1" class="sheet">
          <Label [text]="s.title" class="sheet-title" textWrap="true"></Label>

          @if (list(); as l) {
            @if (l.search) {
              <TextField class="field" [hint]="i18n.t('common.search')" autocapitalizationType="none" autocorrect="false" [text]="query()" (textChange)="query.set($any($event).value)"></TextField>
            }
            @if (rows().length) {
              <ScrollView [height]="listHeight()">
                <StackLayout>
                  @for (r of rows(); track r.create + r.value) {
                    <Label [text]="r.label" class="sheet-row" [class.sheet-row-on]="!r.create && r.value === l.selected" [class.sheet-row-create]="r.create" textWrap="true" (tap)="finish(r.value)"></Label>
                  }
                </StackLayout>
              </ScrollView>
            } @else {
              <Label [text]="i18n.t('common.noResults')" class="muted" marginBottom="8"></Label>
            }
            <Button [text]="l.cancel" class="btn btn-outline" marginTop="8" (tap)="dismiss()"></Button>
          }

          @if (date(); as d) {
            <DatePicker [date]="dateStart()" (dateChange)="draftDate.set($any($event).value)"></DatePicker>
            <GridLayout columns="auto, auto, *" marginTop="4">
              <Label col="0" [text]="d.todayLabel" class="chip" (tap)="finish(d.today)"></Label>
              @if (d.clear) {
                <Label col="1" [text]="d.clear" class="chip" (tap)="finish('')"></Label>
              }
            </GridLayout>
            <GridLayout columns="*, *" marginTop="8">
              <Button col="0" [text]="d.cancel" class="btn btn-outline" marginRight="4" (tap)="dismiss()"></Button>
              <Button col="1" [text]="d.ok" class="btn" marginLeft="4" (tap)="finish(dateToIso(draftDate() ?? dateStart()))"></Button>
            </GridLayout>
          }

          @if (time(); as t) {
            <TimePicker [time]="timeStart()" (timeChange)="draftTime.set($any($event).value)"></TimePicker>
            <GridLayout columns="auto, auto, *" marginTop="4">
              <Label col="0" [text]="t.nowLabel" class="chip" (tap)="finish(t.now)"></Label>
              @if (t.clear) {
                <Label col="1" [text]="t.clear" class="chip" (tap)="finish('')"></Label>
              }
            </GridLayout>
            <GridLayout columns="*, *" marginTop="8">
              <Button col="0" [text]="t.cancel" class="btn btn-outline" marginRight="4" (tap)="dismiss()"></Button>
              <Button col="1" [text]="t.ok" class="btn" marginLeft="4" (tap)="finish(timeToTime(draftTime() ?? timeStart()))"></Button>
            </GridLayout>
          }
        </StackLayout>
      </GridLayout>
    }
  `,
})
export class SheetHost {
  protected readonly i18n = inject(I18n);
  protected readonly open = sheet.asReadonly();
  protected readonly list = computed(() => (sheet()?.kind === 'list' ? (sheet() as ListSheet) : null));
  protected readonly date = computed(() => (sheet()?.kind === 'date' ? (sheet() as DateSheet) : null));
  protected readonly time = computed(() => (sheet()?.kind === 'time' ? (sheet() as TimeSheet) : null));

  protected readonly query = signal('');
  /** What the pickers show when the sheet opens; the user's changes go to the drafts (the pickers are not bound back). */
  protected readonly dateStart = computed(() => {
    const d = this.date();
    return d ? isoToLocalDate(d.value, d.today) : new Date();
  });
  protected readonly timeStart = computed(() => {
    const t = this.time();
    return t ? timeToLocalDate(t.value, t.now) : new Date();
  });
  protected readonly draftDate = signal<Date | null>(null);
  protected readonly draftTime = signal<Date | null>(null);

  protected readonly rows = computed<Row[]>(() => {
    const l = this.list();
    if (!l) return [];
    const q = fold(this.query().trim());
    const shown = l.options.filter((o) => !q || fold(o.label).includes(q)).map((o): Row => ({ value: o.value, label: o.label, create: false }));
    const typed = this.query().trim();
    if (l.createLabel && typed && !l.options.some((o) => fold(o.label) === q || fold(o.value) === q)) {
      shown.push({ value: typed, label: l.createLabel(typed), create: true });
    }
    return shown;
  });
  protected readonly listHeight = computed(() => Math.min(this.rows().length * ROW_HEIGHT, MAX_LIST_HEIGHT));

  protected readonly dateToIso = localDateToIso;
  protected readonly timeToTime = localDateToTime;

  constructor() {
    // A new sheet starts clean.
    effect(() => {
      sheet();
      untracked(() => {
        this.query.set('');
        this.draftDate.set(null);
        this.draftTime.set(null);
      });
    });
    // Back closes the sheet instead of leaving the screen.
    effect((onCleanup) => {
      const android = this.open() ? Application.android : undefined;
      if (!android) return;
      const onBack = (args: AndroidActivityBackPressedEventData) => {
        args.cancel = true;
        this.dismiss();
      };
      android.on('activityBackPressed', onBack);
      onCleanup(() => android.off('activityBackPressed', onBack));
    });
  }

  protected dismiss(): void {
    this.finish(null);
  }

  protected finish(value: string | null): void {
    Utils.dismissSoftInput();
    closeSheet(value);
  }
}
