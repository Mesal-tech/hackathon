export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalidParams?: Array<{
    name: string;
    reason: string;
  }>;
  code?: string;
  timestamp: string;
}

export function createProblemDetails(params: {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
  code?: string;
}): ProblemDetails {
  return {
    type: params.type || `https://api.hackathon.internal/errors/${params.code || 'general-error'}`,
    title: params.title,
    status: params.status,
    detail: params.detail,
    instance: params.instance,
    invalidParams: params.invalidParams,
    code: params.code,
    timestamp: new Date().toISOString(),
  };
}
