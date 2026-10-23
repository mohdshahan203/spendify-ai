/**
 * SpendiFy Gemini GenAI Integration & Real API Smoke Test
 * 
 * Verifies backend environment loading, safe configuration status,
 * and performs a real live API call via official @google/genai SDK.
 * 
 * Note: Never prints, logs, or exposes the actual GEMINI_API_KEY value.
 */

import '../src/config/env';
import * as fs from 'fs';
import * as path from 'path';
import { geminiService } from '../src/services/geminiService';

async function main() {
  console.log('==========================================================');
  console.log('   SPENDIFY - GEMINI API SECURE CONFIGURATION & SMOKE TEST');
  console.log('==========================================================\n');

  // 1. Inspect Environment File Locations
  const serverEnv = path.resolve(__dirname, '../.env');
  const rootEnv = path.resolve(__dirname, '../../.env');

  console.log('[1/4] Environment Inspection:');
  console.log(`  - Backend server/.env exists: ${fs.existsSync(serverEnv) ? 'YES (file:///' + serverEnv.replace(/\\/g, '/') + ')' : 'NO'}`);
  console.log(`  - Root .env exists:           ${fs.existsSync(rootEnv) ? 'YES (file:///' + rootEnv.replace(/\\/g, '/') + ')' : 'NO'}`);

  // 2. Safe Configuration Diagnostic Check (Without exposing key)
  console.log('\n[2/4] Safe Configuration Check:');
  const status = geminiService.getStatus();
  console.log(`  - SDK Provider:       ${status.sdk}`);
  console.log(`  - Configured Model:   ${status.model}`);
  console.log(`  - Key Detected:       ${status.keyPresent ? 'YES' : 'NO'}`);
  console.log(`  - Key Character Count:${status.keyLength > 0 ? status.keyLength + ' chars' : '0 (Not configured)'}`);
  console.log(`  - Key Prefix Check:   ${status.formatValid ? 'VALID (standard format)' : 'INVALID or PLACEHOLDER'}`);
  console.log(`  - Readiness Status:   ${status.configured ? 'READY FOR CALLS' : 'ACTION REQUIRED (Pending replacement key)'}`);

  // Security assertion: Ensure status object does not contain the key
  if ('apiKey' in status || 'key' in (status as any)) {
    console.error('  ❌ CRITICAL SECURITY ERROR: Status object exposed API key property!');
    process.exit(1);
  }

  // 3. Real Smoke Test / Guidance
  console.log('\n[3/4] Live Gemini Endpoint Smoke Test:');
  if (!status.configured) {
    console.log('  ⚠️ GEMINI_API_KEY is not yet configured or is a placeholder in server/.env.');
    console.log('\n==========================================================');
    console.log('   HOW TO CONFIGURE YOUR REPLACEMENT KEY:');
    console.log('==========================================================');
    console.log('1. Open your backend environment file:');
    console.log(`   ${serverEnv}`);
    console.log('2. Add or update the line:');
    console.log('   GEMINI_API_KEY=your_actual_api_key_from_google_ai_studio');
    console.log('3. Save the file (it is ignored by git and never committed).');
    console.log('4. Re-run this test:');
    console.log('   npm run test:gemini');
    console.log('==========================================================\n');
    process.exit(0);
  }

  console.log(`  Initiating real non-mock request to Gemini (${status.model}) via @google/genai...`);
  const result = await geminiService.testConnection();

  if (result.success) {
    console.log('  ✅ [SUCCESS] Real Gemini API call succeeded!');
    console.log(`  - Round-trip Latency: ${result.latencyMs} ms`);
    console.log(`  - Model Responded:    ${result.model}`);
    console.log(`  - Response Text:      "${result.reply}"`);
    console.log('\n[4/4] Verification Summary:');
    console.log('  🎉 All checks passed! Gemini API is securely configured and operational.');
    process.exit(0);
  } else {
    console.error('  ❌ [FAILURE] Real Gemini API call returned an error:');
    console.error(`  - Error Detail: ${result.error}`);
    console.error(`  - Latency:      ${result.latencyMs} ms`);
    console.log('\n[4/4] Next Steps:');
    console.log('  - Verify that your key has permissions for model: ' + status.model);
    console.log('  - Verify your Google AI Studio quota: https://aistudio.google.com/');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
