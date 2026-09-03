import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth';

import {
  AppLanguage,
  LanguageService
} from '../../core/services/language';

import {
  TranslatePipe
} from '../../shared/pipes/translate';
import { LanguageSwitch } from '../../shared/components/language-switch/language-switch';

interface PendingRegistration {
  name: string;
  email: string;
}

@Component({
  selector: 'app-verify-email',
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    LanguageSwitch
  ],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss'
})
export class VerifyEmail {
  private readonly authService =
    inject(AuthService);

  private readonly languageService =
    inject(LanguageService);

  private readonly demoCode = '123456';

  email =
    this.loadPendingRegistration()?.email ?? '';

  code = '';

  errorMessageKey = '';
  successMessageKey = '';

  verified = false;

  get currentLanguage(): AppLanguage {
    return this.languageService.currentLanguage();
  }

  setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }

  verify(): void {
    this.errorMessageKey = '';

    if (this.code.trim() !== this.demoCode) {
      this.errorMessageKey =
        'verify.invalidCode';
      return;
    }

    this.verified = true;

    sessionStorage.setItem(
      'fornect-email-verified',
      'true'
    );

    // Nalog se kreira odmah nakon verifikacije
    // emaila. Ranije je nastajao tek na kraju
    // pairinga, pa bi prekid tog koraka trajno
    // izgubio registraciju.
    const created =
      this.authService.completeRegistration();

    if (created) {
      // Sada postoji account, pa se odabrani
      // jezik snima bas za taj account.
      this.languageService.setLanguage(
        this.currentLanguage
      );
    }
  }

  resendCode(): void {
    this.errorMessageKey = '';

    this.successMessageKey =
      'verify.codeSent';

    setTimeout(() => {
      this.successMessageKey = '';
    }, 3000);
  }

  private loadPendingRegistration():
    PendingRegistration | null {

    const saved = sessionStorage.getItem(
      'fornect-pending-registration'
    );

    if (!saved) {
      return null;
    }

    try {
      return JSON.parse(
        saved
      ) as PendingRegistration;
    } catch {
      return null;
    }
  }
}
