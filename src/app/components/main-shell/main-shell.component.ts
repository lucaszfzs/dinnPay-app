import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { filter, take } from 'rxjs';
import { AddTransactionModalComponent } from '../add-transaction-modal/add-transaction-modal.component';
import { BottomMenuComponent, BottomMenuItem } from '../bottom-menu/bottom-menu.component';
import { AuthService } from '../../services/auth.service';
import { TransacaoService } from '../../services/transacao.service';

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

@Component({
  selector: 'app-main-shell',
  templateUrl: './main-shell.component.html',
  styleUrls: ['./main-shell.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterOutlet, BottomMenuComponent, AddTransactionModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainShellComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private transacaoService = inject(TransacaoService);
  private cdr = inject(ChangeDetectorRef);

  activeMenu: BottomMenuItem = 'inicio';
  modalNovaTransacaoAberto = false;

  constructor() {
    this.atualizarMenuAtivo(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.atualizarMenuAtivo(event.urlAfterRedirects);
        this.cdr.markForCheck();
      });
  }

  selecionarMenu(menu: BottomMenuItem): void {
    const rotasPorMenu: Partial<Record<BottomMenuItem, string>> = {
      inicio: '/app/inicio',
      transacoes: '/app/transacoes',
      dashboard: '/app/dashboard',
      perfil: '/app/perfil',
    };

    const rota = rotasPorMenu[menu];
    if (!rota || rota === this.router.url) return;
    this.router.navigateByUrl(rota);
  }

  novaTransacao(): void {
    this.modalNovaTransacaoAberto = true;
  }

  fecharModalNovaTransacao(): void {
    this.modalNovaTransacaoAberto = false;
  }

  salvarNovaTransacao(dados: { tipo: 'receita' | 'despesa'; valor: string; descricao: string }): void {
    this.authService.usuario$.pipe(take(1)).subscribe((firebaseUser) => {
      if (!firebaseUser) return;

      const agora = new Date();
      this.transacaoService.adicionar(firebaseUser.uid, {
        tipo: dados.tipo,
        descricao: dados.descricao,
        valor: parseFloat(dados.valor.replace(',', '.')),
        data: Timestamp.fromDate(agora),
        mes: MESES[agora.getMonth()],
        ano: agora.getFullYear(),
      }).catch((err) => console.error('Erro ao salvar transação:', err));
    });

    this.modalNovaTransacaoAberto = false;
  }

  private atualizarMenuAtivo(url: string): void {
    if (url.includes('/perfil')) { this.activeMenu = 'perfil'; return; }
    if (url.includes('/transacoes')) { this.activeMenu = 'transacoes'; return; }
    if (url.includes('/dashboard')) { this.activeMenu = 'dashboard'; return; }
    this.activeMenu = 'inicio';
  }
}
