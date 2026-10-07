export interface DomainEvent<T = unknown> {
  readonly id: string;
  readonly orgId: string;
  readonly eventName: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: T;
  readonly occurredAt: Date;
}
