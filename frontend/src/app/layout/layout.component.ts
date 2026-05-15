import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit, OnDestroy {
  pageTitle = 'Panel de Control';
  pageSubtitle = 'Resumen y control del local';
  currentTime = '';
  sidebarOpen = false;
  sidebarCollapsed = false;

  private clockInterval?: ReturnType<typeof setInterval>;
  private routerSub?: Subscription;

  private readonly titles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Resumen del día', subtitle: 'Indicadores y alertas de tu billar' },
    sales: { title: 'Punto de venta', subtitle: 'Registra ventas rápido en mostrador' },
    products: { title: 'Catálogo de productos', subtitle: 'Precios, categorías y stock' },
    inventory: { title: 'Inventario', subtitle: 'Abastecimiento y entradas de mercadería' },
    expenses: { title: 'Gastos y fiados', subtitle: 'Gastos del local y créditos por cobrar' }
  };

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 30_000);
    this.updateTitle(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateTitle(e.urlAfterRedirects));
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.routerSub?.unsubscribe();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  toggleCollapse() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  private updateClock() {
    const now = new Date();
    this.currentTime = now.toLocaleString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private updateTitle(url: string) {
    const segment = url.split('/').filter(Boolean).pop() || 'dashboard';
    const info = this.titles[segment] ?? this.titles['dashboard'];
    this.pageTitle = info.title;
    this.pageSubtitle = info.subtitle;
  }
}
