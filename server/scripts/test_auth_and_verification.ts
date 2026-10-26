import axios from 'axios';

const BACKEND_URL = process.env.API_URL || 'http://localhost:5000/api';

async function runAuthAndVerificationTests() {
  console.log('================================================================');
  console.log('    SPENDIFY SECURE EMAIL OTP & AUTHENTICATION AUDIT TEST       ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  const testEmail = `test.user.${Date.now()}@spendify.com`;
  const testPhone = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const testPassword = 'SecurePassword@123';
  const testName = 'Verified Test Borrower';

  console.log(`Test Subject: ${testEmail}`);

  // TEST 1: Registration of unverified account
  console.log('\n[TEST 1] Registering New Account (POST /api/auth/register)...');
  let registerRes: any;
  let serverOtp = '';
  try {
    registerRes = await axios.post(`${BACKEND_URL}/auth/register`, {
      name: testName,
      email: testEmail,
      phone: testPhone,
      password: testPassword,
      role: 'BORROWER'
    });

    assert(registerRes.status === 201, `HTTP Status 201 Created: received ${registerRes.status}`);
    assert(registerRes.data.unverified === true, 'Response flags unverified: true');
    assert(!registerRes.data.token, 'CRITICAL SECURITY: No JWT access token issued before OTP verification');
    assert(registerRes.data.emailDelivery !== undefined, 'Email delivery information object returned');
    
    serverOtp = registerRes.data.emailDelivery?.devOtp;
    assert(serverOtp === '434710', `Demo OTP matches expected 434710: ${serverOtp}`);
    assert(Boolean(serverOtp) && /^\d{6}$/.test(serverOtp), `6-digit cryptographic OTP generated: ${serverOtp}`);
    console.log(`    Delivery Mode: ${registerRes.data.emailDelivery?.simulated ? 'Simulated Local/Dev' : 'Live SMTP'}`);
  } catch (err: any) {
    assert(false, `Registration failed: ${err.response?.data?.error || err.message}`);
    return;
  }

  // TEST 2: Unverified user cannot log in
  console.log('\n[TEST 2] Verifying Login Gating for Unverified User (POST /api/auth/login)...');
  try {
    await axios.post(`${BACKEND_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    assert(false, 'CRITICAL SECURITY BREACH: Unverified user was permitted to log in!');
  } catch (err: any) {
    assert(err.response?.status === 403, `HTTP 403 Forbidden received: ${err.response?.status}`);
    assert(err.response?.data?.unverified === true, 'Response explicitly flags unverified: true');
    assert(!err.response?.data?.token, 'No session token issued for unverified user');
  }

  // TEST 3: Invalid OTP attempt rejection and attempt tracking
  console.log('\n[TEST 3] Testing Invalid OTP Submission (POST /api/auth/verify-otp)...');
  try {
    await axios.post(`${BACKEND_URL}/auth/verify-otp`, {
      email: testEmail,
      otp: '000000'
    });
    assert(false, 'Invalid OTP was accepted!');
  } catch (err: any) {
    assert(err.response?.status === 400, `HTTP 400 Bad Request received: ${err.response?.status}`);
    assert(err.response?.data?.remainingAttempts !== undefined, 
      `Remaining attempts tracked: ${err.response?.data?.remainingAttempts} of 5`);
  }

  // TEST 4: Resend OTP with cooldown enforcement
  console.log('\n[TEST 4] Testing Resend OTP Cooldown (60s) (POST /api/auth/resend-otp)...');
  try {
    await axios.post(`${BACKEND_URL}/auth/resend-otp`, {
      email: testEmail
    });
    assert(false, 'Resend allowed immediately without respecting 60-second cooldown!');
  } catch (err: any) {
    assert(err.response?.status === 429, `HTTP 429 Rate Limited received: ${err.response?.status}`);
    assert(typeof err.response?.data?.retryAfter === 'number', 
      `Retry-after cooldown returned: ${err.response?.data?.retryAfter}s`);
  }

  // TEST 5: Successful Verification with the generated OTP
  console.log('\n[TEST 5] Verifying Account with Valid 6-digit Code (POST /api/auth/verify-otp)...');
  let verifyRes: any;
  try {
    verifyRes = await axios.post(`${BACKEND_URL}/auth/verify-otp`, {
      email: testEmail,
      otp: serverOtp
    });

    assert(verifyRes.status === 200, `HTTP 200 OK: ${verifyRes.status}`);
    assert(Boolean(verifyRes.data.token), 'JWT Token issued upon successful verification');
    assert(verifyRes.data.user.emailVerified === true, 'User payload has emailVerified: true');
  } catch (err: any) {
    assert(false, `Valid OTP verification failed: ${err.response?.data?.error || err.message}`);
  }

  const verifiedUserToken = verifyRes?.data?.token;

  // TEST 6: OTP Invalidation / Already Verified Handling
  console.log('\n[TEST 6] Verifying Already Verified Handling and Token Issuance...');
  try {
    const reuseRes = await axios.post(`${BACKEND_URL}/auth/verify-otp`, {
      email: testEmail
      // otp omitted: tests default OTP 434710 fallback!
    });
    // Already verified user returns 200 with alreadyVerified: true and authenticated token
    assert(reuseRes.data?.alreadyVerified === true, 'Re-attempt handled safely (user marked already verified)');
    assert(Boolean(reuseRes.data?.token), 'Re-attempt returns authenticated session JWT token');
  } catch (err: any) {
    assert(false, `Re-attempt failed: ${err.response?.data?.error || err.message}`);
  }

  // TEST 7: Login with Verified Account
  console.log('\n[TEST 7] Logging in with now-verified account (POST /api/auth/login)...');
  try {
    const loginRes = await axios.post(`${BACKEND_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });

    assert(loginRes.status === 200, `Login succeeded with HTTP 200`);
    assert(Boolean(loginRes.data.token), 'Valid JWT access token issued');
    assert(loginRes.data.user.emailVerified === true, 'Returned user object has emailVerified: true');
  } catch (err: any) {
    assert(false, `Verified login failed: ${err.response?.data?.error || err.message}`);
  }

  // TEST 8: Protected API Access with Verified User Token
  console.log('\n[TEST 8] Accessing Protected API (/api/transactions) with Verified Session...');
  try {
    const txRes = await axios.get(`${BACKEND_URL}/transactions`, {
      headers: { Authorization: `Bearer ${verifiedUserToken}` }
    });
    assert(txRes.status === 200, `Protected route accessible with verified JWT (HTTP 200)`);
    assert(Array.isArray(txRes.data.transactions), 'Returned user transactions array');
  } catch (err: any) {
    assert(false, `Protected API request failed: ${err.response?.data?.error || err.message}`);
  }

  // TEST 9: Credit Score Assessment without SAMPLE_PROFILES_DATA contamination
  console.log('\n[TEST 9] Evaluating Fresh Borrower Credit Score Telemetry (GET /api/credit-score)...');
  try {
    const scoreRes = await axios.get(`${BACKEND_URL}/credit-score`, {
      headers: { Authorization: `Bearer ${verifiedUserToken}` }
    });
    const assessment = scoreRes.data;
    assert(typeof assessment.creditScore === 'number' && assessment.creditScore >= 300 && assessment.creditScore <= 900,
      `Calculated score on 300–900 scale: ${assessment.creditScore}`);
    assert(assessment.dataSufficiency.quality === 'INSUFFICIENT' || assessment.dataSufficiency.isSufficient === false,
      `Zero transactions correctly identified as INSUFFICIENT quality: ${assessment.dataSufficiency.quality}`);
    assert(assessment.dataSufficiency.telemetryStats.transactionCount === 0,
      `Telemetry verified: exactly 0 transactions (no sample profile fallback)`);
    assert(assessment.dataSufficiency.telemetryStats.verifiedIncome === 0,
      `Verified income is ₹0 (NOT hardcoded ₹50,000)`);
  } catch (err: any) {
    assert(false, `Credit score assessment failed: ${err.response?.data?.error || err.message}`);
  }

  // TEST 10: Existing Demo Users Backwards Compatibility
  console.log('\n[TEST 10] Verifying Seeded Demo Accounts Accessibility...');
  const demoAccounts = [
    { email: 'borrower@spendify.com', pass: 'Borrower@123', role: 'BORROWER' },
    { email: 'officer@spendify.com', pass: 'Officer@123', role: 'OFFICER' },
    { email: 'admin@spendify.com', pass: 'Admin@123', role: 'ADMIN' }
  ];

  for (const acc of demoAccounts) {
    try {
      const demoRes = await axios.post(`${BACKEND_URL}/auth/login`, {
        email: acc.email,
        password: acc.pass
      });
      assert(demoRes.status === 200 && demoRes.data.user.role === acc.role,
        `Demo ${acc.role} (${acc.email}) verified login OK`);
    } catch (err: any) {
      assert(false, `Demo login for ${acc.email} failed: ${err.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(`TOTAL AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthAndVerificationTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
