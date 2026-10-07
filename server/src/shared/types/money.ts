export type SupportedCurrency = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'KES' | 'GHS' | (string & {});

export interface MoneyDto {
  amountMinor: number; // Integer minor units (e.g., 250000 for 2,500.00 NGN)
  currency: SupportedCurrency;
}
