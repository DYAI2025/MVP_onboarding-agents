export class GatewayError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'GatewayError';
  }
}

export interface ErrorResponse {
  error: { code: string; message: string };
  request_id: string;
}

export function formatErrorResponse(error: GatewayError, requestId: string): ErrorResponse {
  return {
    error: { code: error.code, message: error.message },
    request_id: requestId
  };
}
