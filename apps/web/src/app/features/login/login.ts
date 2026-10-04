import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLock, lucideRocket } from '@ng-icons/lucide';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthService } from '@spacefly/client/auth/auth.service';

@Component({
  selector: 'sf-login',
  imports: [NgIcon, TranslocoPipe, HlmButton],
  providers: [provideIcons({ lucideRocket, lucideLock })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid min-h-svh place-items-center bg-background px-4' },
  template: `
    <div class="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl shadow-black/40">
      <span class="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
        <ng-icon name="lucideRocket" class="text-2xl" />
      </span>
      <h1 class="mt-5 text-2xl font-semibold tracking-tight">SpaceFly</h1>
      <p class="mt-1 text-sm text-muted-foreground">{{ 'login.subtitle' | transloco }}</p>
      @if (error()) {
        <p class="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-negative" role="alert">
          {{ 'login.errors.' + errorKey() | transloco }}
        </p>
      }
      <button hlmBtn size="lg" class="mt-6 w-full" (click)="login()">
        <ng-icon name="lucideLock" />
        {{ 'login.button' | transloco }}
      </button>
      <p class="mt-4 text-xs text-muted-foreground">{{ 'login.readOnly' | transloco }}</p>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  readonly returnTo = input<string>('/');
  readonly error = input<string | undefined>(undefined);
  protected readonly errorKey = computed(() => (['invalid_state', 'token_exchange', 'access_denied'].includes(this.error() ?? '') ? this.error() : 'generic'));

  protected login(): void {
    this.auth.login(this.returnTo() || '/');
  }
}
