import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthPanelService {
  private _open$ = new BehaviorSubject<{ open: boolean; tab: 'login' | 'register' }>({ open: false, tab: 'login' });
  state$ = this._open$.asObservable();

  open(tab: 'login' | 'register' = 'login') { this._open$.next({ open: true, tab }); }
  close() { this._open$.next({ open: false, tab: this._open$.value.tab }); }
}
