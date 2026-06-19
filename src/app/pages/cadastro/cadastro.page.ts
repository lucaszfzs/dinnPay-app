import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastroPage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);

  nome = '';
  email = '';
  senha = '';
  confirmarSenha = '';
  mostrarSenha = false;
  mostrarConfirmarSenha = false;

  carregando = false;
  mostrarCardSucesso = false;

  tocadoNome = false;
  tocadoEmail = false;
  tocadoSenha = false;
  tocadoConfirmarSenha = false;

  get nomeValido(): boolean { return this.nome.trim().length > 0; }
  get emailValido(): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim()); }
  get senhaMinChars(): boolean { return this.senha.length >= 8; }
  get senhaMaiuscula(): boolean { return /[A-Z]/.test(this.senha); }
  get senhaNumero(): boolean { return /[0-9]/.test(this.senha); }
  get senhaValida(): boolean { return this.senhaMinChars && this.senhaMaiuscula && this.senhaNumero; }
  get confirmarSenhaValida(): boolean { return this.confirmarSenha.length > 0 && this.senha === this.confirmarSenha; }

  toggleMostrarSenha(): void { this.mostrarSenha = !this.mostrarSenha; }
  toggleMostrarConfirmarSenha(): void { this.mostrarConfirmarSenha = !this.mostrarConfirmarSenha; }

  onRegister(): void {
    this.tocadoNome = true;
    this.tocadoEmail = true;
    this.tocadoSenha = true;
    this.tocadoConfirmarSenha = true;

    if (!this.nomeValido || !this.emailValido || !this.senhaValida || !this.confirmarSenhaValida) {
      this.toast.erro('Corrija os campos destacados.');
      return;
    }

    this.carregando = true;
    this.authService.cadastrar(this.email, this.senha, this.nome).subscribe({
      next: () => {
        this.carregando = false;
        this.mostrarCardSucesso = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.carregando = false;
        this.toast.erro(this.traduzirErro(err.code));
        this.cdr.detectChanges();
      },
    });
  }

  irParaLogin(): void { this.router.navigateByUrl('/login'); }
  goToLogin(): void { this.router.navigateByUrl('/login'); }

  private traduzirErro(code: string): string {
    const erros: Record<string, string> = {
      'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres.',
    };
    return erros[code] ?? 'Erro ao cadastrar. Tente novamente.';
  }
}
