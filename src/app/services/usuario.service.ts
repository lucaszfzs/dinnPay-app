import { Injectable, inject } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  readonly usuario$: Observable<Usuario | null> = user(this.auth).pipe(
    switchMap((firebaseUser) => {
      if (!firebaseUser) return of(null);
      return docData(doc(this.firestore, 'usuario', firebaseUser.uid)) as Observable<Usuario>;
    })
  );
}
