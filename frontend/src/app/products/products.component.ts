import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  showModal = false;
  editingProduct: any = null;
  formData = {
    name: '',
    category: '',
    purchase_price: 0,
    sale_price: 0
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.api.getProducts().subscribe(res => {
      this.products = res;
      this.cdr.detectChanges();
    });
  }

  openModal(product: any = null) {
    if (product) {
      this.editingProduct = product;
      this.formData = { ...product };
    } else {
      this.editingProduct = null;
      this.formData = { name: '', category: '', purchase_price: 0, sale_price: 0 };
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveProduct() {
    if (this.editingProduct) {
      this.api.updateProduct(this.editingProduct.id, this.formData).subscribe(() => {
        this.loadProducts();
        this.closeModal();
      });
    } else {
      this.api.createProduct(this.formData).subscribe(() => {
        this.loadProducts();
        this.closeModal();
      });
    }
  }

  deleteProduct(id: number) {
    if (confirm('¿Eliminar producto?')) {
      this.api.deleteProduct(id).subscribe(() => {
        this.loadProducts();
      });
    }
  }
}
