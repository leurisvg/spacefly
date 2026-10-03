import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { I18n } from '../../core/i18n/i18n';
import { MetaStore } from '../../core/state/meta.store';
import { PageHeader } from '../../shared/components/page-header';
import { Section } from '../../shared/components/section';

@Component({
  selector: 'sf-about',
  imports: [TranslocoPipe, HlmBadge, PageHeader, Section],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4 sm:gap-5' },
  template: `
    <sf-page-header [title]="i18n.t('nav.about')" />
    <sf-section title="SpaceFly" [loading]="!meta.meta()">
      @if (meta.meta(); as m) {
        <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt class="text-muted-foreground">{{ 'about.version' | transloco }}</dt>
          <dd class="num">{{ m.appVersion }}</dd>
          <dt class="text-muted-foreground">Firefly III</dt>
          <dd class="flex items-center gap-2">
            <span class="num">{{ m.fireflyVersion }}</span>
            <span hlmBadge [variant]="m.fireflyVersionOk ? 'secondary' : 'destructive'" class="text-[10px]">{{ (m.fireflyVersionOk ? 'about.supported' : 'about.unsupported') | transloco: { min: m.minFireflyVersion } }}</span>
          </dd>
          <dt class="text-muted-foreground">{{ 'about.primary' | transloco }}</dt>
          <dd>{{ m.primaryCurrency.name }} ({{ m.primaryCurrency.code }})</dd>
          <dt class="text-muted-foreground">{{ 'about.user' | transloco }}</dt>
          <dd>{{ m.email }}</dd>
          <dt class="text-muted-foreground">{{ 'about.instance' | transloco }}</dt>
          <dd><a class="text-primary hover:underline" [href]="m.fireflyPublicUrl" target="_blank" rel="noopener">{{ m.fireflyPublicUrl }}</a></dd>
        </dl>
      }
      <p class="mt-4 text-sm text-muted-foreground">{{ 'about.body' | transloco }}</p>
    </sf-section>
  `,
})
export class About {
  protected readonly i18n = inject(I18n);
  protected readonly meta = inject(MetaStore);
}
