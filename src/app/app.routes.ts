import { Routes } from '@angular/router';
import { MainShellComponent } from './components/main-shell/main-shell.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full',
  },
  {
    path: 'splash',
    loadComponent: () => import('./pages/splash/splash.page').then( m => m.SplashPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./pages/cadastro/cadastro.page').then( m => m.CadastroPage)
  },
  {
    path: 'inicio',
    redirectTo: '/app/inicio',
    pathMatch: 'full',
  },
  {
    path: 'perfil',
    redirectTo: '/app/perfil',
    pathMatch: 'full',
  },
  {
    path: 'transacoes',
    redirectTo: '/app/transacoes',
    pathMatch: 'full',
  },
  {
    path: 'app',
    component: MainShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },
      {
        path: 'inicio',
        loadComponent: () => import('./pages/inicio/inicio.page').then( m => m.InicioPage)
      },
      {
        path: 'transacoes',
        loadComponent: () => import('./pages/transacoes/transacoes.page').then( m => m.TransacoesPage)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/perfil/perfil.page').then( m => m.PerfilPage)
      },
    ],
  },
];