import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type CardResumoTipo = 'receita' | 'despesa';

@Component({
  selector: 'app-card-resumo',
  templateUrl: './card-resumo.component.html',
  styleUrls: ['./card-resumo.component.scss'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardResumoComponent {
  @Input() tipo: CardResumoTipo = 'receita';
  @Input() valor: number = 0;

  get isReceita(): boolean {
    return this.tipo === 'receita';
  }

  get titulo(): string {
    return this.isReceita ? 'Receitas' : 'Despesas';
  }

  get icone(): string {
    return this.isReceita
      ? 'assets/icons/arrow-up-right.svg'
      : 'assets/icons/arrow-down-right.svg';
  }

  get altIcone(): string {
    return this.isReceita ? 'Receita' : 'Despesas';
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}
