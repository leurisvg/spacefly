import { inject } from '@angular/core';
import type { PiggyBankRow, PiggyBanksReport } from '@spacefly/shared';
import { reportResource } from '../../api/report-resource';
import { FormatService } from '../../format/format.service';
import { I18n } from '../../i18n/i18n';
import { EntityEditor } from '../../state/entity-editor.service';

/** How far along a goal is, 0–100; nothing in privacy mode, where the bar would give the ratio away. */
export function goalProgress(pct: number | null, hidden: boolean): number {
  return hidden ? 0 : Math.min(100, Math.max(0, (pct ?? 0) * 100));
}

/** Whether a goal is on track: `null` when it has no target date to be on track for. */
export function goalTone(p: Pick<PiggyBankRow, 'onTrack'>): 'good' | 'warning' | null {
  return p.onTrack === null ? null : p.onTrack ? 'good' : 'warning';
}

/** Goals (piggy banks): what is set aside, the pace, and whether each is on track. */
export function goalsViewModel() {
  const i18n = inject(I18n);
  const f = inject(FormatService);
  const editor = inject(EntityEditor);
  const res = reportResource<PiggyBanksReport>('reports/piggy-banks', () => ({}), { global: false });

  return {
    i18n,
    f,
    editor,
    res,
    r: res.data,

    progress(p: Pick<PiggyBankRow, 'pct'>): number {
      return goalProgress(p.pct, f.hidden());
    },

    create(): void {
      editor.open('piggy');
    },

    edit(id: string): void {
      editor.open('piggy', id);
    },
  };
}
