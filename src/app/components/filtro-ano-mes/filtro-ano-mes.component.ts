import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filtro-ano-mes',
  templateUrl: './filtro-ano-mes.component.html',
  styleUrls: ['./filtro-ano-mes.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltroAnoMesComponent {
  @Input() meses: string[] = [];
  @Input() anos: number[] = [];
  @Input() mes: string = '';
  @Input() ano: number = new Date().getFullYear();

  @Output() filtroChange = new EventEmitter<{ mes: string; ano: number }>();

  filtroAberto: boolean = false;
  mesSelecionadoTemp: string = '';
  anoSelecionadoTemp: number = new Date().getFullYear();

  ngOnChanges(): void {
    this.mesSelecionadoTemp = this.mes;
    this.anoSelecionadoTemp = this.ano;
  }

  toggleFiltroAberto(): void {
    this.filtroAberto = !this.filtroAberto;
  }

  cancelarFiltro(): void {
    this.mesSelecionadoTemp = this.mes;
    this.anoSelecionadoTemp = this.ano;
    this.filtroAberto = false;
  }

  aplicarFiltro(): void {
    this.filtroChange.emit({
      mes: this.mesSelecionadoTemp,
      ano: this.anoSelecionadoTemp,
    });
    this.filtroAberto = false;
  }
}
