import { Component, inject } from '@angular/core';

import {
  AppLanguage,
  LanguageService
} from '../../../core/services/language';

/**
 * Prebacivanje jezika sa zastavicama.
 *
 * Zastave su inline SVG, a ne emoji, jer Windows nema
 * glifove za emoji zastave pa bi se prikazale kao slova
 * zemlje umjesto zastave.
 *
 * Isti prekidač stoji na svim ekranima prije prijave, pa
 * je izdvojen u komponentu umjesto da se ponavlja u pet
 * predložaka.
 */
@Component({
  selector: 'app-language-switch',
  imports: [],
  templateUrl: './language-switch.html',
  styleUrl: './language-switch.scss'
})
export class LanguageSwitch {
  private readonly languageService = inject(LanguageService);

  get currentLanguage(): AppLanguage {
    return this.languageService.currentLanguage();
  }

  setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }
}
