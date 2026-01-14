import { describe, it, expect, vi } from 'vitest';
import { requestIdMiddleware } from './requestId';

describe('requestIdMiddleware', () => {
  it('adds request id to req and response header', () => {
    const req: any = {};
    const res: any = { setHeader: vi.fn() };
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.id).toBeDefined();
    expect(req.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.id);
    expect(next).toHaveBeenCalled();
  });
});
