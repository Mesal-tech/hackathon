import { PaymentStatus } from '../../shared/index.js';

export class InvalidPaymentTransitionError extends Error {
  constructor(from: PaymentStatus, to: PaymentStatus) {
    super(`Illegal Payment transition from ${from} to ${to}`);
    this.name = 'InvalidPaymentTransitionError';
  }
}

export class PaymentStateMachine {
  private static readonly transitions: Record<PaymentStatus, PaymentStatus[]> = {
    [PaymentStatus.INITIATED]: [PaymentStatus.PROCESSING, PaymentStatus.FAILED, PaymentStatus.ABANDONED],
    [PaymentStatus.PROCESSING]: [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.ABANDONED],
    [PaymentStatus.SUCCESS]: [],
    [PaymentStatus.FAILED]: [],
    [PaymentStatus.ABANDONED]: [],
  };

  static canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  static transition(from: PaymentStatus, to: PaymentStatus): PaymentStatus {
    if (!this.canTransition(from, to)) {
      throw new InvalidPaymentTransitionError(from, to);
    }
    return to;
  }
}
