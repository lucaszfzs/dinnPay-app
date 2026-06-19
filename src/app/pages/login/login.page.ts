import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);

  email = '';
  senha = '';
  mostrarSenha = false;
  carregando = false;

  mostrarModalSenha = false;
  emailRecuperacao = '';
  carregandoRecuperacao = false;
  recuperacaoEnviada = false;

  toggleMostrarSenha(): void {
    this.mostrarSenha = !this.mostrarSenha;
  }

  onLogin(): void {
    if (!this.email.trim() || !this.senha.trim()) {
      this.toast.erro('Preencha e-mail e senha.');
      return;
    }

    this.carregando = true;
    this.authService.login(this.email, this.senha).subscribe({
      next: () => {
        this.carregando = false;
        this.router.navigateByUrl('/app/inicio');
      },
      error: (err) => {
        this.carregando = false;
        this.toast.erro(this.traduzirErro(err.code));
        this.cdr.detectChanges();
      },
    });
  }

  onRegister(): void {
    this.router.navigateByUrl('/cadastro');
  }

  abrirModalSenha(): void {
    this.emailRecuperacao = '';
    this.recuperacaoEnviada = false;
    this.mostrarModalSenha = true;
  }

  fecharModalSenha(): void {
    this.mostrarModalSenha = false;
  }

  onEnviarRecuperacao(): void {
    if (!this.emailRecuperacao.trim()) {
      this.toast.erro('Informe seu e-mail.');
      return;
    }

    this.carregandoRecuperacao = true;
    this.authService.resetarSenha(this.emailRecuperacao).subscribe({
      next: () => {
        this.carregandoRecuperacao = false;
        this.recuperacaoEnviada = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.carregandoRecuperacao = false;
        this.toast.erro(this.traduzirErroRecuperacao(err.code));
        this.cdr.detectChanges();
      },
    });
  }

  private traduzirErroRecuperacao(code: string): string {
    const erros: Record<string, string> = {
      'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    };
    return erros[code] ?? 'Erro ao enviar o link. Tente novamente.';
  }

  private traduzirErro(code: string): string {
    const erros: Record<string, string> = {
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    };
    return erros[code] ?? 'Erro ao fazer login. Tente novamente.';
  }
}
