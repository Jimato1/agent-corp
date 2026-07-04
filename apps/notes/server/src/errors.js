/*
 * errors.js — the business-error type.
 *
 * PLAN §6 / board-agents-claim.md §1: business failures are STRUCTURED results (a `code` field),
 * never JSON-RPC/protocol errors. The REST layer maps a BusinessError to its ERR_HTTP status; the
 * MCP layer maps it to { isError: true, structuredContent: { code, message, ...details } }.
 * Auth/PDP/budget failures use AuthError (401/403/409/429/503) per the RS baseline.
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
