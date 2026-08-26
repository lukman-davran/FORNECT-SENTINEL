import { Injectable, computed, signal } from '@angular/core';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  accountId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'fornect-auth-user';

  private readonly demoEmail = 'test@fornect.com';
  private readonly demoPassword = 'test123';

  readonly currentUser = signal<AuthUser | null>(
    this.loadSession()
  );

  readonly isAuthenticated = computed(
    () => this.currentUser() !== null
  );

  login(email: string, password: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail !== this.demoEmail ||
      password !== this.demoPassword
    ) {
      return false;
    }

    const user: AuthUser = {
      id: 'user-001',
      name: 'Fornect Demo User',
      email: this.demoEmail,
      accountId: 'account-demo-001'
    };

    this.currentUser.set(user);

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(user)
    );

    return true;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(this.storageKey);
  }

  private loadSession(): AuthUser | null {
    const savedUser = localStorage.getItem(this.storageKey);

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser) as AuthUser;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
