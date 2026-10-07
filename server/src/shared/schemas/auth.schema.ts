import { z } from 'zod';
import { UserRole } from '../types/enums.js';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, { message: 'Password must be at least 12 characters' }),
  organizationName: z.string().min(2),
  country: z.string().default('NG'),
  baseCurrency: z.string().length(3).default('NGN'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().optional(),
});

export const VerifyMfaSchema = z.object({
  token: z.string().length(6),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
});
