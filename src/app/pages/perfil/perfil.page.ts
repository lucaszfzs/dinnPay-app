import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, logOutOutline, personCircleOutline, shareSocialOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [IonContent, IonIcon, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilPage {
  private authService = inject(AuthService);
  readonly usuarioService = inject(UsuarioService);
  readonly versao = environment.appVersion;

  constructor() {
    addIcons({
      'person-circle-outline': personCircleOutline,
      'log-out-outline': logOutOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'share-social-outline': shareSocialOutline,
    });
  }

  async compartilharApp(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: 'DinnPay - Controle Financeiro',
          text: 'Experimente o DinnPay, o app gratuito para controlar suas finanças pessoais de forma simples e rápida!',
          url: 'https://app-dinnpay.web.app',
          dialogTitle: 'Compartilhar DinnPay',
        });
      } else if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'DinnPay - Controle Financeiro',
          text: 'Experimente o DinnPay, o app gratuito para controlar suas finanças pessoais de forma simples e rápida!',
          url: 'https://app-dinnpay.web.app',
        });
      }
    } catch {
      // Dispensado ou não suportado
    }
  }

  sair(): void {
    this.authService.logout().subscribe();
  }
}
