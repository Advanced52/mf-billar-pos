import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

type ExpenseTab = 'normal' | 'fiado';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css'
})
export class ExpensesComponent implements OnInit {
  activeTab: ExpenseTab = 'fiado';

  products: any[] = [];
  expenses: any[] = [];
  fiados: any[] = [];

  normalForm = {
    description: '',
    value: 0
  };

  fiadoForm = {
    product_id: '',
    quantity: 1,
    debtor_name: '',
    description: ''
  };

  settlePayment = 'Efectivo';
  fiadosSearchTerm = '';
  fiadosViewMode: 'individual' | 'debtor' = 'individual';

  showModal = false;
  editingExpense: any = null;
  editFormData = {
    description: '',
    value: 0
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadProducts();
    this.loadExpenses();
    this.loadFiados();
  }

  setTab(tab: ExpenseTab) {
    this.activeTab = tab;
  }

  loadProducts() {
    this.api.getProducts().subscribe(res => {
      this.products = res;
      this.cdr.detectChanges();
    });
  }

  loadExpenses() {
    this.api.getExpenses().subscribe(res => {
      this.expenses = res;
      this.cdr.detectChanges();
    });
  }

  loadFiados() {
    this.api.getFiados('pending').subscribe(res => {
      this.fiados = res;
      this.cdr.detectChanges();
    });
  }

  get pendingFiadosTotal(): number {
    return this.fiados.reduce((sum, f) => sum + parseFloat(f.total || 0), 0);
  }

  get filteredFiados(): any[] {
    const term = (this.fiadosSearchTerm || '').toLowerCase().trim();
    if (!term) return this.fiados;
    return this.fiados.filter(f => (f.debtor_name || '').toLowerCase().includes(term));
  }

  get groupedDebtors(): any[] {
    const groups: { [key: string]: any } = {};
    this.fiados.forEach(f => {
      const name = f.debtor_name || 'Desconocido';
      if (!groups[name]) {
        groups[name] = {
          debtor_name: name,
          total: 0,
          count: 0,
          last_date: f.date,
          items: []
        };
      }
      groups[name].total += parseFloat(f.total || 0);
      groups[name].count += 1;
      groups[name].items.push(f);
      if (new Date(f.date) > new Date(groups[name].last_date)) {
        groups[name].last_date = f.date;
      }
    });

    const list = Object.values(groups);
    const term = (this.fiadosSearchTerm || '').toLowerCase().trim();
    if (term) {
      return list.filter(g => g.debtor_name.toLowerCase().includes(term));
    }
    return list.sort((a: any, b: any) => b.total - a.total);
  }

  getProductPrice(): number {
    if (!this.fiadoForm.product_id) return 0;
    const p = this.products.find(x => x.id == this.fiadoForm.product_id);
    return p ? parseFloat(p.sale_price) : 0;
  }

  getSelectedProduct() {
    return this.products.find(x => x.id == this.fiadoForm.product_id) || null;
  }

  getFiadoTotal(): number {
    return this.getProductPrice() * (this.fiadoForm.quantity || 0);
  }

  getProductIcon(name: string) {
    const key = (name || '').toLowerCase();
    if (key.includes('cigarro') || key.includes('tabaco') || key.includes('lark')) return '🚬';
    if (key.includes('corona') || key.includes('pilsener') || key.includes('cerveza')) return '🍺';
    if (key.includes('billar') || key.includes('mesa')) return '🎱';
    return '🛒';
  }

  registerExpense() {
    if (!this.normalForm.description || this.normalForm.value <= 0) {
      alert('Completa descripción y monto.');
      return;
    }

    this.api.createExpense(this.normalForm).subscribe({
      next: () => {
        this.loadExpenses();
        this.normalForm = { description: '', value: 0 };
      },
      error: (err) => alert('Error: ' + (err.error?.error || err.message))
    });
  }

  registerFiado() {
    if (!this.fiadoForm.product_id || this.fiadoForm.quantity < 1 || !this.fiadoForm.debtor_name.trim()) {
      alert('Selecciona producto, cantidad y quién fía.');
      return;
    }

    const p = this.getSelectedProduct();
    if (p && p.stock < this.fiadoForm.quantity) {
      alert('No hay suficiente stock.');
      return;
    }

    this.api.createFiado(this.fiadoForm).subscribe({
      next: () => {
        this.loadFiados();
        this.loadProducts();
        this.fiadoForm = { product_id: '', quantity: 1, debtor_name: '', description: '' };
      },
      error: (err) => alert('Error: ' + (err.error?.error || err.message))
    });
  }

  settleFiado(fiado: any) {
    const msg = `¿Cobrar $${fiado.total} a ${fiado.debtor_name}? Se registrará como venta y dejará de contar como gasto pendiente.`;
    if (!confirm(msg)) return;

    this.api.settleFiado(fiado.id, this.settlePayment).subscribe({
      next: () => {
        this.loadFiados();
        this.loadProducts();
      },
      error: (err) => alert('Error: ' + (err.error?.error || err.message))
    });
  }

  cancelFiado(fiado: any) {
    if (!confirm(`¿Cancelar fiado de ${fiado.debtor_name}? El stock volverá al inventario.`)) return;

    this.api.deleteFiado(fiado.id).subscribe({
      next: () => {
        this.loadFiados();
        this.loadProducts();
      },
      error: (err) => alert('Error: ' + (err.error?.error || err.message))
    });
  }

  selectDebtorForDetails(name: string) {
    this.fiadosSearchTerm = name;
    this.fiadosViewMode = 'individual';
  }

  settleAllDebtorFiados(debtorName: string, total: number, count: number) {
    const msg = `¿Cobrar la cuenta completa de ${debtorName} por $${total.toFixed(2)} (${count} fiados pendientes)? Se registrará como ventas y dejará de contar como deuda pendiente.`;
    if (!confirm(msg)) return;

    this.api.settleFiadoByDebtor(debtorName, this.settlePayment).subscribe({
      next: () => {
        this.loadFiados();
        this.loadProducts();
      },
      error: (err) => alert('Error: ' + (err.error?.error || err.message))
    });
  }

  openEditModal(expense: any) {
    this.editingExpense = expense;
    this.editFormData = {
      description: expense.description,
      value: expense.value
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingExpense = null;
  }

  updateExpense() {
    if (!this.editFormData.description || this.editFormData.value <= 0) {
      alert('Completa todos los campos.');
      return;
    }

    this.api.updateExpense(this.editingExpense.id, this.editFormData).subscribe({
      next: () => {
        this.loadExpenses();
        this.closeModal();
      },
      error: (err) => alert('Error: ' + (err.error?.error || err.message))
    });
  }

  deleteExpense(id: number) {
    if (!confirm('¿Eliminar este gasto?')) return;

    this.api.deleteExpense(id).subscribe({
      next: () => this.loadExpenses(),
      error: (err) => alert('Error: ' + (err.error?.error || err.message))
    });
  }
}
