import { Component, inject, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { loginViewModel } from '@spacefly/client/features/settings/login.vm';
import { SignInError } from '../platform/mobile-auth-platform';
import { normalizeServerUrl, ServerConfig } from '../platform/server-config';

/** First screen: which server to talk to, and the sign-in button (the sign-in itself happens in the system browser). */
@Component({
  selector: 'ns-login',
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="SpaceFly"></ActionBar>
    <ScrollView class="screen">
      <StackLayout class="screen-pad">
        <Label text="SpaceFly" class="kpi-value" horizontalAlignment="center" marginTop="32"></Label>
        <Label [text]="vm.i18n.t('login.subtitle')" class="muted" textWrap="true" horizontalAlignment="center" marginBottom="24"></Label>

        <Label [text]="vm.i18n.t('settings.mobile.serverUrl')" class="field-label"></Label>
        <TextField class="field" hint="https://spacefly.example.com" autocapitalizationType="none" autocorrect="false" keyboardType="url" [text]="url()" (textChange)="url.set($any($event).value)"></TextField>

        <Label [text]="vm.i18n.t('settings.mobile.access')" class="field-label"></Label>
        <Label [text]="vm.i18n.t('settings.mobile.accessHint')" class="muted small" textWrap="true" marginBottom="6"></Label>
        <TextField class="field" [hint]="vm.i18n.t('settings.mobile.clientId')" autocapitalizationType="none" autocorrect="false" [text]="clientId()" (textChange)="clientId.set($any($event).value)"></TextField>
        <TextField class="field" [hint]="vm.i18n.t('settings.mobile.clientSecret')" secure="true" autocapitalizationType="none" autocorrect="false" [text]="clientSecret()" (textChange)="clientSecret.set($any($event).value)"></TextField>

        @if (message()) {
          <Label [text]="message()" class="field-error" textWrap="true"></Label>
        }

        <Button [text]="vm.i18n.t('login.button')" class="btn" [isEnabled]="!vm.busy()" (tap)="signIn()"></Button>
        <Label [text]="vm.i18n.t('login.readOnly')" class="muted small" textWrap="true" marginTop="12"></Label>
      </StackLayout>
    </ScrollView>
  `,
})
export class Login {
  private readonly config = inject(ServerConfig);
  private readonly router = inject(RouterExtensions);
  private readonly route = inject(ActivatedRoute);

  protected readonly url = signal(this.config.apiUrl());
  protected readonly clientId = signal(this.config.accessClientId);
  protected readonly clientSecret = signal(this.config.accessClientSecret);
  protected readonly message = signal('');
  private readonly error = signal<string | undefined>(undefined);
  protected readonly vm = loginViewModel({ returnTo: signal(this.route.snapshot.queryParamMap.get('returnTo') ?? '/'), error: this.error });

  protected async signIn(): Promise<void> {
    this.message.set('');
    if (!this.config.setApiUrl(this.url())) {
      this.message.set(this.vm.i18n.t('settings.mobile.invalidUrl'));
      return;
    }
    // Saved before the browser opens: the code exchange that follows already needs them when the server is behind Cloudflare Access.
    this.config.setAccessCredentials(this.clientId(), this.clientSecret());
    this.error.set(undefined);
    try {
      if (await this.vm.login()) await this.router.navigate(['/'], { clearHistory: true });
    } catch (e) {
      this.error.set(e instanceof SignInError ? e.code : 'generic');
      this.message.set(this.vm.i18n.t(`login.errors.${this.vm.errorKey()}`));
    }
  }

  /** Exposed for tests: the URL as it would be saved. */
  protected get normalized(): string | null {
    return normalizeServerUrl(this.url());
  }
}
