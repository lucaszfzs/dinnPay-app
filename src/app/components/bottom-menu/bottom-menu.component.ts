import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type BottomMenuItem = 'inicio' | 'transacoes' | 'dashboard' | 'perfil';

@Component({
  selector: 'app-bottom-menu',
  templateUrl: './bottom-menu.component.html',
  styleUrls: ['./bottom-menu.component.scss'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomMenuComponent {
  @Input() activeMenu: BottomMenuItem = 'inicio';

  @Output() menuSelect = new EventEmitter<BottomMenuItem>();
  @Output() fabClick = new EventEmitter<void>();

  onMenuSelect(menu: BottomMenuItem): void {
    this.menuSelect.emit(menu);
  }

  onFabClick(): void {
    this.fabClick.emit();
  }
}
