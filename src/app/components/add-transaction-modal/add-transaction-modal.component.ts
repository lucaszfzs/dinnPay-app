import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type TransactionType = 'receita' | 'despesa';

export interface TransacaoParaEditar {
  tipo: TransactionType;
  descricao: string;
  valor: number;
}

@Component({
  selector: 'app-add-transaction-modal',
  templateUrl: './add-transaction-modal.component.html',
  styleUrls: ['./add-transaction-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTransactionModalComponent implements OnChanges {
  @Input() visible: boolean = false;
  @Input() transacaoParaEditar: TransacaoParaEditar | null = null;

  @Output() fechar = new EventEmitter<void>();
  @Output() save = new EventEmitter<{
    tipo: TransactionType;
    valor: string;
    descricao: string;
  }>();

  tipo: TransactionType = 'receita';
  descricao: string = '';
  valor: string = '';

  // Dígitos brutos da maquininha (ex: '12345' = R$ 123,45)
  digitos: string = '';

  get valorFormatado(): string {
    if (!this.digitos) return '';
    const padded = this.digitos.padStart(3, '0');
    const cents = padded.slice(-2);
    const reais = parseInt(padded.slice(0, -2), 10);
    return `${reais.toLocaleString('pt-BR')},${cents}`;
  }

  get modoEdicao(): boolean { return this.transacaoParaEditar !== null; }
  get titulo(): string { return this.modoEdicao ? 'Editar transação' : 'Nova transação'; }
  get labelBotao(): string { return this.modoEdicao ? 'Salvar alterações' : 'Registrar'; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transacaoParaEditar'] && this.transacaoParaEditar) {
      this.tipo = this.transacaoParaEditar.tipo;
      this.descricao = this.transacaoParaEditar.descricao;
      const centavos = Math.round(this.transacaoParaEditar.valor * 100);
      this.digitos = centavos > 0 ? centavos.toString() : '';
      this.sincronizarValor();
    }

    if (changes['visible']?.currentValue === false) {
      this.resetDraft();
    }
  }

  // Captura teclas no desktop
  onValorKeydown(event: KeyboardEvent): void {
    const passThrough = ['Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (passThrough.includes(event.key)) return;

    event.preventDefault();

    if (event.key >= '0' && event.key <= '9') {
      if (this.digitos.length < 9) {
        this.digitos += event.key;
        this.sincronizarValor();
      }
    } else if (event.key === 'Backspace') {
      this.digitos = this.digitos.slice(0, -1);
      this.sincronizarValor();
    }
  }

  // Fallback para teclado virtual (mobile)
  onValorInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const digitos = el.value.replace(/\D/g, '').slice(0, 9);
    this.digitos = digitos;
    this.sincronizarValor();
    el.value = this.valorFormatado;
  }

  // Mantém o cursor sempre no final
  onValorFocus(event: FocusEvent): void {
    const el = event.target as HTMLInputElement;
    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  }

  onClose(): void {
    this.resetDraft();
    this.fechar.emit();
  }

  onSave(): void {
    const descricao = this.descricao.trim();
    if (!descricao || !this.digitos) return;

    this.save.emit({ tipo: this.tipo, valor: this.valor, descricao });
    this.resetDraft();
    this.fechar.emit();
  }

  resetDraft(): void {
    this.tipo = 'receita';
    this.valor = '';
    this.descricao = '';
    this.digitos = '';
  }

  private sincronizarValor(): void {
    this.valor = this.digitos
      ? (parseInt(this.digitos, 10) / 100).toFixed(2)
      : '';
  }
}
