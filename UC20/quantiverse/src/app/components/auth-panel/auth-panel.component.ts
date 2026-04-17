import { Component, OnInit } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthPanelService } from './auth-panel.service';
import { AuthService } from '../../services/auth.service';
import { TokenService } from '../../services/token.service';
import { ToastService } from '../../services/toast.service';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-auth-panel',
  standalone: true,
  imports: [NgIf, NgClass, FormsModule],
  templateUrl: './auth-panel.component.html',
  styleUrls: ['./auth-panel.component.scss']
})
export class AuthPanelComponent implements OnInit {
  isOpen = false;
  activeTab: 'login' | 'register' = 'login';
  showLoginPass = false;
  showRegPass = false;

  // Login
  loginUsername = '';
  loginPass = '';
  loginErr = '';
  loginLoading = false;

  // Register
  regFirst = ''; regLast = ''; regUser = '';
  regEmail = ''; regPass = '';
  regErr = '';
  regLoading = false;
  strengthPct = 0;
  strengthColor = 'var(--error)';

  constructor(
    private panel: AuthPanelService,
    private auth: AuthService,
    private token: TokenService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.panel.state$.subscribe(s => { this.isOpen = s.open; this.activeTab = s.tab; });
  }

  close() { this.panel.close(); }

  setTab(tab: 'login' | 'register') { this.activeTab = tab; }

  onPassStrength(val: string) {
    const len = val.length;
    this.strengthPct = len >= 10 ? 100 : len >= 6 ? 60 : len >= 3 ? 30 : 0;
    this.strengthColor = this.strengthPct >= 60 ? 'var(--success)' : this.strengthPct >= 30 ? '#fbbf24' : 'var(--error)';
  }

  async doLogin() {
    this.loginErr = '';
    if (!this.loginUsername) { this.loginErr = 'Username is required.'; return; }
    if (!this.loginPass) { this.loginErr = 'Password is required.'; return; }
    this.loginLoading = true;
    this.auth.login(this.loginUsername, this.loginPass).subscribe({
      next: (d: any) => {
        this.token.set(d.accessToken);
        this.token.setUser({
          fullName: `${d.user?.firstName||''} ${d.user?.lastName||''}`.trim() || d.user?.username || this.loginUsername,
          email: d.user?.email || '',
          role: d.user?.role || 'User',
          userId: d.user?.id
        });
        this.loginLoading = false;
        this.close();
        this.toast.show('Signed in successfully!');
        window.dispatchEvent(new Event('auth-change'));
      },
      error: (e: any) => {
        this.loginErr = e?.error?.message || e?.message || 'Invalid credentials.';
        this.loginLoading = false;
      }
    });
  }

  async doRegister() {
    this.regErr = '';
    if (!this.regFirst) { this.regErr = 'First name required.'; return; }
    if (!this.regLast)  { this.regErr = 'Last name required.'; return; }
    if (!this.regUser)  { this.regErr = 'Username required.'; return; }
    if (!this.regEmail || !this.regEmail.includes('@')) { this.regErr = 'Valid email required.'; return; }
    if (this.regPass.length < 6) { this.regErr = 'Password must be at least 6 chars.'; return; }
    this.regLoading = true;
    this.auth.register(this.regFirst, this.regLast, this.regUser, this.regEmail, this.regPass).subscribe({
      next: (d: any) => {
        this.token.set(d.accessToken);
        this.token.setUser({
          fullName: `${d.user?.firstName||this.regFirst} ${d.user?.lastName||this.regLast}`.trim(),
          email: d.user?.email || this.regEmail,
          role: d.user?.role || 'User',
          userId: d.user?.id
        });
        this.regLoading = false;
        this.close();
        this.toast.show('Account created!');
        window.dispatchEvent(new Event('auth-change'));
      },
      error: (e: any) => {
        this.regErr = e?.error?.message || e?.message || 'Registration failed.';
        this.regLoading = false;
      }
    });
  }
}
