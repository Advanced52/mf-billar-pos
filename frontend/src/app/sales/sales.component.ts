import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.css'
})
export class SalesComponent implements OnInit {
  products: any[] = [];
  sales: any[] = [];
  
  formData = {
    product_id: '',
    quantity: 1,
    payment_method: 'Efectivo'
  };

  showModal = false;
  editingSale: any = null;
  editFormData = {
    product_id: '',
    quantity: 1,
    payment_method: 'Efectivo'
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getProducts().subscribe(res => {
      this.products = res;
      this.cdr.detectChanges();
    });
    this.loadSales();
  }

  loadSales() {
    this.api.getSales().subscribe(res => {
      this.sales = res;
      this.cdr.detectChanges();
    });
  }

  getProductPrice(isEdit = false): number {
    const id = isEdit ? this.editFormData.product_id : this.formData.product_id;
    if (!id) return 0;
    const p = this.products.find(x => x.id == id);
    return p ? p.sale_price : 0;
  }

  getSelectedProduct(isEdit = false) {
    const id = isEdit ? this.editFormData.product_id : this.formData.product_id;
    return this.products.find(x => x.id == id) || null;
  }

  getTotal(isEdit = false): number {
    const quantity = isEdit ? this.editFormData.quantity : this.formData.quantity;
    return this.getProductPrice(isEdit) * quantity;
  }

  getProductIcon(name: string) {
    const key = (name || '').toLowerCase();
    if (key.includes('corona') || key.includes('pilsener')) return '🍺';
    if (key.includes('licor') || key.includes('whisky')) return '🥃';
    if (key.includes('cigarro') || key.includes('tabaco') || key.includes('lark')) return '🚬';
    if (key.includes('billar') || key.includes('mesa')) return '🎱';
    if (key.includes('coca') || key.includes('cola') || key.includes('refresco')) return '🥤';
    if (key.includes('agua')) return '💧';
    if (key.includes('café') || key.includes('cafe')) return '☕';
    if (key.includes('pizza') || key.includes('comida')) return '🍽️';
    return '🛒';
  }

  getPaymentIcon(method: string) {
    return method === 'Efectivo' ? '💵' : '🏦';
  }

  registerSale() {
    if (!this.formData.product_id || this.formData.quantity < 1) {
      alert("Por favor completa los campos correctamente.");
      return;
    }
    
    // Check stock
    const p = this.products.find(x => x.id == this.formData.product_id);
    if (p && p.stock < this.formData.quantity) {
      alert("No hay suficiente stock.");
      return;
    }

    this.api.createSale(this.formData).subscribe({
      next: () => {
        this.loadSales();
        this.api.getProducts().subscribe(res => this.products = res); // update stock
        this.formData.product_id = '';
        this.formData.quantity = 1;
      },
      error: (err) => {
        alert("Error: " + err.error.error);
      }
    });
  }

  openEditModal(sale: any) {
    this.editingSale = sale;
    this.editFormData = {
      product_id: sale.product_id,
      quantity: sale.quantity,
      payment_method: sale.payment_method || 'Efectivo'
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingSale = null;
  }

  updateSale() {
    if (!this.editFormData.product_id || this.editFormData.quantity < 1) {
      alert("Por favor completa los campos correctamente.");
      return;
    }

    this.api.updateSale(this.editingSale.id, this.editFormData).subscribe({
      next: () => {
        this.loadSales();
        this.api.getProducts().subscribe(res => {
           this.products = res;
           this.cdr.detectChanges();
        });
        this.closeModal();
      },
      error: (err) => {
        alert("Error: " + err.error.error);
      }
    });
  }

  deleteSale(id: number) {
    if (confirm("¿Estás seguro de que deseas eliminar esta venta? El stock será devuelto al producto.")) {
      this.api.deleteSale(id).subscribe({
        next: () => {
          this.loadSales();
          this.api.getProducts().subscribe(res => {
             this.products = res;
             this.cdr.detectChanges();
          });
        },
        error: (err) => {
          alert("Error: " + err.error.error);
        }
      });
    }
  }
}
