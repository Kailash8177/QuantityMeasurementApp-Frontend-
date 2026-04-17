import { Component, OnInit, HostListener } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuantityService, UNITS } from '../../services/quantity.service';
import { ToastService } from '../../services/toast.service';
import { AuthPanelService } from '../../components/auth-panel/auth-panel.service';

type Op = 'convert' | 'compare' | 'add' | 'subtract' | 'divide';
type MType = 'LENGTH' | 'WEIGHT' | 'VOLUME' | 'TEMPERATURE';

interface Result { value: string; unit: string; label: string; isError: boolean; }

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, FormsModule],
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.scss']
})
export class CalculatorComponent implements OnInit {
  ops: Op[] = ['convert', 'compare', 'add', 'subtract', 'divide'];
  opLabels: Record<Op, string> = {
    convert: '⇄ CONVERT', compare: '⚖ COMPARE',
    add: '➕ ADD', subtract: '− SUBTRACT', divide: '➗ DIVIDE'
  };
  mTypes: MType[] = ['LENGTH', 'WEIGHT', 'VOLUME', 'TEMPERATURE'];
  mTypeLabels: Record<MType, string> = {
    LENGTH: '📏 LENGTH', WEIGHT: '⚖️ WEIGHT',
    VOLUME: '🧪 VOLUME', TEMPERATURE: '🌡️ TEMP'
  };

  currentOp: Op = 'convert';
  currentType: MType = 'LENGTH';
  units: string[] = [];

  // Convert
  cvVal = ''; cvFrom = ''; cvTo = '';
  resConvert: Result | null = null;

  // Compare
  cmpVal1 = ''; cmpUnit1 = ''; cmpVal2 = ''; cmpUnit2 = '';
  resCmp: Result | null = null;

  // Add
  addVal1 = ''; addUnit1 = ''; addVal2 = ''; addUnit2 = ''; addTarget = '';
  resAdd: Result | null = null;

  // Subtract
  subVal1 = ''; subUnit1 = ''; subVal2 = ''; subUnit2 = ''; subTarget = '';
  resSub: Result | null = null;

  // Divide
  divVal1 = ''; divUnit1 = ''; divVal2 = ''; divUnit2 = '';
  resDiv: Result | null = null;

  unitRef = [
    { type: 'LENGTH',      units: 'FEET · INCHES · YARDS · CENTIMETERS' },
    { type: 'WEIGHT',      units: 'KILOGRAM · GRAM · POUND' },
    { type: 'VOLUME',      units: 'LITRE · MILLILITRE · GALLON' },
    { type: 'TEMPERATURE', units: 'CELSIUS · FAHRENHEIT' },
  ];

  constructor(private qty: QuantityService, private toast: ToastService) {}

  @HostListener('window:auth-change')
  onAuthChange() { /* units don't change, but results are reset */ }

  ngOnInit() { this.updateUnits(); }

  setOp(op: Op) { this.currentOp = op; }

  setType(t: MType) {
    this.currentType = t;
    this.updateUnits();
    // Reset results
    this.resConvert = this.resCmp = this.resAdd = this.resSub = this.resDiv = null;
  }

  updateUnits() {
    this.units = UNITS[this.currentType] || [];
    this.cvFrom = this.cvTo = this.units[0] || '';
    this.cmpUnit1 = this.cmpUnit2 = this.units[0] || '';
    this.addUnit1 = this.addUnit2 = this.addTarget = this.units[0] || '';
    this.subUnit1 = this.subUnit2 = this.subTarget = this.units[0] || '';
    this.divUnit1 = this.divUnit2 = this.units[0] || '';
  }

  execConvert() {
    if (!this.cvVal) { this.toast.show('Enter a value.', 'error'); return; }
    const q = this.qty.buildQ(this.cvVal, this.cvFrom, this.currentType);
    this.qty.convert(q, this.cvTo).subscribe({
      next: (d: any) => this.resConvert = { value: d.resultValue, unit: d.resultUnit, label: `${this.cvVal} ${this.cvFrom} → ${this.cvTo}`, isError: false },
      error: (e: any) => this.resConvert = { value: e?.error?.message || 'Error', unit: '', label: '', isError: true }
    });
  }

  execCompare() {
    if (!this.cmpVal1 || !this.cmpVal2) { this.toast.show('Enter both values.', 'error'); return; }
    const q1 = this.qty.buildQ(this.cmpVal1, this.cmpUnit1, this.currentType);
    const q2 = this.qty.buildQ(this.cmpVal2, this.cmpUnit2, this.currentType);
    this.qty.compare(q1, q2).subscribe({
      next: (d: any) => {
        const eq = d.resultString === 'true' || d.resultValue === 1;
        this.resCmp = { value: eq ? '✅ EQUAL' : '❌ NOT EQUAL', unit: '', label: `${this.cmpVal1} ${this.cmpUnit1} vs ${this.cmpVal2} ${this.cmpUnit2}`, isError: false };
      },
      error: (e: any) => this.resCmp = { value: e?.error?.message || 'Error', unit: '', label: '', isError: true }
    });
  }

  execAdd() {
    if (!this.addVal1 || !this.addVal2) { this.toast.show('Enter both values.', 'error'); return; }
    const q1 = this.qty.buildQ(this.addVal1, this.addUnit1, this.currentType);
    const q2 = this.qty.buildQ(this.addVal2, this.addUnit2, this.currentType);
    this.qty.add(q1, q2, this.addTarget).subscribe({
      next: (d: any) => this.resAdd = { value: d.resultValue, unit: d.resultUnit, label: `${this.addVal1} ${this.addUnit1} + ${this.addVal2} ${this.addUnit2}`, isError: false },
      error: (e: any) => this.resAdd = { value: e?.error?.message || 'Error', unit: '', label: '', isError: true }
    });
  }

  execSubtract() {
    if (!this.subVal1 || !this.subVal2) { this.toast.show('Enter both values.', 'error'); return; }
    const q1 = this.qty.buildQ(this.subVal1, this.subUnit1, this.currentType);
    const q2 = this.qty.buildQ(this.subVal2, this.subUnit2, this.currentType);
    this.qty.subtract(q1, q2, this.subTarget).subscribe({
      next: (d: any) => this.resSub = { value: d.resultValue, unit: d.resultUnit, label: `${this.subVal1} ${this.subUnit1} − ${this.subVal2} ${this.subUnit2}`, isError: false },
      error: (e: any) => this.resSub = { value: e?.error?.message || 'Error', unit: '', label: '', isError: true }
    });
  }

  execDivide() {
    if (!this.divVal1 || !this.divVal2) { this.toast.show('Enter both values.', 'error'); return; }
    if (parseFloat(this.divVal2) === 0) { this.toast.show('Cannot divide by zero.', 'error'); return; }
    const q1 = this.qty.buildQ(this.divVal1, this.divUnit1, this.currentType);
    const q2 = this.qty.buildQ(this.divVal2, this.divUnit2, this.currentType);
    this.qty.divide(q1, q2).subscribe({
      next: (d: any) => this.resDiv = { value: parseFloat(d.resultValue).toFixed(6), unit: '(scalar)', label: `${this.divVal1} ${this.divUnit1} ÷ ${this.divVal2} ${this.divUnit2}`, isError: false },
      error: (e: any) => this.resDiv = { value: e?.error?.message || 'Error', unit: '', label: '', isError: true }
    });
  }
}
