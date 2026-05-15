import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Dash
  getDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`);
  }

  // Products
  getProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/products`);
  }
  createProduct(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/products`, data);
  }
  updateProduct(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/products/${id}`, data);
  }
  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}`);
  }

  // Inventory
  getInventory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/inventory`);
  }
  createInventoryEntry(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/inventory`, data);
  }
  updateInventoryEntry(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/inventory/${id}`, data);
  }
  deleteInventoryEntry(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/inventory/${id}`);
  }

  // Sales
  getSales(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sales`);
  }
  createSale(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sales`, data);
  }
  updateSale(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/sales/${id}`, data);
  }
  deleteSale(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sales/${id}`);
  }

  // Expenses
  getExpenses(): Observable<any> {
    return this.http.get(`${this.apiUrl}/expenses`);
  }
  createExpense(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/expenses`, data);
  }
  updateExpense(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/expenses/${id}`, data);
  }
  deleteExpense(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/expenses/${id}`);
  }
}
