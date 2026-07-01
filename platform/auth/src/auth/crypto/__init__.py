"""auth.crypto — Signer implementations.

Two signers behind the one auth.core.interfaces.Signer contract:
  * signer_hmac.HMACSigner  — stdlib HS256 TEST-signer. Symmetric, runnable HERE.
    Used by the test suite to exercise ALL token LOGIC (claims/aud/exp/jti/kid/
    revocation/cnf) with zero external deps. NOT for production — a symmetric key
    cannot be published in a JWKS for offline RS validation.
  * signer_eddsa.EdDSASigner — the PRODUCTION asymmetric signer (EdDSA/Ed25519).
    Requires the 'cryptography' package. If absent it raises a LOUD RuntimeError
    at construction — it NEVER silently/fakely signs. CANNOT-VERIFY-HERE.

Import the Signer Protocol from auth.core.interfaces; import these concrete
signers from auth.crypto.
"""
