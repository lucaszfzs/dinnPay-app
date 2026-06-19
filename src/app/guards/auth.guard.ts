import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, signOut, user } from '@angular/fire/auth';
import { from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const authService = inject(AuthService);

  // authStateReady() aguarda o Firebase restaurar a sessão do IndexedDB
  // antes de tomar qualquer decisão — resolve o problema no iOS PWA
  return from(auth.authStateReady()).pipe(
    switchMap(() => user(auth).pipe(take(1))),
    switchMap((u) => {
      if (!u) {
        router.navigateByUrl('/login');
        return [false];
      }

      if (authService.sessaoExpirada()) {
        return from(signOut(auth)).pipe(
          map(() => {
            localStorage.removeItem('dinnpay_login_ts');
            router.navigateByUrl('/login');
            return false;
          })
        );
      }

      return [true];
    })
  );
};
