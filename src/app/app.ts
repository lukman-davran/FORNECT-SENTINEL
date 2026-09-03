import { Component, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Ekrani sa kojih hardversko dugme nazad zatvara aplikaciju.
 * Na njima nema kuda dalje unazad: prijava je pocetak, a
 * dashboard i Pro pregled su korijen svog panela. Vracanje sa
 * dashboarda na prijavu bi bilo pogresno, jer korisnik nije
 * odjavljen.
 */
const ROOT_ROUTES = ['/login', '/dashboard', '/pro'];

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('fornect-admin-web');

  private readonly location = inject(Location);
  private readonly router = inject(Router);

  constructor() {
    this.registerBackButton();
  }

  /**
   * Android ima hardversko dugme nazad, koje web nema. Bez ovoga
   * pritisak na njega zatvara aplikaciju sa bilo kojeg ekrana,
   * sto korisnik dozivljava kao pad aplikacije.
   *
   * U browseru se ne registruje nista - tamo dugme nazad radi
   * samo od sebe.
   */
  private registerBackButton(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const url = this.router.url.split('?')[0];

      if (!canGoBack || ROOT_ROUTES.includes(url)) {
        void CapacitorApp.exitApp();

        return;
      }

      this.location.back();
    });
  }
}
