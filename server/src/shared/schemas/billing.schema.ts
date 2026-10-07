import { z } from 'zod';

export const BillItemSchema = z.object({
  label: z.string().min(1),
  amountMinor: z.number().int().positive({ message: 'Bill item amount must be positive integer minor units' }),
});

export const CreateBillSchema = z.object({
  payerId: z.string().uuid(),
  currency: z.string().length(3).toUpperCase(),
  dueDate: z.string().datetime(),
  items: z.array(BillItemSchema).min(1, { message: 'At least one bill item is required' }),
});

export const CreatePayerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  externalRef: z.string().optional(),
});

export const RefundRequestSchema = z.object({
  amountMinor: z.number().int().positive(),
  reason: z.string().min(3),
});
