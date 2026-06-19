import { Injectable, inject } from '@angular/core';
import { Firestore, Timestamp, collection, collectionData, doc, addDoc, deleteDoc, getDocs, updateDoc, query, where, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Transacao } from '../models/transacao.model';

@Injectable({ providedIn: 'root' })
export class TransacaoService {
  private firestore = inject(Firestore);

  private colecao(uid: string) {
    return collection(this.firestore, `usuario/${uid}/transacoes`);
  }

  adicionar(uid: string, transacao: Omit<Transacao, 'id'>): Promise<void> {
    return addDoc(this.colecao(uid), transacao).then(() => {});
  }

  listar(uid: string, mes: string, ano: number): Observable<Transacao[]> {
    const q = query(
      this.colecao(uid),
      where('mes', '==', mes),
      where('ano', '==', ano)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Transacao[]>;
  }

  listarPorAno(uid: string, ano: number): Observable<Transacao[]> {
    const q = query(this.colecao(uid), where('ano', '==', ano));
    return collectionData(q, { idField: 'id' }) as Observable<Transacao[]>;
  }

  async listarPorIntervalo(uid: string, dataInicio: Date, dataFim: Date): Promise<Transacao[]> {
    const inicio = Timestamp.fromDate(dataInicio);
    const fim = Timestamp.fromDate(dataFim);
    const q = query(
      this.colecao(uid),
      where('data', '>=', inicio),
      where('data', '<=', fim),
      orderBy('data', 'asc')
    );
    const limite = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tempo esgotado. Verifique sua conexão.')), 12000)
    );
    const snapshot = await Promise.race([getDocs(q), limite]);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transacao));
  }

  atualizar(uid: string, id: string, dados: Partial<Omit<Transacao, 'id'>>): Promise<void> {
    return updateDoc(doc(this.firestore, `usuario/${uid}/transacoes/${id}`), dados);
  }

  deletar(uid: string, id: string): Promise<void> {
    return deleteDoc(doc(this.firestore, `usuario/${uid}/transacoes/${id}`));
  }
}
