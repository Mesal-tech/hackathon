import { LedgerAccountType, SupportedCurrency, LedgerDirection } from '../../shared/index.js';

export interface LedgerAccountProps {
  id: string;
  orgId: string;
  code: string;
  name: string;
  type: LedgerAccountType;
  currency: SupportedCurrency;
}

export class LedgerAccount {
  readonly id: string;
  readonly orgId: string;
  readonly code: string;
  readonly name: string;
  readonly type: LedgerAccountType;
  readonly currency: SupportedCurrency;

  constructor(props: LedgerAccountProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.code = props.code;
    this.name = props.name;
    this.type = props.type;
    this.currency = props.currency;
  }

  /**
   * Returns normal balance direction for standard accounting principles:
   * ASSET & EXPENSE are increased by DEBIT.
   * LIABILITY & INCOME are increased by CREDIT.
   */
  get normalBalance(): LedgerDirection {
    switch (this.type) {
      case LedgerAccountType.ASSET:
      case LedgerAccountType.EXPENSE:
        return LedgerDirection.DEBIT;
      case LedgerAccountType.LIABILITY:
      case LedgerAccountType.INCOME:
        return LedgerDirection.CREDIT;
    }
  }
}
