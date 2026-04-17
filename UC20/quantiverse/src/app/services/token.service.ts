import { Injectable } from '@angular/core';

export interface UserInfo {
  fullName: string;
  email: string;
  role: string;
  userId: string;
}

@Injectable({ providedIn: 'root' })
export class TokenService {
  get(): string | null { return localStorage.getItem('jwt_token'); }
  set(token: string): void { localStorage.setItem('jwt_token', token); }
  remove(): void { localStorage.removeItem('jwt_token'); }

  getUser(): UserInfo | null {
    return JSON.parse(localStorage.getItem('user_info') || 'null');
  }
  setUser(u: UserInfo): void { localStorage.setItem('user_info', JSON.stringify(u)); }
  removeUser(): void { localStorage.removeItem('user_info'); }

  isLoggedIn(): boolean { return !!this.get(); }
  isAdmin(): boolean {
    const u = this.getUser();
    return !!u && (u.role === 'Admin' || u.role === 'ADMIN');
  }
}
