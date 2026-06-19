import { Timestamp } from '@angular/fire/firestore';

export interface Transacao {
  id?: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: Timestamp;
  mes: string;
  ano: number;
}
