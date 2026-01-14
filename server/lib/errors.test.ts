import { describe, it, expect } from 'vitest';
import { GatewayError, formatErrorResponse } from './errors';

describe('GatewayError', () => {
  it('creates error with code and message', () => {
    const error = new GatewayError('ENGINE_UNAVAILABLE', 'BaziEngine is down');
    expect(error.code).toBe('ENGINE_UNAVAILABLE');
    expect(error.message).toBe('BaziEngine is down');
    expect(error.statusCode).toBe(500);
  });

  it('uses custom status code', () => {
    const error = new GatewayError('NOT_FOUND', 'Chart not found', 404);
    expect(error.statusCode).toBe(404);
  });
});

describe('formatErrorResponse', () => {
  it('formats error with request id', () => {
    const error = new GatewayError('TEST_ERROR', 'Test message');
    const response = formatErrorResponse(error, 'req-123');
    expect(response).toEqual({
      error: { code: 'TEST_ERROR', message: 'Test message' },
      request_id: 'req-123'
    });
  });
});
