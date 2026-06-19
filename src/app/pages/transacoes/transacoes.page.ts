import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { Timestamp } from '@angular/fire/firestore';
import { BehaviorSubject, combineLatest, of, startWith, switchMap } from 'rxjs';
import {
  AddTransactionModalComponent,
  TransacaoParaEditar,
  TransactionType,
} from '../../components/add-transaction-modal/add-transaction-modal.component';
import { ExtratoFiltroModalComponent } from '../../components/extrato-filtro-modal/extrato-filtro-modal.component';
import { FiltroAnoMesComponent } from '../../components/filtro-ano-mes/filtro-ano-mes.component';
import { TransactionItemComponent } from '../../components/transaction-item/transaction-item.component';
import { Transacao } from '../../models/transacao.model';
import { AppLifecycleService } from '../../services/app-lifecycle.service';
import { AuthService } from '../../services/auth.service';
import { TransacaoService } from '../../services/transacao.service';

export type AbaFiltro = 'todas' | 'receitas' | 'despesas';

interface FiltroPeriodo {
  mes: string;
  ano: number;
}

export interface GrupoTransacoes {
  dataLabel: string;
  itens: Transacao[];
}

@Component({
  selector: 'app-transacoes',
  templateUrl: './transacoes.page.html',
  styleUrls: ['./transacoes.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
    FiltroAnoMesComponent,
    TransactionItemComponent,
    AddTransactionModalComponent,
    ExtratoFiltroModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransacoesPage implements OnInit {
  private authService = inject(AuthService);
  private appLifecycleService = inject(AppLifecycleService);
  private transacaoService = inject(TransacaoService);
  readonly isAndroid = /Android/i.test(navigator.userAgent);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  meses: string[] = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  anos: number[] = [2024, 2025, 2026, 2027];

  private hoje = new Date();

  filtroSelecionado: FiltroPeriodo = {
    mes: this.meses[this.hoje.getMonth()],
    ano: this.hoje.getFullYear(),
  };

  abaAtiva: AbaFiltro = 'todas';

  gruposFiltrados: GrupoTransacoes[] = [];
  temTransacoes = false;

  private uidAtual: string | null = null;
  private grupos: GrupoTransacoes[] = [];
  private filtro$ = new BehaviorSubject<FiltroPeriodo>(this.filtroSelecionado);

  /* ── Estado do modal de extrato ─────────────────── */
  modalExtratoAberto = false;

  abrirModalExtrato(): void { this.modalExtratoAberto = true; }
  fecharModalExtrato(): void {
    this.modalExtratoAberto = false;
    this.filtro$.next(this.filtroSelecionado);
    this.cdr.detectChanges();
    // iOS WKWebView pode ficar suspenso enquanto Quick Look exibe o arquivo.
    // setTimeout executa ao retomar — garante reload mesmo sem visibilitychange.
    setTimeout(() => this.filtro$.next(this.filtroSelecionado), 800);
  }

  /* ── Estado do modal de edição ───────────────────── */
  modalEdicaoAberto = false;
  transacaoParaEditar: TransacaoParaEditar | null = null;
  private transacaoEmEdicao: Transacao | null = null;

  ngOnInit(): void {
    combineLatest([
      this.authService.usuario$,
      this.filtro$,
      this.appLifecycleService.appAtivo$.pipe(startWith<void>(undefined)),
    ]).pipe(
      switchMap(([firebaseUser, filtro]) => {
        this.uidAtual = firebaseUser?.uid ?? null;
        if (!firebaseUser) return of([]);
        return this.transacaoService.listar(firebaseUser.uid, filtro.mes, filtro.ano);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((transacoes) => {
      this.grupos = this.agruparPorData(transacoes);
      this.atualizarGruposFiltrados();
      this.cdr.detectChanges();
    });
  }

  /* ── Aba ─────────────────────────────────────────── */

  selecionarAba(aba: AbaFiltro): void {
    this.abaAtiva = aba;
    this.atualizarGruposFiltrados();
  }

  private atualizarGruposFiltrados(): void {
    if (this.abaAtiva === 'todas') {
      this.gruposFiltrados = this.grupos;
    } else {
      const tipo = this.abaAtiva === 'receitas' ? 'receita' : 'despesa';
      this.gruposFiltrados = this.grupos
        .map((g) => ({ ...g, itens: g.itens.filter((i) => i.tipo === tipo) }))
        .filter((g) => g.itens.length > 0);
    }
    this.temTransacoes = this.gruposFiltrados.length > 0;
  }

  /* ── Filtro de período ───────────────────────────── */

  aplicarFiltro(filtro: FiltroPeriodo): void {
    this.filtroSelecionado = filtro;
    this.filtro$.next(filtro);
  }

  /* ── Agrupamento por data ────────────────────────── */

  private agruparPorData(transacoes: Transacao[]): GrupoTransacoes[] {
    const mapa = new Map<string, GrupoTransacoes>();
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);

    [...transacoes]
      .sort((a, b) => b.data.toMillis() - a.data.toMillis())
      .forEach((t) => {
        const label = this.formatarDataLabel(t.data, hoje, ontem);
        if (!mapa.has(label)) {
          mapa.set(label, { dataLabel: label, itens: [] });
        }
        mapa.get(label)!.itens.push(t);
      });

    return Array.from(mapa.values());
  }

  private formatarDataLabel(timestamp: Timestamp, hoje: Date, ontem: Date): string {
    const data = timestamp.toDate();
    if (data.toDateString() === hoje.toDateString()) return 'Hoje';
    if (data.toDateString() === ontem.toDateString()) {
      return `Ontem, ${data.getDate()} ${this.meses[data.getMonth()].substring(0, 3)}`;
    }
    return `${data.getDate()} ${this.meses[data.getMonth()].substring(0, 3)}`;
  }

  /* ── Editar transação ────────────────────────────── */

  abrirEdicao(item: Transacao): void {
    this.transacaoEmEdicao = item;
    this.transacaoParaEditar = {
      tipo: item.tipo,
      descricao: item.descricao,
      valor: item.valor,
    };
    this.modalEdicaoAberto = true;
  }

  fecharModalEdicao(): void {
    this.modalEdicaoAberto = false;
    this.transacaoParaEditar = null;
    this.transacaoEmEdicao = null;
  }

  salvarEdicao(dados: { tipo: TransactionType; valor: string; descricao: string }): void {
    if (!this.transacaoEmEdicao?.id || !this.uidAtual) return;
    this.transacaoService.atualizar(this.uidAtual, this.transacaoEmEdicao.id, {
      tipo: dados.tipo,
      descricao: dados.descricao,
      valor: parseFloat(dados.valor.replace(',', '.')),
    });
    this.fecharModalEdicao();
  }

  /* ── Deletar transação ───────────────────────────── */

  deletarTransacao(item: Transacao): void {
    if (!item.id || !this.uidAtual) return;
    this.transacaoService.deletar(this.uidAtual, item.id);
  }
}
