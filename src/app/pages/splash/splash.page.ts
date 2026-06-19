import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: true,
  imports: [IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashPage implements OnInit {
  private router = inject(Router);
  private auth = inject(Auth);

  ngOnInit(): void {
    Promise.all([
      this.auth.authStateReady(),
      new Promise<void>(resolve => setTimeout(resolve, 2500))
    ]).then(() => {
      const destino = this.auth.currentUser ? '/app/inicio' : '/login';
      this.router.navigateByUrl(destino, { replaceUrl: true });
    });
  }
}
