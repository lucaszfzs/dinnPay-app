import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { from, Observable } from 'rxjs';
import { Usuario } from '../models/usuario.model';

const SESSION_KEY = 'dinnpay_login_ts';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  readonly usuario$ = user(this.auth);

  cadastrar(email: string, senha: string, nome: string): Observable<void> {
    return from(
      createUserWithEmailAndPassword(this.auth, email, senha).then((credencial) => {
        const usuario: Usuario = { uid: credencial.user.uid, nome, email };
        return setDoc(doc(this.firestore, 'usuario', usuario.uid), usuario);
      })
    );
  }

  login(email: string, senha: string): Observable<void> {
    return from(
      signInWithEmailAndPassword(this.auth, email, senha).then(() => {
        localStorage.setItem(SESSION_KEY, Date.now().toString());
      })
    );
  }

  logout(): Observable<void> {
    return from(signOut(this.auth).then(() => {
      localStorage.removeItem(SESSION_KEY);
      this.router.navigateByUrl('/login');
    }));
  }

  resetarSenha(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  sessaoExpirada(): boolean {
    const ts = localStorage.getItem(SESSION_KEY);
    if (!ts) {
      // Usuário logado antes desta feature — inicia o contador a partir de hoje
      localStorage.setItem(SESSION_KEY, Date.now().toString());
      return false;
    }
    return Date.now() - Number(ts) > SESSION_DURATION_MS;
  }
}