import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { TokenService } from './token.service';
import { environment } from '../../environments/environment';

const API_BASE = environment.apiUrl;

export interface QuantityDTO {
  value: number;
  unit: string;
  measurementType: string;
}

const TO_BASE: Record<string, Record<string, number>> = {
  LENGTH:  { Feet: 30.48, Inches: 2.54, Yards: 91.44, Centimeters: 1 },
  WEIGHT:  { Kilogram: 1000, Gram: 1, Pound: 453.592 },
  VOLUME:  { Litre: 1000, Millilitre: 1, Gallon: 3785.41 },
};

function toBase(value: number, unit: string, type: string): number {
  if (type === 'TEMPERATURE') return unit === 'Celsius' ? value : (value - 32) * 5 / 9;
  return value * ((TO_BASE[type] || {})[unit] || 1);
}
function fromBase(value: number, unit: string, type: string): number {
  if (type === 'TEMPERATURE') return unit === 'Celsius' ? value : value * 9 / 5 + 32;
  return value / ((TO_BASE[type] || {})[unit] || 1);
}
function r6(n: number): number { return parseFloat(n.toFixed(6)); }

@Injectable({ providedIn: 'root' })
export class QuantityService {
  constructor(private http: HttpClient, private token: TokenService) {}

  private headers() {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token.get()}`
    });
  }

  buildQ(value: number | string, unit: string, measurementType: string): QuantityDTO {
    return { value: parseFloat(value as string), unit, measurementType };
  }

  // ── Guest calc ──────────────────────────────────────────────
  private guestConvert(q: QuantityDTO, targetUnit: string) {
    const b = toBase(q.value, q.unit, q.measurementType);
    return of({ resultValue: r6(fromBase(b, targetUnit, q.measurementType)), resultUnit: targetUnit });
  }
  private guestCompare(q1: QuantityDTO, q2: QuantityDTO) {
    const b1 = toBase(q1.value, q1.unit, q1.measurementType);
    const b2 = toBase(q2.value, q2.unit, q2.measurementType);
    return of({ resultString: Math.abs(b1 - b2) < 1e-9 ? 'true' : 'false' });
  }
  private guestAdd(q1: QuantityDTO, q2: QuantityDTO, targetUnit: string) {
    const b = toBase(q1.value, q1.unit, q1.measurementType) + toBase(q2.value, q2.unit, q2.measurementType);
    return of({ resultValue: r6(fromBase(b, targetUnit, q1.measurementType)), resultUnit: targetUnit });
  }
  private guestSubtract(q1: QuantityDTO, q2: QuantityDTO, targetUnit: string) {
    const b = toBase(q1.value, q1.unit, q1.measurementType) - toBase(q2.value, q2.unit, q2.measurementType);
    return of({ resultValue: r6(fromBase(b, targetUnit, q1.measurementType)), resultUnit: targetUnit });
  }
  private guestDivide(q1: QuantityDTO, q2: QuantityDTO) {
    const b1 = toBase(q1.value, q1.unit, q1.measurementType);
    const b2 = toBase(q2.value, q2.unit, q2.measurementType);
    if (b2 === 0) throw new Error('Cannot divide by zero.');
    return of({ resultValue: r6(b1 / b2) });
  }

  // ── Public API ──────────────────────────────────────────────
  convert(q: QuantityDTO, targetUnit: string): Observable<any> {
    if (!this.token.isLoggedIn()) return this.guestConvert(q, targetUnit);
    return this.http.post(`${API_BASE}/quantities/convert`,
      { thisQuantityDTO: q, thatQuantityDTO: { value: 0, unit: targetUnit, measurementType: q.measurementType } },
      { headers: this.headers(), withCredentials: true });
  }

  compare(q1: QuantityDTO, q2: QuantityDTO): Observable<any> {
    if (!this.token.isLoggedIn()) return this.guestCompare(q1, q2);
    return this.http.post(`${API_BASE}/quantities/compare`,
      { thisQuantityDTO: q1, thatQuantityDTO: q2 },
      { headers: this.headers(), withCredentials: true });
  }

  add(q1: QuantityDTO, q2: QuantityDTO, targetUnit: string): Observable<any> {
    if (!this.token.isLoggedIn()) return this.guestAdd(q1, q2, targetUnit);
    return this.http.post(`${API_BASE}/quantities/add?targetUnit=${encodeURIComponent(targetUnit)}`,
      { thisQuantityDTO: q1, thatQuantityDTO: q2 },
      { headers: this.headers(), withCredentials: true });
  }

  subtract(q1: QuantityDTO, q2: QuantityDTO, targetUnit: string): Observable<any> {
    if (!this.token.isLoggedIn()) return this.guestSubtract(q1, q2, targetUnit);
    return this.http.post(`${API_BASE}/quantities/subtract?targetUnit=${encodeURIComponent(targetUnit)}`,
      { thisQuantityDTO: q1, thatQuantityDTO: q2 },
      { headers: this.headers(), withCredentials: true });
  }

  divide(q1: QuantityDTO, q2: QuantityDTO): Observable<any> {
    if (!this.token.isLoggedIn()) return this.guestDivide(q1, q2);
    return this.http.post(`${API_BASE}/quantities/divide`,
      { thisQuantityDTO: q1, thatQuantityDTO: q2 },
      { headers: this.headers(), withCredentials: true });
  }

  getByOperation(op: string): Observable<any> {
    return this.http.get(`${API_BASE}/quantities/history/operation/${op}`,
      { headers: this.headers(), withCredentials: true });
  }

  getByType(type: string): Observable<any> {
    return this.http.get(`${API_BASE}/quantities/history/type/${type}`,
      { headers: this.headers(), withCredentials: true });
  }

  getErrored(): Observable<any> {
    return this.http.get(`${API_BASE}/quantities/history/errored`,
      { headers: this.headers(), withCredentials: true });
  }
}

export const UNITS: Record<string, string[]> = {
  LENGTH:      ['Feet', 'Inches', 'Yards', 'Centimeters'],
  WEIGHT:      ['Kilogram', 'Gram', 'Pound'],
  VOLUME:      ['Litre', 'Millilitre', 'Gallon'],
  TEMPERATURE: ['Celsius', 'Fahrenheit'],
};
