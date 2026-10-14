import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard.js';
import { CurrentUser, ClerkUserContext } from '../../common/decorators/current-user.decorator.js';
import { LedgerService } from './ledger.service.js';
import { SupportedCurrency } from '../../shared/index.js';

interface CreateEntryDto {
  description: string;
  sourceType: string;
  sourceId?: string;
  currency?: SupportedCurrency;
  lines: Array<{
    accountId: string;
    direction: 'DEBIT' | 'CREDIT';
    amountMinor: number;
  }>;
}

@Controller('ledger')
@UseGuards(ClerkAuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  private getOrgId(user: ClerkUserContext, headerOrgId?: string): string {
    return headerOrgId || user?.orgId || user?.userId || 'default-org';
  }

  @Get('entries')
  getEntries(
    @CurrentUser() user: ClerkUserContext,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const entries = this.ledgerService.getEntries(orgId);
    return {
      entries,
      totalCount: entries.length,
      orgId,
    };
  }

  @Post('entries')
  createEntry(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: CreateEntryDto,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);

    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('A double-entry journal entry must have at least 2 lines (debit and credit)');
    }

    const debitLine = dto.lines.find((l) => l.direction === 'DEBIT');
    const creditLine = dto.lines.find((l) => l.direction === 'CREDIT');

    if (!debitLine || !creditLine) {
      throw new BadRequestException('A double-entry journal entry must have both a DEBIT and a CREDIT line');
    }

    try {
      const storedEntry = this.ledgerService.postJournalEntry({
        orgId,
        description: dto.description || 'Manual Journal Entry',
        sourceType: dto.sourceType || 'MANUAL',
        sourceId: dto.sourceId,
        debitAccount: debitLine.accountId,
        creditAccount: creditLine.accountId,
        amountMinor: debitLine.amountMinor,
        currency: dto.currency || 'NGN',
      });

      return {
        success: true,
        entry: storedEntry,
      };
    } catch (err: any) {
      throw new BadRequestException(`Ledger invariant check failed: ${err.message}`);
    }
  }

  @Get('accounts')
  getAccounts(
    @CurrentUser() user: ClerkUserContext,
    @Headers('x-org-id') headerOrgId?: string
  ) {
    const orgId = this.getOrgId(user, headerOrgId);
    const accounts = this.ledgerService.getAccounts(orgId);
    return { accounts };
  }
}
