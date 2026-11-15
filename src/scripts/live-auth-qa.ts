// Scratch script for live end-to-end authentication QA testing against http://localhost:3000

async function runLiveQa() {
  const baseUrl = 'http://localhost:3000';
  const testEmail = `qa.student.${Date.now()}@thapar.edu`;
  const initialPassword = 'InitPassword123!';
  const updatedPassword = 'NewSecretPass456!';
  const institutionSlug = 'thapar-demo';

  console.log(`[QA TEST] Target: ${baseUrl}`);
  console.log(`[QA TEST] Test User: ${testEmail}`);

  // Step 1: Sign up
  console.log('\n--- STEP 1: Registration ---');
  const signupRes = await fetch(`${baseUrl}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'QA Student Tester',
      email: testEmail,
      password: initialPassword,
      institutionSlug,
    }),
  });
  const signupData = await signupRes.json();
  console.log(`Signup Status: ${signupRes.status}`);
  console.log(`User created with isEmailVerified: ${signupData.data?.user?.isEmailVerified}`);
  if (signupRes.status !== 201) throw new Error(`Signup failed: ${JSON.stringify(signupData)}`);

  // Step 2: Attempt login before email verification (must be blocked)
  console.log('\n--- STEP 2: Unverified Login Block Guard ---');
  const preVerifyLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword,
      institutionSlug,
    }),
  });
  const preVerifyData = await preVerifyLogin.json();
  console.log(`Pre-verify Login Status: ${preVerifyLogin.status}`);
  console.log(`Error message: ${preVerifyData.error?.message}`);
  if (preVerifyLogin.status !== 403) throw new Error('Unverified user was NOT blocked with 403!');

  // Step 3: Fetch dispatched verification code from outbox
  console.log('\n--- STEP 3: Retrieve Outbox Code ---');
  const outboxRes = await fetch(`${baseUrl}/api/v1/auth/outbox?email=${encodeURIComponent(testEmail)}`);
  const outboxData = await outboxRes.json();
  const latestEmail = outboxData.data?.latest;
  console.log(`Email Subject: ${latestEmail?.subject}`);
  const code = latestEmail?.verificationCode;
  console.log(`Retrieved Verification Code: ${code}`);
  if (!code) throw new Error('No verification code found in outbox!');

  // Step 4: Verify email
  console.log('\n--- STEP 4: Submit Verification Code ---');
  const verifyRes = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code,
      institutionSlug,
    }),
  });
  const verifyData = await verifyRes.json();
  console.log(`Verification Status: ${verifyRes.status}`);
  console.log(`isEmailVerified after verification: ${verifyData.data?.user?.isEmailVerified}`);
  if (verifyRes.status !== 200) throw new Error(`Verification failed: ${JSON.stringify(verifyData)}`);

  // Step 5: Login after verification (must succeed)
  console.log('\n--- STEP 5: Verified User Login ---');
  const postVerifyLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword,
      institutionSlug,
    }),
  });
  const postVerifyData = await postVerifyLogin.json();
  console.log(`Login Status: ${postVerifyLogin.status}`);
  console.log(`Logged in as: ${postVerifyData.data?.user?.fullName} (${postVerifyData.data?.user?.role})`);
  console.log(`Access Token present: ${Boolean(postVerifyData.data?.tokens?.accessToken)}`);
  if (postVerifyLogin.status !== 200) throw new Error('Verified login failed!');

  // Step 6: Forgot password request
  console.log('\n--- STEP 6: Request Password Reset ---');
  const forgotRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      institutionSlug,
    }),
  });
  const forgotData = await forgotRes.json();
  console.log(`Forgot Password Status: ${forgotRes.status}`);
  console.log(`Message: ${forgotData.data?.message}`);

  // Step 7: Retrieve password reset token from outbox
  console.log('\n--- STEP 7: Retrieve Reset Token from Outbox ---');
  const outboxRes2 = await fetch(`${baseUrl}/api/v1/auth/outbox?email=${encodeURIComponent(testEmail)}`);
  const outboxData2 = await outboxRes2.json();
  const resetEmail = outboxData2.data?.latest;
  const resetToken = resetEmail?.resetToken;
  console.log(`Reset Email Subject: ${resetEmail?.subject}`);
  console.log(`Retrieved Reset Token: ${resetToken?.substring(0, 16)}...`);
  if (!resetToken) throw new Error('No reset token found in outbox!');

  // Step 8: Reset password with token
  console.log('\n--- STEP 8: Execute Password Reset ---');
  const resetRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: resetToken,
      newPassword: updatedPassword,
    }),
  });
  const resetData = await resetRes.json();
  console.log(`Reset Status: ${resetRes.status}`);
  console.log(`Response: ${resetData.data?.message}`);
  if (resetRes.status !== 200) throw new Error('Password reset failed!');

  // Step 9: Attempt login with old password (must be rejected)
  console.log('\n--- STEP 9: Login with Old Password (Must Fail) ---');
  const oldLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword,
      institutionSlug,
    }),
  });
  console.log(`Old Password Login Status: ${oldLoginRes.status} (Expected 401)`);
  if (oldLoginRes.status !== 401) throw new Error('Old password was erroneously accepted!');

  // Step 10: Attempt login with new password (must succeed)
  console.log('\n--- STEP 10: Login with New Password (Must Succeed) ---');
  const newLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: updatedPassword,
      institutionSlug,
    }),
  });
  const newLoginData = await newLoginRes.json();
  console.log(`New Password Login Status: ${newLoginRes.status}`);
  console.log(`Access Token: ${Boolean(newLoginData.data?.tokens?.accessToken)}`);
  if (newLoginRes.status !== 200) throw new Error('New password login failed!');

  console.log('\n========================================');
  console.log('✅ ALL 10 REAL-WORLD QA TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

runLiveQa().catch((err) => {
  console.error('\n❌ QA TEST FAILED:', err);
  process.exit(1);
});
