import { Injectable, signal } from '@angular/core';

export type ToastTipo = 'erro' | 'sucesso';

interface ToastEstado {
  mensagem: string;
  tipo: ToastTipo;
  id: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly estado = signal<ToastEstado | null>(null);

  erro(mensagem: string): void {
    this.estado.set({ mensagem, tipo: 'erro', id: Date.now() });
  }

  sucesso(mensagem: string): void {
    this.estado.set({ mensagem, tipo: 'sucesso', id: Date.now() });
  }

  fechar(): void {
    this.estado.set(null);
  }
}
