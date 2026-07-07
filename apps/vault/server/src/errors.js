/*
 * errors.js — error types. AuthError for the OAuth RS baseline (401/403 + WWW-Authenticate).
 * RedeemError for the §4 redeem pipeline: every reject is a typed, in-code, fail-closed rejection
 * carrying the frozen G-1 code + http + retryability. BusinessError for the MCP/manage surfaces.
 *
 * The redeem pipeline NEVER throws a bare/protocol error on a business reject — a reject is a
 * deterministic RedeemError the /redeem route maps to its http + machine deny-reason (no scope hint).
 */

export class AuthError extends Error {
  constructor(httpStatus, code, message, headers = {}) {
    super(message || code);
    this.name = 'AuthError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.headers = headers;
  }
}

export class BusinessError extends Error {
  constructor(httpStatus, code, message, details = {}) {
    super(message || code);
    this.name = 'BusinessError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.details = details;
  }
  toStructured() {
    return { code: this.code, message: this.message, ...this.details };
  }
}

/**
 * A typed redeem rejection. `spec` is one of the constants.REDEEM.* entries ({code, http, retry}).
 * `detail` is an OPTIONAL machine-only field; it NEVER echoes request content (§10 axis 3 — denial
 * messages are static strings + IDs). The response body is exactly { code, retry } (+ audit_ref).
 */
export class RedeemError extends Error {
  constructor(spec, detail = undefined) {
    super(spec.code);
    this.name = 'RedeemError';
    this.code = spec.code;
    this.httpStatus = spec.http;
    this.retry = spec.retry;
    this.detail = detail;
  }
  body(auditRef) {
    return { code: this.code, retry: this.retry, ...(auditRef ? { audit_ref: auditRef } : {}) };
  }
}

export function biz(httpStatus, code, message, details) {
  return new BusinessError(httpStatus, code, message, details);
}
