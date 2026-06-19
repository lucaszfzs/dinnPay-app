import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonContent } from '@ionic/angular/standalone';
import { BehaviorSubject, combineLatest, of, startWith, switchMap } from 'rxjs';
import { CardResumoComponent } from '../../components/card-resumo/card-resumo.component';
import { FiltroAnoMesComponent } from '../../components/filtro-ano-mes/filtro-ano-mes.component';
import { Transacao } from '../../models/transacao.model';
import { AppLifecycleService } from '../../services/app-lifecycle.service';
import { AuthService } from '../../services/auth.service';
import { TransacaoService } from '../../services/transacao.service';
import { UsuarioService } from '../../services/usuario.service';

interface FiltroPeriodo {
  mes: string;
  ano: number;
}

interface ItemGraficoSemana {
  dia: string;
  receita: number;
  despesa: number;
}

interface DadosInicio {
  saldoTotal: number;
  receitaTotal: number;
  despesaTotal: number;
  graficoSemana: ItemGraficoSemana[];
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

const dadosVazios = (): DadosInicio => ({
  saldoTotal: 0,
  receitaTotal: 0,
  despesaTotal: 0,
  graficoSemana: DIAS.map((dia) => ({ dia, receita: 0, despesa: 0 })),
});

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FiltroAnoMesComponent, CardResumoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioPage implements OnInit {
  readonly usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);
  private appLifecycleService = inject(AppLifecycleService);
  private transacaoService = inject(TransacaoService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  meses: string[] = MESES;
  anos: number[] = [2024, 2025, 2026, 2027];

  private hoje = new Date();

  filtroSelecionado: FiltroPeriodo = {
    mes: MESES[this.hoje.getMonth()],
    ano: this.hoje.getFullYear(),
  };

  dadosTela: DadosInicio = dadosVazios();
  maiorValorGrafico = 1;
  private filtro$ = new BehaviorSubject<FiltroPeriodo>(this.filtroSelecionado);

  readonly linhasGrafico = [0, 1, 2, 3, 4];
  diaSelecionado: number | null = null;

  selecionarDia(index: number): void {
    this.diaSelecionado = this.diaSelecionado === index ? null : index;
  }

  ngOnInit(): void {
    combineLatest([
      this.authService.usuario$,
      this.filtro$,
      this.appLifecycleService.appAtivo$.pipe(startWith<void>(undefined)),
    ]).pipe(
      switchMap(([firebaseUser, filtro]) => {
        if (!firebaseUser) return of([]);
        return this.transacaoService.listar(firebaseUser.uid, filtro.mes, filtro.ano);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((transacoes) => {
      this.dadosTela = this.calcularDados(transacoes);
      this.maiorValorGrafico = Math.max(
        ...this.dadosTela.graficoSemana.flatMap((i) => [i.receita, i.despesa]), 1
      );
      this.cdr.detectChanges();
    });
  }

  aplicarFiltro(filtro: FiltroPeriodo): void {
    this.filtroSelecionado = filtro;
    this.filtro$.next(filtro);
  }

  private calcularDados(transacoes: Transacao[]): DadosInicio {
    const grafico: Record<string, ItemGraficoSemana> = {};
    DIAS.forEach((dia) => (grafico[dia] = { dia, receita: 0, despesa: 0 }));

    let receitaTotal = 0;
    let despesaTotal = 0;

    for (const t of transacoes) {
      const diaLabel = DIAS[t.data.toDate().getDay()];
      if (t.tipo === 'receita') {
        receitaTotal += t.valor;
        grafico[diaLabel].receita += t.valor;
      } else {
        despesaTotal += t.valor;
        grafico[diaLabel].despesa += t.valor;
      }
    }

    return {
      receitaTotal,
      despesaTotal,
      saldoTotal: receitaTotal - despesaTotal,
      graficoSemana: DIAS.map((dia) => grafico[dia]),
    };
  }

  calcularAltura(valor: number): number {
    return Math.min((valor / this.maiorValorGrafico) * 100, 100);
  }

  calcularLabelEixoY(indice: number): string {
    const valor = (this.maiorValorGrafico / 4) * (4 - indice);
    if (valor === 0) return 'R$0';
    if (valor >= 1000) return `R$${(valor / 1000).toFixed(1)}k`;
    return `R$${Math.round(valor)}`;
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
