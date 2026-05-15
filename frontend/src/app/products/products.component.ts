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
    category: ''
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
      this.formData = {
        name: product.name,
        category: product.category || ''
      };
    } else {
      this.editingProduct = null;
      this.formData = { name: '', category: '' };
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveProduct() {
    if (!this.formData.name.trim() || !this.formData.category.trim()) {
      alert('Completa nombre y categoría.');
      return;
    }

    const payload = {
      name: this.formData.name.trim(),
      category: this.formData.category.trim()
    };

    if (this.editingProduct) {
      this.api.updateProduct(this.editingProduct.id, payload).subscribe(() => {
        this.loadProducts();
        this.closeModal();
      });
    } else {
      this.api.createProduct(payload).subscribe(() => {
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
