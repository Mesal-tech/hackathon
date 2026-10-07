import { z } from 'zod';

export const MoneySchema = z.object({
  amountMinor: z.number().int({ message: 'Amount in minor units must be an integer' }).nonnegative({ message: 'Amount cannot be negative' }),
  currency: z.string().min(3).max(3).toUpperCase(),
});

export type MoneyInput = z.infer<typeof MoneySchema>;
