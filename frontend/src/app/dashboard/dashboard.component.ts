import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  data: any = null;
  loading = true;
  maxChartValue = 100;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getDashboard().subscribe({
      next: (res: any) => {
        this.data = res;
        if (res.charts?.length) {
          const max = Math.max(...res.charts.map((c: any) => parseFloat(c.daily_total)));
          this.maxChartValue = max > 0 ? max : 100;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get chartAverage(): number {
    if (!this.data?.charts?.length) return 0;
    const sum = this.data.charts.reduce((a: number, c: any) => a + parseFloat(c.daily_total || 0), 0);
    return sum / this.data.charts.length;
  }

  get chartAvgPercent(): number {
    if (!this.maxChartValue) return 0;
    return (this.chartAverage / this.maxChartValue) * 100;
  }

  stockLevel(stock: number): 'critical' | 'low' | 'ok' {
    if (stock <= 2) return 'critical';
    if (stock < 5) return 'low';
    return 'ok';
  }

  stockBadgeClass(stock: number): string {
    const level = this.stockLevel(stock);
    if (level === 'critical') return 'badge-danger';
    if (level === 'low') return 'badge-warning';
    return 'badge-success';
  }

  stockLabel(stock: number): string {
    const level = this.stockLevel(stock);
    if (level === 'critical') return 'Crítico';
    if (level === 'low') return 'Bajo';
    return 'OK';
  }
}
