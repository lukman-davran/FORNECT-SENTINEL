import { Injectable, computed, signal } from '@angular/core';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  accountId: string;
}

interface RegisteredUser extends AuthUser {
  passwordHash: string;
}

interface PendingRegistration extends RegisteredUser {}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'fornect-auth-user';
  private readonly registeredUsersKey = 'fornect-registered-users';
  private readonly pendingRegistrationKey =
    'fornect-pending-registration';

  private readonly demoEmail = 'test@fornect.com';
  private readonly demoPassword = 'test123';

  readonly currentUser = signal<AuthUser | null>(
    this.loadSession()
  );

  readonly isAuthenticated = computed(
    () => this.currentUser() !== null
  );

  async login(
    email: string,
    password: string,
    rememberMe = false
  ): Promise<boolean> {
    const normalizedEmail =
      email.trim().toLowerCase();

    // Existing POC demo account.
    if (
      normalizedEmail === this.demoEmail &&
      password === this.demoPassword
    ) {
      const user: AuthUser = {
        id: 'user-001',
        name: 'Fornect Demo User',
        email: this.demoEmail,
        accountId: 'account-demo-001'
      };

      this.saveSession(user, rememberMe);
      return true;
    }

    const registeredUser =
      this.loadRegisteredUsers().find(
        user => user.email === normalizedEmail
      );

    if (!registeredUser) {
      return false;
    }

    const passwordHash =
      await this.hashPassword(password);

    if (
      passwordHash !== registeredUser.passwordHash
    ) {
      return false;
    }

    const user: AuthUser = {
      id: registeredUser.id,
      name: registeredUser.name,
      email: registeredUser.email,
      accountId: registeredUser.accountId
    };

    this.saveSession(user, rememberMe);

    return true;
  }

  async prepareRegistration(
    name: string,
    email: string,
    password: string
  ): Promise<void> {
    const normalizedEmail =
      email.trim().toLowerCase();

    const alreadyExists =
      this.loadRegisteredUsers().some(
        user => user.email === normalizedEmail
      );

    if (
      alreadyExists ||
      normalizedEmail === this.demoEmail
    ) {
      throw new Error(
        'An account with this email already exists.'
      );
    }

    const passwordHash =
      await this.hashPassword(password);

    const pending: PendingRegistration = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      accountId: `account-${Date.now()}`,
      passwordHash
    };

    sessionStorage.setItem(
      this.pendingRegistrationKey,
      JSON.stringify(pending)
    );

    sessionStorage.removeItem(
      'fornect-email-verified'
    );
  }

  completeRegistration(): boolean {
    const saved = sessionStorage.getItem(
      this.pendingRegistrationKey
    );

    // Nema pending registracije: nalog je vec
    // kreiran ranije (odmah nakon verifikacije
    // emaila), pa je ovaj korak idempotentan.
    if (!saved) {
      return this.currentUser() !== null;
    }

    const verified =
      sessionStorage.getItem(
        'fornect-email-verified'
      ) === 'true';

    if (!verified) {
      return false;
    }

    try {
      const pending =
        JSON.parse(saved) as PendingRegistration;

      const users = this.loadRegisteredUsers();

      const exists = users.some(
        user => user.email === pending.email
      );

      if (!exists) {
        users.push(pending);

        localStorage.setItem(
          this.registeredUsersKey,
          JSON.stringify(users)
        );
      }

      const user: AuthUser = {
        id: pending.id,
        name: pending.name,
        email: pending.email,
        accountId: pending.accountId
      };

      this.saveSession(user, true);

      // Nalog sada trajno postoji, pa pending
      // podaci vise nisu potrebni.
      sessionStorage.removeItem(
        this.pendingRegistrationKey
      );

      sessionStorage.removeItem(
        'fornect-email-verified'
      );

      return true;
    } catch {
      return false;
    }
  }

  logout(): void {
    this.currentUser.set(null);

    localStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.storageKey);
  }

  private saveSession(
    user: AuthUser,
    rememberMe: boolean
  ): void {
    this.currentUser.set(user);

    localStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.storageKey);

    const storage = rememberMe
      ? localStorage
      : sessionStorage;

    storage.setItem(
      this.storageKey,
      JSON.stringify(user)
    );
  }

  private loadSession(): AuthUser | null {
    const savedUser =
      localStorage.getItem(this.storageKey) ??
      sessionStorage.getItem(this.storageKey);

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser) as AuthUser;
    } catch {
      localStorage.removeItem(this.storageKey);
      sessionStorage.removeItem(this.storageKey);

      return null;
    }
  }

  private loadRegisteredUsers(): RegisteredUser[] {
    const saved =
      localStorage.getItem(
        this.registeredUsersKey
      );

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved) as RegisteredUser[];
    } catch {
      return [];
    }
  }

  private async hashPassword(
    password: string
  ): Promise<string> {
    const bytes =
      new TextEncoder().encode(password);

    const digest =
      await crypto.subtle.digest(
        'SHA-256',
        bytes
      );

    return Array.from(
      new Uint8Array(digest)
    )
      .map(value =>
        value.toString(16).padStart(2, '0')
      )
      .join('');
  }
}
