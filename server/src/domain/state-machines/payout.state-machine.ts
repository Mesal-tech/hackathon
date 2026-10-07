import { PayoutStatus } from '../../shared/index.js';

export class InvalidPayoutTransitionError extends Error {
  constructor(from: PayoutStatus, to: PayoutStatus) {
    super(`Illegal Payout transition from ${from} to ${to}`);
    this.name = 'InvalidPayoutTransitionError';
  }
}

export class PayoutStateMachine {
  private static readonly transitions: Record<PayoutStatus, PayoutStatus[]> = {
    [PayoutStatus.PENDING]: [PayoutStatus.SENT, PayoutStatus.FAILED],
    [PayoutStatus.SENT]: [PayoutStatus.SUCCESS, PayoutStatus.FAILED, PayoutStatus.UNKNOWN],
    [PayoutStatus.UNKNOWN]: [PayoutStatus.SUCCESS, PayoutStatus.FAILED],
    [PayoutStatus.SUCCESS]: [],
    [PayoutStatus.FAILED]: [PayoutStatus.PENDING], // Retry mechanism
  };

  static canTransition(from: PayoutStatus, to: PayoutStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  static transition(from: PayoutStatus, to: PayoutStatus): PayoutStatus {
    if (!this.canTransition(from, to)) {
      throw new InvalidPayoutTransitionError(from, to);
    }
    return to;
  }
}
