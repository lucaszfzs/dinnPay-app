import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type TransactionTipo = 'receita' | 'despesa';

@Component({
  selector: 'app-transaction-item',
  templateUrl: './transaction-item.component.html',
  styleUrls: ['./transaction-item.component.scss'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionItemComponent {
  @Input() tipo: TransactionTipo = 'despesa';
  @Input() descricao: string = '';
  @Input() valor: number = 0;

  @Output() deletar = new EventEmitter<void>();
  @Output() editar = new EventEmitter<void>();

  get isReceita(): boolean {
    return this.tipo === 'receita';
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  onDeletar(event: Event): void {
    event.stopPropagation();
    this.deletar.emit();
  }

  onEditar(event: Event): void {
    event.stopPropagation();
    this.editar.emit();
  }
}
