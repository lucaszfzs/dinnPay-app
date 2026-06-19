import { Injectable, NgZone, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import { Transacao } from '../models/transacao.model';

interface LogoInfo { base64: string; w: number; h: number; }

interface Colunas {
  data: number;
  desc: number;
  tipo: number;
  valor: number;
}

const PW = 210;
const PH = 297;
const M  = 15;
const W  = PW - M * 2;   // 180 mm utilizáveis

// Paleta (mesmos valores do global.scss)
const COR = {
  primary:    [0,   167, 101] as [number, number, number],
  text:       [17,  24,  39 ] as [number, number, number],
  text2:      [107, 114, 128] as [number, number, number],
  text3:      [156, 163, 175] as [number, number, number],
  surface:    [255, 255, 255] as [number, number, number],
  bg:         [245, 247, 250] as [number, number, number],
  bgAlt:      [249, 250, 251] as [number, number, number],
  border:     [229, 231, 235] as [number, number, number],
  receita:    [16,  148, 60 ] as [number, number, number],
  receitaBg:  [226, 248, 232] as [number, number, number],
  despesa:    [200, 40,  40 ] as [number, number, number],
  despesaBg:  [253, 232, 232] as [number, number, number],
};

@Injectable({ providedIn: 'root' })
export class ExtratoService {

  private ngZone    = inject(NgZone);
  private logoCache: LogoInfo | null = null;

  // ─── Construção do PDF ────────────────────────────────────────────────────

  private construirPDF(
    transacoes: Transacao[],
    dataInicio: Date,
    dataFim: Date,
    tipoFiltro: string,
    nomeUsuario: string,
    logo: LogoInfo | null
  ): jsPDF {
    const pdf = new jsPDF('p', 'mm', 'a4');

    let y = this.desenharHeader(pdf, logo);
    y = this.desenharInfoUsuario(pdf, y, nomeUsuario, dataInicio, dataFim, tipoFiltro, transacoes.length);
    y = this.desenharCards(pdf, y, transacoes);

    const col: Colunas = { data: M, desc: M + 27, tipo: M + 120, valor: M + W - 2 };
    y = this.desenharCabecalhoTabela(pdf, y, col);
    y = this.desenharLinhas(pdf, y, transacoes, col);

    if (transacoes.length === 0) {
      y = this.desenharEstadoVazio(pdf, y);
    }

    this.desenharRodape(pdf);
    return pdf;
  }

  // ─── Seção 1: Header ─────────────────────────────────────────────────────

  private desenharHeader(pdf: jsPDF, logo: LogoInfo | null): number {
    const headerH = 48;

    pdf.setFillColor(...COR.primary);
    pdf.rect(0, 0, PW, headerH, 'F');

    if (logo) {
      const maxW = 52; const maxH = 23;
      const ratio = logo.w / logo.h;
      let lW = maxW; let lH = lW / ratio;
      if (lH > maxH) { lH = maxH; lW = lH * ratio; }
      pdf.addImage(logo.base64, 'PNG', M, (headerH - lH) / 2 - 3, lW, lH);
    } else {
      pdf.setTextColor(...COR.surface);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('DinnPay', M, 22);
    }

    pdf.setTextColor(...COR.surface);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Extrato de Transações', PW - M, 20, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    const agora = new Date();
    pdf.text(
      `Gerado em ${agora.toLocaleDateString('pt-BR')} as ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      PW - M, 29, { align: 'right' }
    );

    return headerH + 11;
  }

  // ─── Seção 2: Informações do usuário ─────────────────────────────────────

  private desenharInfoUsuario(
    pdf: jsPDF,
    y: number,
    nomeUsuario: string,
    dataInicio: Date,
    dataFim: Date,
    tipoFiltro: string,
    total: number
  ): number {
    pdf.setTextColor(...COR.text);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(nomeUsuario, M, y);

    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COR.text2);

    const tipoLabel =
      tipoFiltro === 'todas'    ? 'Todas as transações' :
      tipoFiltro === 'receitas' ? 'Somente Receitas'    : 'Somente Despesas';

    const periodo = `${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}`;
    const registros = `${total} registro${total !== 1 ? 's' : ''}`;

    pdf.text(`${periodo}   ·   ${tipoLabel}   ·   ${registros}`, M, y);

    return y + 12;
  }

  // ─── Seção 3: Cards de resumo ─────────────────────────────────────────────

  private desenharCards(pdf: jsPDF, y: number, transacoes: Transacao[]): number {
    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
    const saldo    = receitas - despesas;

    const cW  = W / 3 - 2;
    const cH  = 28;
    const gap = 1;

    const desenharCard = (
      xCard: number,
      label: string,
      valor: number,
      prefixo: string,
      bg: [number, number, number],
      border: [number, number, number],
      labelCor: [number, number, number],
      valorCor: [number, number, number]
    ) => {
      pdf.setFillColor(...bg);
      pdf.roundedRect(xCard, y, cW, cH, 3, 3, 'F');
      pdf.setDrawColor(...border);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(xCard, y, cW, cH, 3, 3, 'S');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(...labelCor);
      pdf.text(label, xCard + 6, y + 9);

      pdf.setFontSize(11);
      pdf.setTextColor(...valorCor);
      pdf.text(`${prefixo}R$ ${this.fmtValor(Math.abs(valor))}`, xCard + 6, y + 21);
    };

    desenharCard(M,              'RECEITAS', receitas, '',  COR.receitaBg, COR.receita, COR.text2, COR.receita);
    desenharCard(M + W/3 + gap,  'DESPESAS', despesas, '', COR.despesaBg, COR.despesa, COR.text2, COR.despesa);

    const saldoPos = saldo >= 0;
    const saldoCor = saldoPos ? COR.receita : COR.despesa;
    const saldoBg  = saldoPos ? COR.receitaBg : COR.despesaBg;
    desenharCard(M + (W/3)*2 + gap*2, 'SALDO', saldo, saldoPos ? '' : '-', saldoBg, saldoCor, COR.text2, saldoCor);

    pdf.setLineWidth(0.1);
    return y + cH + 14;
  }

  // ─── Cabeçalho da tabela ──────────────────────────────────────────────────

  private desenharCabecalhoTabela(pdf: jsPDF, y: number, col: Colunas): number {
    const HDR_H = 8.5;

    pdf.setFillColor(235, 238, 244);
    pdf.rect(M, y, W, HDR_H, 'F');

    pdf.setTextColor(...COR.text2);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);

    const tY = y + 5.8;
    pdf.text('DATA',      col.data + 2,  tY);
    pdf.text('DESCRICAO', col.desc,       tY);
    pdf.text('TIPO',      col.tipo,       tY);
    pdf.text('VALOR',     col.valor,      tY, { align: 'right' });

    return y + HDR_H;
  }

  // ─── Linhas de transação ──────────────────────────────────────────────────

  private desenharLinhas(pdf: jsPDF, yInicio: number, transacoes: Transacao[], col: Colunas): number {
    const ROW_H_BASE = 9;
    const LINE_H     = 4.5;
    const DESC_MAX_W = col.tipo - col.desc - 4;

    const sorted = [...transacoes].sort((a, b) => b.data.toMillis() - a.data.toMillis());
    let y = yInicio;

    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      const descLines: string[] = pdf.splitTextToSize(t.descricao, DESC_MAX_W);
      const rowH = ROW_H_BASE + Math.max(0, descLines.length - 1) * LINE_H;

      if (y + rowH > PH - 22) {
        this.desenharRodape(pdf);
        pdf.addPage();
        y = M;
        y = this.desenharCabecalhoTabela(pdf, y, col);
      }

      const isReceita = t.tipo === 'receita';

      // Fundo alternado
      const bg = i % 2 === 0 ? COR.surface : COR.bgAlt;
      pdf.setFillColor(...bg);
      pdf.rect(M, y, W, rowH, 'F');

      const tY = y + 6;

      // Data
      pdf.setTextColor(...COR.text2);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(t.data.toDate().toLocaleDateString('pt-BR'), col.data + 2, tY);

      // Descrição (multi-linha)
      pdf.setTextColor(...COR.text);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(descLines, col.desc, tY);

      // Tipo — texto colorido simples
      const tipoCor = isReceita ? COR.receita : COR.despesa;
      pdf.setTextColor(...tipoCor);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.text(isReceita ? 'Receita' : 'Despesa', col.tipo, tY);

      // Valor com sinal
      const sinal = isReceita ? '+ ' : '- ';
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...tipoCor);
      pdf.text(`${sinal}R$ ${this.fmtValor(t.valor)}`, col.valor, tY, { align: 'right' });

      y += rowH;

      // Separador
      pdf.setDrawColor(...COR.border);
      pdf.setLineWidth(0.15);
      pdf.line(M, y, M + W, y);
    }

    return y;
  }

  // ─── Estado vazio ─────────────────────────────────────────────────────────

  private desenharEstadoVazio(pdf: jsPDF, y: number): number {
    const H = 22;
    pdf.setFillColor(...COR.bg);
    pdf.rect(M, y, W, H, 'F');

    pdf.setTextColor(...COR.text3);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(
      'Nenhuma transação encontrada para os filtros selecionados.',
      M + W / 2, y + H / 2 + 2,
      { align: 'center' }
    );

    return y + H;
  }

  // ─── Rodapé ───────────────────────────────────────────────────────────────

  private desenharRodape(pdf: jsPDF): void {
    pdf.setDrawColor(...COR.border);
    pdf.setLineWidth(0.3);
    pdf.line(M, PH - 14, M + W, PH - 14);

    pdf.setTextColor(...COR.text3);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('DinnPay — Controle Financeiro Pessoal', PW / 2, PH - 9, { align: 'center' });
  }

  // ─── CSV ─────────────────────────────────────────────────────────────────

  private construirCSV(
    transacoes: Transacao[],
    dataInicio: Date,
    dataFim: Date,
    tipoFiltro: string,
    nomeUsuario: string
  ): string {
    const tipoLabel =
      tipoFiltro === 'todas'    ? 'Todas as transações' :
      tipoFiltro === 'receitas' ? 'Somente Receitas'    : 'Somente Despesas';

    const agora = new Date();
    const geradoEm = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const linhas: string[] = [
      `DinnPay - Extrato de Transações`,
      `Usuário;${nomeUsuario}`,
      `Período;${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}`,
      `Filtro;${tipoLabel}`,
      `Gerado em;${geradoEm}`,
      ``,
      `Data;Descrição;Tipo;Valor (R$)`,
    ];

    const sorted = [...transacoes].sort((a, b) => b.data.toMillis() - a.data.toMillis());
    for (const t of sorted) {
      const data  = t.data.toDate().toLocaleDateString('pt-BR');
      const desc  = `"${t.descricao.replace(/"/g, '""')}"`;
      const tipo  = t.tipo === 'receita' ? 'Receita' : 'Despesa';
      const valor = this.fmtValor(t.valor);
      linhas.push(`${data};${desc};${tipo};${valor}`);
    }

    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);

    linhas.push(``, `Total Receitas;${this.fmtValor(receitas)}`);
    linhas.push(`Total Despesas;${this.fmtValor(despesas)}`);
    linhas.push(`Saldo;${this.fmtValor(receitas - despesas)}`);

    return '﻿' + linhas.join('\r\n');
  }

  // ─── Dois passos: gerar blob → compartilhar ──────────────────────────────

  async gerarPDFBlob(
    transacoes: Transacao[],
    dataInicio: Date,
    dataFim: Date,
    tipoFiltro: 'todas' | 'receitas' | 'despesas',
    nomeUsuario: string
  ): Promise<{ blob: Blob; nome: string }> {
    if (!this.logoCache) {
      this.logoCache = await this.carregarLogo('assets/logo-dinnpay.png').catch(() => null);
    }
    const pdf  = this.construirPDF(transacoes, dataInicio, dataFim, tipoFiltro, nomeUsuario, this.logoCache);
    const nome = `extrato-${this.fmtDataArq(dataInicio)}-${this.fmtDataArq(dataFim)}.pdf`;
    return { blob: pdf.output('blob'), nome };
  }

  async gerarCSVBlob(
    transacoes: Transacao[],
    dataInicio: Date,
    dataFim: Date,
    tipoFiltro: 'todas' | 'receitas' | 'despesas',
    nomeUsuario: string
  ): Promise<{ blob: Blob; nome: string }> {
    const csv  = this.construirCSV(transacoes, dataInicio, dataFim, tipoFiltro, nomeUsuario);
    const nome = `extrato-${this.fmtDataArq(dataInicio)}-${this.fmtDataArq(dataFim)}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    return { blob, nome };
  }

  async compartilharBlob(blob: Blob, nome: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share }                 = await import('@capacitor/share');
      const base64    = await this.blobParaBase64(blob);
      const resultado = await Filesystem.writeFile({ path: nome, data: base64, directory: Directory.Cache });
      await this.ngZone.run(() =>
        Share.share({ title: 'Extrato DinnPay', url: resultado.uri, dialogTitle: 'Salvar ou Compartilhar Extrato' })
      );
      return;
    }
    // Web/PWA — chamado de gesto fresco do usuário, ativação válida
    try {
      if (typeof navigator.share === 'function') {
        const file = new File([blob], nome, { type: blob.type });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: 'Extrato DinnPay', files: [file] });
          return;
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return; // usuário fechou o painel
    }
    // Fallback: download direto
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
  }

  private blobParaBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror  = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ─── Utilitários ─────────────────────────────────────────────────────────

  private carregarLogo(src: string): Promise<LogoInfo> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas ctx null')); return; }
        ctx.drawImage(img, 0, 0);
        resolve({ base64: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => reject(new Error(`Falha ao carregar: ${src}`));
      img.src = src;
    });
  }

  private fmtValor(valor: number): string {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private fmtDataArq(d: Date): string {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
