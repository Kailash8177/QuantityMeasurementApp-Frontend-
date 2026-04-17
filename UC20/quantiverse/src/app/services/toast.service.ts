import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast { message: string; type: 'success' | 'error'; id: number; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts$ = new Subject<Toast>();
  toasts$ = this._toasts$.asObservable();
  private id = 0;

  show(message: string, type: 'success' | 'error' = 'success') {
    this._toasts$.next({ message, type, id: ++this.id });
  }
}
