import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  errorMessage = '';

  signIn(): void {
    this.errorMessage = '';

    const success = this.authService.login(
      this.email,
      this.password
    );

    if (!success) {
      this.errorMessage = 'Invalid email or password.';
      return;
    }

    this.router.navigate(['/dashboard']);
  }
}

