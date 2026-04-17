import { Component, OnInit, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { TokenService } from '../../services/token.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { AuthPanelService } from '../auth-panel/auth-panel.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NgIf, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  loggedIn = false;
  initials = 'U';
  userName = 'User';

  constructor(
    private token: TokenService,
    private auth: AuthService,
    private toast: ToastService,
    private panel: AuthPanelService
  ) {}

  @HostListener('window:auth-change')
  onAuthChange() { this.refresh(); }

  ngOnInit() { this.refresh(); }

  refresh() {
    this.loggedIn = this.token.isLoggedIn();
    const u = this.token.getUser();
    if (u) {
      this.userName = u.fullName || u.email;
      this.initials = (u.fullName || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
    }
  }

  openLogin()    { this.panel.open('login'); }
  openRegister() { this.panel.open('register'); }

  logout() {
    this.auth.logout().subscribe({ complete: () => {} });
    this.token.remove(); this.token.removeUser();
    this.refresh();
    this.toast.show('Signed out.', 'error');
    window.dispatchEvent(new Event('auth-change'));
  }
}
