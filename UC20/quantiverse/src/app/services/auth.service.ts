import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenService } from './token.service';

const API_BASE = 'http://localhost:5062/api/v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient, private token: TokenService) {}

  private pubHeaders() {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }
  private authHeaders() {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token.get()}`
    });
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${API_BASE}/auth/login`, { username, password },
      { headers: this.pubHeaders(), withCredentials: true });
  }

  register(firstName: string, lastName: string, username: string,
           email: string, password: string, role = 'User'): Observable<any> {
    return this.http.post(`${API_BASE}/auth/register`,
      { firstName, lastName, username, email, password, role },
      { headers: this.pubHeaders(), withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.post(`${API_BASE}/auth/logout`, {},
      { headers: this.authHeaders(), withCredentials: true });
  }

  profile(): Observable<any> {
    return this.http.get(`${API_BASE}/auth/profile`,
      { headers: this.authHeaders(), withCredentials: true });
  }
}
