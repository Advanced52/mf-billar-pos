import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css'
})
export class ExpensesComponent implements OnInit {
  expenses: any[] = [];
  
  formData = {
    description: '',
    value: 0
  };

  showModal = false;
  editingExpense: any = null;
  editFormData = {
    description: '',
    value: 0
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadExpenses();
  }

  loadExpenses() {
    this.api.getExpenses().subscribe(res => {
      this.expenses = res;
      this.cdr.detectChanges();
    });
  }

  registerExpense() {
    if (!this.formData.description || this.formData.value <= 0) {
      alert("Completar todos los campos correctamente.");
      return;
    }
    
    this.api.createExpense(this.formData).subscribe({
      next: () => {
        this.loadExpenses();
        this.formData.description = '';
        this.formData.value = 0;
      },
      error: (err) => alert("Error: " + err.error.error)
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
      alert("Completar todos los campos correctamente.");
      return;
    }
    
    this.api.updateExpense(this.editingExpense.id, this.editFormData).subscribe({
      next: () => {
        this.loadExpenses();
        this.closeModal();
      },
      error: (err) => alert("Error: " + err.error.error)
    });
  }

  deleteExpense(id: number) {
    if (confirm("¿Estás seguro de que deseas eliminar este gasto?")) {
      this.api.deleteExpense(id).subscribe({
        next: () => {
          this.loadExpenses();
        },
        error: (err) => alert("Error: " + err.error.error)
      });
    }
  }
}
