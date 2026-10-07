import { PayrollRunStatus } from '../../shared/index.js';

export class InvalidPayrollTransitionError extends Error {
  constructor(from: PayrollRunStatus, to: PayrollRunStatus) {
    super(`Illegal PayrollRun transition from ${from} to ${to}`);
    this.name = 'InvalidPayrollTransitionError';
  }
}

export class PayrollRunStateMachine {
  private static readonly transitions: Record<PayrollRunStatus, PayrollRunStatus[]> = {
    [PayrollRunStatus.DRAFT]: [PayrollRunStatus.PENDING_APPROVAL, PayrollRunStatus.CANCELLED],
    [PayrollRunStatus.PENDING_APPROVAL]: [PayrollRunStatus.APPROVED, PayrollRunStatus.REJECTED, PayrollRunStatus.CANCELLED],
    [PayrollRunStatus.APPROVED]: [PayrollRunStatus.FUNDS_RESERVED, PayrollRunStatus.CANCELLED],
    [PayrollRunStatus.FUNDS_RESERVED]: [PayrollRunStatus.PROCESSING, PayrollRunStatus.CANCELLED],
    [PayrollRunStatus.PROCESSING]: [PayrollRunStatus.COMPLETED, PayrollRunStatus.PARTIALLY_FAILED],
    [PayrollRunStatus.PARTIALLY_FAILED]: [PayrollRunStatus.PROCESSING, PayrollRunStatus.COMPLETED],
    [PayrollRunStatus.COMPLETED]: [],
    [PayrollRunStatus.REJECTED]: [],
    [PayrollRunStatus.CANCELLED]: [],
  };

  static canTransition(from: PayrollRunStatus, to: PayrollRunStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  static transition(from: PayrollRunStatus, to: PayrollRunStatus): PayrollRunStatus {
    if (!this.canTransition(from, to)) {
      throw new InvalidPayrollTransitionError(from, to);
    }
    return to;
  }
}
