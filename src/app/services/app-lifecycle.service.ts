import { Injectable, NgZone, inject } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppLifecycleService {
  private ngZone = inject(NgZone);
  private appAtivoSubject = new Subject<void>();

  readonly appAtivo$: Observable<void> = this.appAtivoSubject.asObservable();

  constructor() {
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          this.emitirAppAtivo();
        }
      });
      return;
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.emitirAppAtivo();
        }
      });
    }
  }

  private emitirAppAtivo(): void {
    this.ngZone.run(() => this.appAtivoSubject.next());
  }
}
