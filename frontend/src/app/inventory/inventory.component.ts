import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css'
})
export class InventoryComponent implements OnInit {
  products: any[] = [];
  inventoryHistory: any[] = [];
  
  formData = {
    product_id: '',
    quantity: 1,
    purchase_price: 0,
    sale_price: 0,
    observation: ''
  };

  showModal = false;
  editingEntry: any = null;
  editFormData = {
    product_id: '',
    quantity: 1,
    purchase_price: 0,
    sale_price: 0,
    observation: ''
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadProducts();
    this.loadHistory();
  }

  loadProducts() {
    this.api.getProducts().subscribe(res => {
      this.products = res;
      this.cdr.detectChanges();
    });
  }

  loadHistory() {
    this.api.getInventory().subscribe(res => {
      this.inventoryHistory = res;
      this.cdr.detectChanges();
    });
  }

  registerSupply() {
    if (!this.formData.product_id || this.formData.quantity < 1 || this.formData.purchase_price < 0 || this.formData.sale_price < 0) {
      alert("Completar todos los campos numéricos correctamente.");
      return;
    }
    
    this.api.createInventoryEntry(this.formData).subscribe({
      next: () => {
        this.loadHistory();
        this.loadProducts(); // update main product list (if needed)

        // Reset form
        this.formData.product_id = '';
        this.formData.quantity = 1;
        this.formData.purchase_price = 0;
        this.formData.sale_price = 0;
        this.formData.observation = '';
        this.cdr.detectChanges();
      },
      error: (err) => alert("Error: " + err.error.error)
    });
  }

  openEditModal(entry: any) {
    this.editingEntry = entry;
    this.editFormData = {
      product_id: entry.product_id,
      quantity: entry.quantity,
      purchase_price: entry.purchase_price,
      sale_price: entry.sale_price,
      observation: entry.observation || ''
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingEntry = null;
  }

  updateEntry() {
    if (!this.editFormData.product_id || this.editFormData.quantity < 1 || this.editFormData.purchase_price < 0 || this.editFormData.sale_price < 0) {
      alert("Completar todos los campos numéricos correctamente.");
      return;
    }

    this.api.updateInventoryEntry(this.editingEntry.id, this.editFormData).subscribe({
      next: () => {
        this.loadHistory();
        this.loadProducts();
        this.closeModal();
      },
      error: (err) => alert("Error: " + err.error.error)
    });
  }

  deleteEntry(id: number) {
    if (confirm("¿Estás seguro de que deseas eliminar este ingreso? El stock se reducirá.")) {
      this.api.deleteInventoryEntry(id).subscribe({
        next: () => {
          this.loadHistory();
          this.loadProducts();
        },
        error: (err) => alert("Error: " + err.error.error)
      });
    }
  }
}
