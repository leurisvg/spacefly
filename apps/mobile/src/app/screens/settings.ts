import { HttpClient } from '@angular/common/http';
import { Component, inject, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { preferencesViewModel } from '@spacefly/client/features/settings/preferences.vm';
import type { Lang } from '@spacefly/client/i18n/lang';
import { Toast } from '@spacefly/client/platform/toast';
import { firstValueFrom } from 'rxjs';
import { isAccessLoginPage } from '../platform/bearer.interceptor';
import { ServerConfig } from '../platform/server-config';

type TestResult = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok' } | { kind: 'blocked' } | { kind: 'failed' };

/** The settings tab: language, theme, privacy, currency, the server and its Cloudflare Access credentials, refresh and sign-out. */
@Component({
  selector: 'ns-settings',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ScrollView>
      <StackLayout class="screen-pad">
        <StackLayout class="card">
          <Label [text]="vm.email() || vm.i18n.t('topbar.account')" class="card-title"></Label>
          <Label [text]="vm.i18n.t('settings.mobile.signedIn')" class="muted small"></Label>
        </StackLayout>

        <StackLayout class="card">
          <Label [text]="vm.i18n.t('topbar.language')" class="card-title"></Label>
          <StackLayout orientation="horizontal">
            @for (l of vm.langs; track l) {
              <Label [text]="vm.i18n.t('lang.' + l)" class="chip" [class.chip-on]="vm.lang() === l" (tap)="setLang(l)"></Label>
            }
          </StackLayout>
        </StackLayout>

        <StackLayout class="card">
          <Label [text]="vm.i18n.t('topbar.theme')" class="card-title"></Label>
          <StackLayout orientation="horizontal">
            @for (t of vm.themes; track t) {
              <Label [text]="vm.i18n.t('theme.' + t)" class="chip" [class.chip-on]="vm.theme() === t" (tap)="vm.setTheme(t)"></Label>
            }
          </StackLayout>
        </StackLayout>

        <StackLayout class="card">
          <GridLayout columns="*, auto">
            <Label col="0" [text]="vm.privacy.hidden() ? vm.i18n.t('topbar.showAmounts') : vm.i18n.t('topbar.hideAmounts')" verticalAlignment="center"></Label>
            <Switch col="1" [checked]="vm.privacy.hidden()" (checkedChange)="vm.privacy.set($any($event).value)"></Switch>
          </GridLayout>
        </StackLayout>

        <StackLayout class="card">
          <Label [text]="vm.i18n.t('currency.label')" class="card-title"></Label>
          <StackLayout orientation="horizontal">
            @for (c of vm.currencies(); track c.code) {
              <Label [text]="c.code" class="chip" [class.chip-on]="vm.currency() === c.code" (tap)="vm.setCurrency(c.code)"></Label>
            }
          </StackLayout>
        </StackLayout>

        <StackLayout class="card">
          <Label [text]="vm.i18n.t('settings.mobile.server')" class="card-title"></Label>
          <Label [text]="vm.i18n.t('settings.mobile.serverUrl')" class="field-label"></Label>
          <TextField class="field" autocapitalizationType="none" autocorrect="false" keyboardType="url" [text]="url()" (textChange)="url.set($any($event).value)"></TextField>

          <Label [text]="vm.i18n.t('settings.mobile.access')" class="field-label"></Label>
          <Label [text]="vm.i18n.t('settings.mobile.accessHint')" class="muted small" textWrap="true" marginBottom="6"></Label>
          <TextField class="field" [hint]="vm.i18n.t('settings.mobile.clientId')" autocapitalizationType="none" autocorrect="false" [text]="clientId()" (textChange)="clientId.set($any($event).value)"></TextField>
          <TextField class="field" [hint]="vm.i18n.t('settings.mobile.clientSecret')" secure="true" autocapitalizationType="none" autocorrect="false" [text]="clientSecret()" (textChange)="clientSecret.set($any($event).value)"></TextField>

          <Button [text]="vm.i18n.t('settings.mobile.save')" class="btn btn-outline" (tap)="save()"></Button>
          <Button [text]="vm.i18n.t('settings.mobile.test')" class="btn btn-outline" marginTop="8" [isEnabled]="test().kind !== 'busy'" (tap)="testConnection()"></Button>
          @switch (test().kind) {
            @case ('ok') {
              <Label [text]="vm.i18n.t('settings.mobile.testOk')" class="ok" textWrap="true" marginTop="6"></Label>
            }
            @case ('blocked') {
              <Label [text]="vm.i18n.t('settings.mobile.testBlocked')" class="field-error" textWrap="true" marginTop="6"></Label>
            }
            @case ('failed') {
              <Label [text]="vm.i18n.t('settings.mobile.testFailed')" class="field-error" textWrap="true" marginTop="6"></Label>
            }
          }
        </StackLayout>

        <Button [text]="vm.i18n.t('topbar.refresh')" class="btn btn-outline" [isEnabled]="!vm.refreshing()" (tap)="vm.refresh()"></Button>
        <Button [text]="vm.i18n.t('topbar.logout')" class="btn btn-danger" marginTop="8" marginBottom="24" (tap)="vm.logout()"></Button>
      </StackLayout>
    </ScrollView>
  `,
})
export class Settings {
  protected readonly vm = preferencesViewModel();
  private readonly config = inject(ServerConfig);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(Toast);

  protected readonly url = signal(this.config.apiUrl());
  protected readonly clientId = signal(this.config.accessClientId);
  protected readonly clientSecret = signal(this.config.accessClientSecret);
  protected readonly test = signal<TestResult>({ kind: 'idle' });

  protected setLang(lang: Lang): void {
    this.vm.setLang(lang);
  }

  protected save(): boolean {
    if (!this.config.setApiUrl(this.url())) {
      this.toast.error(this.vm.i18n.t('settings.mobile.invalidUrl'));
      return false;
    }
    this.config.setAccessCredentials(this.clientId(), this.clientSecret());
    this.toast.success(this.vm.i18n.t('settings.mobile.saved'));
    return true;
  }

  /** Saves what is typed, then asks the server's `/healthz` through the same headers every request uses. */
  protected async testConnection(): Promise<void> {
    if (!this.save()) return;
    this.test.set({ kind: 'busy' });
    try {
      const health = await firstValueFrom(this.http.get<{ ok?: boolean }>(`${this.config.apiUrl()}/healthz`));
      this.test.set({ kind: health?.ok ? 'ok' : 'failed' });
    } catch (error) {
      this.test.set({ kind: isAccessLoginPage(error) || (error as { status?: number }).status === 403 ? 'blocked' : 'failed' });
    }
  }
}
