import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard.js';
import { CurrentUser, ClerkUserContext } from '../../common/decorators/current-user.decorator.js';
import { PayrollRunStateMachine } from '../../domain/state-machines/payroll.state-machine.js';
import { PayrollRunStatus } from '../../shared/index.js';

interface CreatePayrollRunDto {
  period: string;
  employeeCount: number;
  amountMinor: number;
}

const inMemoryPayrollRuns: Array<{
  id: string;
  orgId: string;
  period: string;
  employeeCount: number;
  amountMinor: number;
  status: PayrollRunStatus;
  createdAt: string;
}> = [];

@Controller('payroll')
@UseGuards(ClerkAuthGuard)
export class PayrollController {
  @Get('runs')
  getRuns(@CurrentUser() user: ClerkUserContext) {
    const orgId = user?.orgId || user?.userId || 'default-org';
    const runs = inMemoryPayrollRuns.filter((r) => r.orgId === orgId);
    return {
      runs,
      totalCount: runs.length,
      orgId,
    };
  }

  @Post('runs')
  createRun(
    @CurrentUser() user: ClerkUserContext,
    @Body() dto: CreatePayrollRunDto
  ) {
    const orgId = user?.orgId || user?.userId || 'default-org';

    if (!dto.period || !dto.amountMinor) {
      throw new BadRequestException('Period label and amountMinor are required');
    }

    const runId = `RUN-${new Date().getFullYear()}-${String(inMemoryPayrollRuns.length + 1).padStart(2, '0')}`;
    const newRun = {
      id: runId,
      orgId,
      period: dto.period,
      employeeCount: dto.employeeCount || 1,
      amountMinor: dto.amountMinor,
      status: PayrollRunStatus.DRAFT,
      createdAt: new Date().toISOString(),
    };

    inMemoryPayrollRuns.unshift(newRun);

    return {
      success: true,
      run: newRun,
    };
  }

  @Post('runs/:id/advance')
  advanceRun(
    @CurrentUser() user: ClerkUserContext,
    @Param('id') id: string
  ) {
    const orgId = user?.orgId || user?.userId || 'default-org';
    const run = inMemoryPayrollRuns.find((r) => r.id === id && r.orgId === orgId);

    if (!run) {
      throw new NotFoundException(`Payroll run ${id} not found`);
    }

    let nextStatus: PayrollRunStatus;
    if (run.status === PayrollRunStatus.DRAFT) {
      nextStatus = PayrollRunStatus.PENDING_APPROVAL;
    } else if (run.status === PayrollRunStatus.PENDING_APPROVAL) {
      nextStatus = PayrollRunStatus.APPROVED;
    } else if (run.status === PayrollRunStatus.APPROVED) {
      nextStatus = PayrollRunStatus.FUNDS_RESERVED;
    } else {
      throw new BadRequestException(`Cannot advance payroll run from status: ${run.status}`);
    }

    // Enforce domain state machine transition rule
    if (!PayrollRunStateMachine.canTransition(run.status, nextStatus)) {
      throw new BadRequestException(`Illegal state transition from ${run.status} to ${nextStatus}`);
    }

    run.status = nextStatus;

    return {
      success: true,
      run,
      transition: `${run.status} -> ${nextStatus}`,
    };
  }
}
