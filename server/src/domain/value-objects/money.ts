import { SupportedCurrency, MoneyDto } from '../../shared/index.js';

export class Money {
  readonly amountMinor: number;
  readonly currency: SupportedCurrency;

  private constructor(amountMinor: number, currency: SupportedCurrency) {
    if (!Number.isInteger(amountMinor)) {
      throw new TypeError(`Money amountMinor must be an integer, got: ${amountMinor}`);
    }
    this.amountMinor = amountMinor;
    this.currency = currency.toUpperCase() as SupportedCurrency;
  }

  static fromMinor(amountMinor: number, currency: SupportedCurrency): Money {
    return new Money(amountMinor, currency);
  }

  static zero(currency: SupportedCurrency): Money {
    return new Money(0, currency);
  }

  static fromDto(dto: MoneyDto): Money {
    return new Money(dto.amountMinor, dto.currency);
  }

  toDto(): MoneyDto {
    return {
      amountMinor: this.amountMinor,
      currency: this.currency,
    };
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: cannot operate on ${this.currency} and ${other.currency}`);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  multiply(multiplier: number): Money {
    if (!Number.isFinite(multiplier)) {
      throw new Error(`Multiplier must be a finite number, got: ${multiplier}`);
    }
    // Round to nearest integer minor unit
    const result = Math.round(this.amountMinor * multiplier);
    return new Money(result, this.currency);
  }

  /**
   * Allocate amount across ratios without losing minor units to rounding errors
   */
  allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) return [];
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    if (totalRatio <= 0) {
      throw new Error('Total ratio must be positive');
    }

    let remainder = this.amountMinor;
    const results: Money[] = [];

    for (let i = 0; i < ratios.length; i++) {
      const share = Math.floor((this.amountMinor * ratios[i]) / totalRatio);
      results.push(new Money(share, this.currency));
      remainder -= share;
    }

    // Distribute remaining minor units 1 by 1
    for (let i = 0; i < remainder; i++) {
      const current = results[i % results.length];
      results[i % results.length] = new Money(current.amountMinor + 1, this.currency);
    }

    return results;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amountMinor === other.amountMinor;
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor > other.amountMinor;
  }

  greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor >= other.amountMinor;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor < other.amountMinor;
  }

  lessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor <= other.amountMinor;
  }

  isZero(): boolean {
    return this.amountMinor === 0;
  }

  isPositive(): boolean {
    return this.amountMinor > 0;
  }

  isNegative(): boolean {
    return this.amountMinor < 0;
  }

  /**
   * Display formatted currency string (e.g. ₦2,500.00 for NGN 250000)
   */
  format(locale: string = 'en-NG'): string {
    const major = this.amountMinor / 100;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: this.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(major);
    } catch {
      return `${this.currency} ${major.toFixed(2)}`;
    }
  }
}
