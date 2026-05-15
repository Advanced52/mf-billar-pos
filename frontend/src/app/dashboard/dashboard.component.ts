import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  data: any = null;

  public maxChartValue: number = 100;
  
  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getDashboard().subscribe((res: any) => {
      this.data = res;
      if (res.charts && res.charts.length) {
        const max = Math.max(...res.charts.map((c: any) => parseFloat(c.daily_total)));
        this.maxChartValue = max > 0 ? max : 100;
      }
      this.cdr.detectChanges();
    });
  }
}
