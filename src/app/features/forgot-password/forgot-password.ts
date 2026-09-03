import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  AppLanguage,
  LanguageService
} from '../../core/services/language';

import {
  TranslatePipe
} from '../../shared/pipes/translate';
import { LanguageSwitch } from '../../shared/components/language-switch/language-switch';

@Component({
  selector: 'app-forgot-password',
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    LanguageSwitch
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPassword {
  private readonly languageService =
    inject(LanguageService);

  email = '';
  errorMessageKey = '';
  submitted = false;

  get currentLanguage(): AppLanguage {
    return this.languageService.currentLanguage();
  }

  setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }

  submit(): void {
    this.errorMessageKey = '';
    this.submitted = false;

    const email = this.email.trim();

    if (!email || !email.includes('@')) {
      this.errorMessageKey =
        'forgot.invalidEmail';
      return;
    }

    // POC: pravi reset email će kasnije
    // pozivati backend API.
    this.submitted = true;
  }
}
