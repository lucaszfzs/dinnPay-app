import { Component, effect, inject, signal } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './app-toast.component.html',
  styleUrls: ['./app-toast.component.scss'],
  standalone: true,
})
export class AppToastComponent {
  private toastService = inject(ToastService);
  readonly estado = this.toastService.estado;
  visivel = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const t = this.estado();
      if (t) {
        this.visivel.set(true);
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.dispensar(), 3800);
      }
    });
  }

  dispensar(): void {
    this.visivel.set(false);
    setTimeout(() => this.toastService.fechar(), 320);
  }
}
