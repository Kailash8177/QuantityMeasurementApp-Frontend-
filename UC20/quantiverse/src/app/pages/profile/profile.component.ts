import { Component, OnInit, HostListener } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { TokenService } from '../../services/token.service';
import { AuthPanelService } from '../../components/auth-panel/auth-panel.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgIf],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  loggedIn = false;
  initials = 'U';
  fullName = '—';
  userId = '—';
  email = '—';
  role = '—';

  constructor(
    private auth: AuthService,
    private token: TokenService,
    private panel: AuthPanelService
  ) {}

  @HostListener('window:auth-change')
  onAuthChange() { this.loggedIn = this.token.isLoggedIn(); if (this.loggedIn) this.load(); }

  ngOnInit() { this.loggedIn = this.token.isLoggedIn(); if (this.loggedIn) this.load(); }

  openLogin() { this.panel.open('login'); }

  load() {
    const u = this.token.getUser();
    if (u) this.render(u);
    this.auth.profile().subscribe({
      next: (d: any) => {
        const u2 = {
          fullName: `${d.firstName||''} ${d.lastName||''}`.trim() || d.username || u?.fullName || 'User',
          email: d.email || u?.email || '—',
          role: d.role || u?.role || 'User',
          userId: d.id || u?.userId || '—'
        };
        this.token.setUser(u2 as any);
        this.render(u2 as any);
      }
    });
  }

  private render(u: any) {
    this.fullName = u.fullName || '—';
    this.email    = u.email    || '—';
    this.role     = u.role     || '—';
    this.userId   = u.userId   || '—';
    this.initials = (u.fullName || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0,2);
  }
}
