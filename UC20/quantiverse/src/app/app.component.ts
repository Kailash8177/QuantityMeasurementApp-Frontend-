import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { AuthPanelComponent } from './components/auth-panel/auth-panel.component';
import { ToastService, Toast } from './services/toast.service';
import { NgFor, NgClass } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, AuthPanelComponent, NgFor, NgClass],
  template: `
    <canvas id="particleCanvas"></canvas>
    <app-auth-panel></app-auth-panel>
    <app-navbar></app-navbar>
    <main style="position:relative;z-index:1;">
      <router-outlet></router-outlet>
    </main>
    <div class="toast-root">
      <div *ngFor="let t of toasts" class="toast" [ngClass]="t.type">{{ t.message }}</div>
    </div>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub!: Subscription;

  constructor(private toastSvc: ToastService) {}

  ngOnInit() {
    this.sub = this.toastSvc.toasts$.subscribe(t => {
      this.toasts.push(t);
      setTimeout(() => this.toasts = this.toasts.filter(x => x.id !== t.id), 3200);
    });
    this.initParticles();
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  initParticles() {
    const cv = document.getElementById('particleCanvas') as HTMLCanvasElement;
    if (!cv) return;
    cv.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
    const ctx = cv.getContext('2d')!;
    let ps: any[] = [];
    const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
    const init = () => {
      ps = [];
      const n = Math.floor(cv.width * cv.height / 18000);
      for (let i = 0; i < n; i++)
        ps.push({ x: Math.random()*cv.width, y: Math.random()*cv.height,
          vx: (Math.random()-.5)*.3, vy: (Math.random()-.5)*.3,
          sz: Math.random()*1.5+.5, op: Math.random()*.3+.08,
          c: ['#a78bfa','#22d3ee','#f472b6'][~~(Math.random()*3)] });
    };
    const draw = () => {
      ctx.clearRect(0,0,cv.width,cv.height);
      ps.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0) p.x=cv.width; if(p.x>cv.width) p.x=0;
        if(p.y<0) p.y=cv.height; if(p.y>cv.height) p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);
        ctx.fillStyle=p.c; ctx.globalAlpha=p.op; ctx.fill();
      });
      ctx.globalAlpha=1; requestAnimationFrame(draw);
    };
    resize(); init(); draw();
    window.addEventListener('resize', () => { resize(); init(); });
  }
}
