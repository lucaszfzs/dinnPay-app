import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonContent } from '@ionic/angular/standalone';
import { BehaviorSubject, combineLatest, of, startWith, switchMap } from 'rxjs';
import { Transacao } from '../../models/transacao.model';
import { AppLifecycleService } from '../../services/app-lifecycle.service';
import { AuthService } from '../../services/auth.service';
import { TransacaoService } from '../../services/transacao.service';

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface DadosMensais { abrev: string; receita: number; despesa: number; }

interface PontoEvolucao {
  abrev: string;
  receita: number;
  despesa: number;
  x: number;
  yReceita: number;
  yDespesa: number;
}

interface DadosDashboard {
  mensais: DadosMensais[];
  receitaTotal: number;
  despesaTotal: number;
  percentReceita: number;
  saldoTotal: number;
}

interface LinhasEvolucao {
  receita: string;
  despesa: string;
  pontos: PontoEvolucao[];
  maiorValor: number;
}

const dadosVazios = (): DadosDashboard => ({
  mensais: MESES_ABREV.map(abrev => ({ abrev, receita: 0, despesa: 0 })),
  receitaTotal: 0, despesaTotal: 0, percentReceita: 50, saldoTotal: 0,
});

const evolucaoVazia = (): LinhasEvolucao => ({
  receita: '', despesa: '', pontos: [], maiorValor: 1,
});

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  private authService = inject(AuthService);
  private appLifecycleService = inject(AppLifecycleService);
  private transacaoService = inject(TransacaoService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  private hoje = new Date();
  anoSelecionado = this.hoje.getFullYear();
  anos: number[] = [2024, 2025, 2026, 2027];

  dadosDashboard: DadosDashboard = dadosVazios();
  linhasEvolucao: LinhasEvolucao = evolucaoVazia();
  maiorValorMensal = 1;
  donutStyle = 'conic-gradient(#17c742 0% 50%, #ef3a3a 50% 100%)';

  private ano$ = new BehaviorSubject<number>(this.anoSelecionado);

  readonly linhasGrafico = [0, 1, 2, 3, 4];

  mesSelecionado: number | null = null;

  ngOnInit(): void {
    combineLatest([
      this.authService.usuario$,
      this.ano$,
      this.appLifecycleService.appAtivo$.pipe(startWith<void>(undefined)),
    ]).pipe(
      switchMap(([firebaseUser, ano]) => {
        if (!firebaseUser) return of([]);
        return this.transacaoService.listarPorAno(firebaseUser.uid, ano);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((transacoes) => {
      this.mesSelecionado = null;
      this.dadosDashboard = this.calcularDados(transacoes);
      this.maiorValorMensal = Math.max(
        ...this.dadosDashboard.mensais.flatMap(m => [m.receita, m.despesa]), 1
      );
      const p = this.dadosDashboard.percentReceita;
      this.donutStyle = `conic-gradient(#17c742 0% ${p}%, #ef3a3a ${p}% 100%)`;
      this.linhasEvolucao = this.calcularLinhasEvolucao(this.dadosDashboard.mensais);
      this.cdr.detectChanges();
    });
  }

  selecionarAno(ano: number): void {
    this.anoSelecionado = ano;
    this.ano$.next(ano);
  }

  selecionarMes(index: number): void {
    this.mesSelecionado = this.mesSelecionado === index ? null : index;
  }

  private calcularDados(transacoes: Transacao[]): DadosDashboard {
    const mensais: DadosMensais[] = MESES_ABREV.map(abrev => ({ abrev, receita: 0, despesa: 0 }));
    let receitaTotal = 0;
    let despesaTotal = 0;

    for (const t of transacoes) {
      const idx = MESES.indexOf(t.mes);
      if (idx === -1) continue;
      if (t.tipo === 'receita') { mensais[idx].receita += t.valor; receitaTotal += t.valor; }
      else { mensais[idx].despesa += t.valor; despesaTotal += t.valor; }
    }

    const totalGeral = receitaTotal + despesaTotal;
    const percentReceita = totalGeral > 0 ? (receitaTotal / totalGeral) * 100 : 50;

    return { mensais, receitaTotal, despesaTotal, percentReceita, saldoTotal: receitaTotal - despesaTotal };
  }

  private calcularLinhasEvolucao(mensais: DadosMensais[]): LinhasEvolucao {
    const W = 280; const H = 90; const pad = 8;
    const maiorValor = Math.max(...mensais.flatMap(m => [m.receita, m.despesa]), 1);
    const temDados = mensais.some(m => m.receita > 0 || m.despesa > 0);

    if (!temDados) return evolucaoVazia();

    const toX = (i: number) => pad + (i / (mensais.length - 1)) * (W - pad * 2);
    const toY = (v: number) => H - pad - (v / maiorValor) * (H - pad * 2);

    const pontos: PontoEvolucao[] = mensais.map((m, i) => ({
      abrev: m.abrev,
      receita: m.receita,
      despesa: m.despesa,
      x: toX(i),
      yReceita: toY(m.receita),
      yDespesa: toY(m.despesa),
    }));

    const receita = pontos.map(p => `${p.x.toFixed(1)},${p.yReceita.toFixed(1)}`).join(' ');
    const despesa = pontos.map(p => `${p.x.toFixed(1)},${p.yDespesa.toFixed(1)}`).join(' ');

    return { receita, despesa, pontos, maiorValor };
  }

  calcularAlturaMensal(valor: number): number {
    return Math.min((valor / this.maiorValorMensal) * 100, 100);
  }

  calcularLabelEixoY(indice: number): string {
    const valor = (this.maiorValorMensal / 4) * (4 - indice);
    if (valor === 0) return 'R$0';
    if (valor >= 1000) return `R$${(valor / 1000).toFixed(1)}k`;
    return `R$${Math.round(valor)}`;
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
