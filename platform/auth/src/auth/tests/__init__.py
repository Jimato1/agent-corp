"""auth.tests — runnable unit tests for the auth foundation.

Pure-stdlib tests. The security-critical CORE LOGIC is exercised here for real
with `python -m unittest`; asymmetric crypto (EdDSA) is skipped cleanly when the
'cryptography' package is unavailable (CANNOT-VERIFY-HERE).
"""
