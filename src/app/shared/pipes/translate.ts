import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from '../../core/services/language';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private readonly languageService =
    inject(LanguageService);

  transform(
    key: string,
    params?: Record<string, string | number>
  ): string {
    return this.languageService.t(key, params);
  }
}
