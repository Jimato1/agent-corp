/*
 * errors.js — the business-error type (PLAN §3/§6; board-agents-claim.md §1).
 *
 * Business failures are STRUCTURED results carrying a `code`, never JSON-RPC/protocol errors. The
 * REST layer maps a BusinessError to its ERR_HTTP status + structured body; the MCP layer maps it to
 * { isError: true, structuredContent: { code, ... } }. Auth/PDP/budget failures use AuthError.
 */
import { ERR_HTTP } from './constants.js';

export class BusinessError extends Error {
  constructor(code, message, details = {}) {
    super(message || code);
    this.name = 'BusinessError';
    this.code = code;
    this.details = details;
    this.httpStatus = ERR_HTTP[code] ?? 422;
  }
  toStructured() {
    return { code: this.code, message: this.message, ...this.details };
  }
}

export class AuthError extends Error {
  constructor(httpStatus, code, message, headers = {}) {
    super(message || code);
    this.name = 'AuthError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.headers = headers;
  }
}

export function biz(code, message, details) {
  return new BusinessError(code, message, details);
}
