import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { ExtratoService } from '../../services/extrato.service';
import { TransacaoService } from '../../services/transacao.service';
import { UsuarioService } from '../../services/usuario.service';

export type TipoFiltroExtrato = 'todas' | 'receitas' | 'despesas';

@Component({
  selector: 'app-extrato-filtro-modal',
  templateUrl: './extrato-filtro-modal.component.html',
  styleUrls: ['./extrato-filtro-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtratoFiltroModalComponent implements OnChanges {
  @Input() visible = false;
  @Output() fechou = new EventEmitter<void>();

  private authService = inject(AuthService);
  private transacaoService = inject(TransacaoService);
  private usuarioService = inject(UsuarioService);
  private extratoService = inject(ExtratoService);
  private cdr = inject(ChangeDetectorRef);

  dataInicio = this.inicioDeMes();
  dataFim = this.hoje();
  tipoFiltro: TipoFiltroExtrato = 'todas';
  formato: 'pdf' | 'csv' = 'pdf';

  carregando = false;
  erro = '';
  exportacaoConcluida = false;
  private arquivoGerado: { blob: Blob; nome: string } | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === false) {
      this.erro = '';
      this.carregando = false;
      this.exportacaoConcluida = false;
      this.arquivoGerado = null;
    }
  }

  fechar(): void {
    if (this.carregando) return;
    this.fechou.emit();
  }

  async exportar(): Promise<void> {
    this.erro = '';

    const inicio = new Date(this.dataInicio + 'T00:00:00');
    const fim = new Date(this.dataFim + 'T23:59:59');

    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      this.erro = 'Preencha as datas corretamente.';
      return;
    }
    if (inicio > fim) {
      this.erro = 'A data de início deve ser anterior à data final.';
      return;
    }

    this.carregando = true;
    try {
      const firebaseUser = await firstValueFrom(this.authService.usuario$.pipe(take(1)));
      if (!firebaseUser) throw new Error('Usuário não autenticado.');

      const usuario = await firstValueFrom(this.usuarioService.usuario$.pipe(take(1)));
      const nomeUsuario = usuario?.nome ?? 'Usuário';

      let transacoes = await this.transacaoService.listarPorIntervalo(firebaseUser.uid, inicio, fim);

      if (this.tipoFiltro !== 'todas') {
        const tipo = this.tipoFiltro === 'receitas' ? 'receita' : 'despesa';
        transacoes = transacoes.filter(t => t.tipo === tipo);
      }

      if (this.formato === 'csv') {
        this.arquivoGerado = await this.extratoService.gerarCSVBlob(transacoes, inicio, fim, this.tipoFiltro, nomeUsuario);
      } else {
        this.arquivoGerado = await this.extratoService.gerarPDFBlob(transacoes, inicio, fim, this.tipoFiltro, nomeUsuario);
      }
      this.exportacaoConcluida = true;
    } catch (err) {
      this.erro = 'Erro ao gerar extrato. Tente novamente.';
      console.error(err);
    } finally {
      this.carregando = false;
      this.cdr.detectChanges();
    }
  }

  async compartilharArquivo(): Promise<void> {
    if (!this.arquivoGerado) return;
    try {
      await this.extratoService.compartilharBlob(this.arquivoGerado.blob, this.arquivoGerado.nome);
    } catch {
      // dismissed
    }
    this.fechou.emit();
  }

  private hoje(): string {
    const d = new Date();
    return this.fmtInput(d);
  }

  private inicioDeMes(): string {
    const d = new Date();
    d.setDate(1);
    return this.fmtInput(d);
  }

  private fmtInput(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
