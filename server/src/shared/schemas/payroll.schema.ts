import { z } from 'zod';
import { PayeeKind } from '../types/enums.js';

export const CreatePayeeSchema = z.object({
  name: z.string().min(2),
  kind: z.nativeEnum(PayeeKind),
  country: z.string().default('NG'),
  department: z.string().optional(),
  grossSalaryMinor: z.number().int().nonnegative().optional(),
  payFrequency: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY']).default('MONTHLY'),
});

export const AddBankAccountSchema = z.object({
  bankCode: z.string().min(3),
  accountNumber: z.string().min(10).max(10),
  currency: z.string().length(3).default('NGN'),
});

export const CreatePayrollRunSchema = z.object({
  period: z.string().min(7), // e.g. "2026-10"
});

export const AdjustPayrollItemSchema = z.object({
  grossMinor: z.number().int().nonnegative(),
  netMinor: z.number().int().nonnegative(),
});
