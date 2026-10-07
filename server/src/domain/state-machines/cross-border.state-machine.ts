import { CrossBorderStatus } from '../../shared/index.js';

export class InvalidCrossBorderTransitionError extends Error {
  constructor(from: CrossBorderStatus, to: CrossBorderStatus) {
    super(`Illegal CrossBorderTransfer transition from ${from} to ${to}`);
    this.name = 'InvalidCrossBorderTransitionError';
  }
}

export class CrossBorderStateMachine {
  private static readonly transitions: Record<CrossBorderStatus, CrossBorderStatus[]> = {
    [CrossBorderStatus.QUOTED]: [CrossBorderStatus.APPROVED, CrossBorderStatus.QUOTE_EXPIRED],
    [CrossBorderStatus.APPROVED]: [CrossBorderStatus.CONVERTING, CrossBorderStatus.CONVERSION_FAILED],
    [CrossBorderStatus.CONVERTING]: [CrossBorderStatus.CONVERTED, CrossBorderStatus.CONVERSION_FAILED],
    [CrossBorderStatus.CONVERTED]: [CrossBorderStatus.PAYING_OUT, CrossBorderStatus.PAYOUT_FAILED_FUNDS_HELD],
    [CrossBorderStatus.PAYING_OUT]: [CrossBorderStatus.COMPLETED, CrossBorderStatus.PAYOUT_FAILED_FUNDS_HELD],
    [CrossBorderStatus.PAYOUT_FAILED_FUNDS_HELD]: [CrossBorderStatus.PAYING_OUT, CrossBorderStatus.COMPLETED], // After operator resolution
    [CrossBorderStatus.COMPLETED]: [],
    [CrossBorderStatus.QUOTE_EXPIRED]: [],
    [CrossBorderStatus.CONVERSION_FAILED]: [],
  };

  static canTransition(from: CrossBorderStatus, to: CrossBorderStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  static transition(from: CrossBorderStatus, to: CrossBorderStatus): CrossBorderStatus {
    if (!this.canTransition(from, to)) {
      throw new InvalidCrossBorderTransitionError(from, to);
    }
    return to;
  }
}
