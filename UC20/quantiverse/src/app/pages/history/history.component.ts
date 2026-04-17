import { Component, OnInit, HostListener } from '@angular/core';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuantityService } from '../../services/quantity.service';
import { TokenService } from '../../services/token.service';
import { AuthPanelService } from '../../components/auth-panel/auth-panel.service';

interface HistoryRow {
  op: string; v1: string; v2: string;
  result: string; mtype: string; hasErr: boolean;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, FormsModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  loggedIn = false;
  rows: HistoryRow[] = [];
  loading = false;
  filterOp = '';
  filterType = '';

  constructor(
    private qty: QuantityService,
    private token: TokenService,
    private panel: AuthPanelService
  ) {}

  @HostListener('window:auth-change')
  onAuthChange() { this.loggedIn = this.token.isLoggedIn(); if (this.loggedIn) this.loadAll(); }

  ngOnInit() { this.loggedIn = this.token.isLoggedIn(); if (this.loggedIn) this.loadAll(); }

  openLogin() { this.panel.open('login'); }

  fetch() {
    if (this.filterOp) { this.loadByOp(this.filterOp); return; }
    if (this.filterType) { this.loadByType(this.filterType); return; }
    this.loadAll();
  }

  fetchErrors() {
    this.loading = true;
    this.qty.getErrored().subscribe({
      next: (d: any) => { this.rows = this.mapRows(Array.isArray(d) ? d : []); this.loading = false; },
      error: () => { this.rows = []; this.loading = false; }
    });
  }

  private loadAll() {
    const ops = ['compare','convert','add','subtract','divide'];
    this.loading = true; this.rows = [];
    let done = 0;
    const all: any[] = [];
    ops.forEach(op => {
      this.qty.getByOperation(op).subscribe({
        next: (d: any) => { if (Array.isArray(d)) all.push(...d); },
        complete: () => { done++; if (done === ops.length) { this.rows = this.mapRows(all); this.loading = false; } },
        error: () => { done++; if (done === ops.length) { this.rows = this.mapRows(all); this.loading = false; } }
      });
    });
  }

  private loadByOp(op: string) {
    this.loading = true;
    this.qty.getByOperation(op).subscribe({
      next: (d: any) => { this.rows = this.mapRows(Array.isArray(d) ? d : []); this.loading = false; },
      error: () => { this.rows = []; this.loading = false; }
    });
  }

  private loadByType(type: string) {
    this.loading = true;
    this.qty.getByType(type).subscribe({
      next: (d: any) => { this.rows = this.mapRows(Array.isArray(d) ? d : []); this.loading = false; },
      error: () => { this.rows = []; this.loading = false; }
    });
  }

  private mapRows(data: any[]): HistoryRow[] {
    return data.map(row => {
      const op = (row.operation || '').toLowerCase();
      const v1 = `${row.thisValue ?? row.operand1Value ?? '—'} ${row.thisUnit || row.operand1Unit || ''}`.trim();
      const v2 = row.thatValue != null ? `${row.thatValue} ${row.thatUnit || ''}`.trim()
               : row.operand2Value != null ? `${row.operand2Value} ${row.operand2Unit || ''}`.trim() : '—';
      const hasErr = !!(row.error || row.hasError);
      let result = '';
      if (hasErr) result = `⚠ ${row.errorMessage || 'Error'}`;
      else if (op === 'compare') result = (row.resultString === 'true' || row.resultValue === 1) ? '✅ Equal' : '❌ Not Equal';
      else if (op === 'divide') result = `${parseFloat(row.resultValue).toFixed(4)} (scalar)`;
      else result = `${row.resultValue ?? '—'} ${row.resultUnit || ''}`.trim();
      const mtype = row.thisMeasurementType || row.resultMeasurementType || row.operand1MeasurementType || '';
      return { op: op.toUpperCase(), v1, v2, result, mtype, hasErr };
    });
  }
}
