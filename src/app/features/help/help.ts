import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TranslatePipe
} from '../../shared/pipes/translate';

@Component({
  selector: 'app-help',
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe
  ],
  templateUrl: './help.html',
  styleUrl: './help.scss'
})
export class Help {
  supportCategory = 'general';
  supportMessage = '';

  supportErrorKey = '';
  supportSubmitted = false;

  submitSupport(): void {
    this.supportErrorKey = '';
    this.supportSubmitted = false;

    if (this.supportMessage.trim().length < 10) {
      this.supportErrorKey =
        'help.messageTooShort';
      return;
    }

    // POC: support request će kasnije
    // biti poslan backend API-ju.
    this.supportSubmitted = true;
    this.supportMessage = '';
  }
}
