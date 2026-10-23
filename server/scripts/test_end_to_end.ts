import axios from 'axios';

const BACKEND_URL = 'http://localhost:5000/api';
const ML_URL = 'http://localhost:8000';

async function runEndToEndTests() {
  console.log('================================================================');
  console.log('      SPENDIFY END-TO-END AI, CREDIT SCORING & INSIGHTS TEST   ');
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

  // 1. Health check of Python ML Service
  console.log('[TEST 1] Verifying Python ML Service on Port 8000...');
  try {
    const mlHealth = await axios.get(`${ML_URL}/health`, { timeout: 3000 });
    assert(mlHealth.data.status === 'healthy', `ML Service status: ${mlHealth.data.status}`);
    assert(mlHealth.data.models_loaded === true, `ML models loaded: ${mlHealth.data.models_loaded}`);
    assert(mlHealth.data.features_count === 23, `23 UCI features loaded: ${mlHealth.data.features_count}`);

    const mlInfo = await axios.get(`${ML_URL}/model/info`, { timeout: 3000 });
    assert(mlInfo.data.deployed_model === 'xgboost', `Deployed model is ${mlInfo.data.deployed_model}`);
    assert(mlInfo.data.metrics.models.xgboost.roc_auc > 0.75, `XGBoost ROC-AUC = ${mlInfo.data.metrics.models.xgboost.roc_auc.toFixed(4)}`);
  } catch (err: any) {
    assert(false, `ML Service connection failed: ${err.message}`);
  }

  // 2. Authentication
  console.log('\n[TEST 2] Authenticating as Borrower (borrower@spendify.com)...');
  let token = '';
  try {
    const loginRes = await axios.post(`${BACKEND_URL}/auth/login`, {
      email: 'borrower@spendify.com',
      password: 'Borrower@123'
    });
    token = loginRes.data.token;
    assert(Boolean(token), 'JWT Token issued successfully');
    assert(loginRes.data.user.role === 'BORROWER', `User role verified: ${loginRes.data.user.role}`);
  } catch (err: any) {
    assert(false, `Borrower login failed: ${err.message}`);
    return;
  }

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 3. Credit Scoring API
  console.log('\n[TEST 3] Fetching Genuine Credit Score Assessment (GET /api/credit-score)...');
  let initialScore = 0;
  try {
    const creditRes = await axios.get(`${BACKEND_URL}/credit-score`, authHeaders);
    const data = creditRes.data;
    initialScore = data.creditScore;

    assert(typeof data.creditScore === 'number' && data.creditScore >= 300 && data.creditScore <= 900,
      `Calculated credit score in valid range 300–900: ${data.creditScore}`);
    assert(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(data.riskCategory),
      `Risk category classification: ${data.riskCategory}`);
    assert(typeof data.defaultProbability === 'number' && data.defaultProbability >= 0 && data.defaultProbability <= 1,
      `Estimated default probability: ${(data.defaultProbability * 100).toFixed(2)}%`);
    assert(Boolean(data.dataSufficiency), `Data sufficiency status: ${data.dataSufficiency.quality}`);
    assert(Array.isArray(data.positiveFactors) && data.positiveFactors.length > 0,
      `Positive SHAP factors identified: ${data.positiveFactors.map((f: any) => f.name).join(', ')}`);
    assert(Boolean(data.shapExplanation), 'Real SHAP feature attribution dictionary present');
  } catch (err: any) {
    assert(false, `Credit score fetch failed: ${err.response?.data?.error || err.message}`);
  }

  // 4. Credit Scoring Recalculation Pipeline
  console.log('\n[TEST 4] Testing Credit Score Recalculation (POST /api/credit-score/recalculate)...');
  try {
    const recalcRes = await axios.post(`${BACKEND_URL}/credit-score/recalculate`, {}, authHeaders);
    const assessment = recalcRes.data.assessment;
    assert(Boolean(assessment), 'Recalculation returned fresh assessment');
    assert(assessment.creditScore >= 300 && assessment.creditScore <= 900,
      `Recalculated score: ${assessment.creditScore}/900`);
    console.log(`    Calculation timestamp: ${assessment.calculatedAt}`);
    console.log(`    Score delta since baseline: ${assessment.scoreDelta !== null ? assessment.scoreDelta : 'Initial calculation'}`);
  } catch (err: any) {
    assert(false, `Recalculate failed: ${err.response?.data?.error || err.message}`);
  }

  // 5. Data-Driven Recommendation Engine
  console.log('\n[TEST 5] Testing Data-Driven Recommendations (GET /api/loans/recommendations)...');
  try {
    const recRes = await axios.get(`${BACKEND_URL}/loans/recommendations`, authHeaders);
    const recs = recRes.data.recommendations;
    assert(Array.isArray(recs) && recs.length > 0, `Generated ${recs.length} data-driven recommendations`);

    for (let i = 0; i < Math.min(3, recs.length); i++) {
      const r = recs[i];
      assert(Boolean(r.condition), `Rec #${i+1} condition: "${r.condition}"`);
      assert(Boolean(r.supportingData), `Rec #${i+1} has concrete supporting data: ${JSON.stringify(r.supportingData)}`);
      assert(Boolean(r.suggestedAction), `Rec #${i+1} suggested action: "${r.suggestedAction}"`);
      assert(Boolean(r.reason), `Rec #${i+1} reason: "${r.reason}"`);
    }
  } catch (err: any) {
    assert(false, `Recommendations fetch failed: ${err.response?.data?.error || err.message}`);
  }

  // 6. Live Financial Insights Dashboard
  console.log('\n[TEST 6] Testing Live Financial Insights (GET /api/financial-insights)...');
  try {
    const insightsRes = await axios.get(`${BACKEND_URL}/financial-insights`, authHeaders);
    const m = insightsRes.data.metrics;
    assert(Boolean(m), 'Financial metrics object returned');
    assert(typeof m.monthlyIncome === 'number', `Verified Monthly Income: ₹${m.monthlyIncome.toLocaleString('en-IN')}`);
    assert(typeof m.monthlyExpenses === 'number', `Monthly Living Expenses: ₹${m.monthlyExpenses.toLocaleString('en-IN')}`);
    assert(typeof m.disposableIncome === 'number', `Disposable Surplus: ₹${m.disposableIncome.toLocaleString('en-IN')}`);
    assert(typeof m.debtToIncomeRatio === 'number', `Debt-to-Income (DTI): ${m.debtToIncomeRatio}%`);
  } catch (err: any) {
    assert(false, `Financial insights failed: ${err.response?.data?.error || err.message}`);
  }

  // 7. Reducing-Balance EMI Loan Calculator
  console.log('\n[TEST 7] Testing Reducing-Balance EMI Loan Calculator (POST /api/loans/calculate)...');
  try {
    const calcRes = await axios.post(`${BACKEND_URL}/loans/calculate`, {
      amount: 100000,
      annualRate: 12.0,
      tenureMonths: 12
    });
    // Standard reducing balance formula: 100,000 @ 12% for 12 months = EMI ~8,884.88
    const expectedEmi = 8884.88;
    assert(Math.abs(calcRes.data.emi - expectedEmi) < 2.0,
      `Standard reducing-balance EMI correctly evaluated: ₹${calcRes.data.emi} (Expected: ~₹${expectedEmi})`);
    assert(calcRes.data.schedule.length === 12, 'Amortisation schedule contains exactly 12 monthly instalments');
    assert(calcRes.data.totalRepayment > 100000, `Total repayment ₹${calcRes.data.totalRepayment} includes ₹${calcRes.data.totalInterest} interest`);
  } catch (err: any) {
    assert(false, `Loan calculator failed: ${err.response?.data?.error || err.message}`);
  }

  // 8. Affordability Suggestions & Trade-offs
  console.log('\n[TEST 8] Testing Affordability Suggestions (POST /api/loans/affordability-suggestions)...');
  try {
    const affordRes = await axios.post(`${BACKEND_URL}/loans/affordability-suggestions`, {
      requestedAmount: 50000,
      requestedTenure: 12,
      baseRate: 13.5
    }, authHeaders);
    assert(Boolean(affordRes.data.overallStatus), `Affordability status: ${affordRes.data.overallStatus}`);
    assert(Array.isArray(affordRes.data.scenarios) && affordRes.data.scenarios.length >= 2,
      `Generated ${affordRes.data.scenarios.length} restructured comparison scenarios`);
  } catch (err: any) {
    assert(false, `Affordability suggestions failed: ${err.response?.data?.error || err.message}`);
  }

  // 9. Synthetic Stress Scenarios
  console.log('\n[TEST 9] Evaluating Synthetic Scenario E: Loan Exceeding Affordability Limit...');
  try {
    // Request ₹1,000,000 for 6 months (EMI > ₹170,000/mo vs ₹50,000 income)
    const recExcess = await axios.get(`${BACKEND_URL}/loans/recommendations?amount=1000000&tenure=6`, authHeaders);
    const deficitRec = recExcess.data.recommendations.find((r: any) => r.category === 'AFFORDABILITY' && r.priority === 'HIGH');
    assert(Boolean(deficitRec), 'High priority affordability warning triggered for excessive borrowing');
    if (deficitRec) {
      console.log(`    Detected Condition: "${deficitRec.condition}"`);
      console.log(`    Action: "${deficitRec.suggestedAction}"`);
      assert(Boolean(deficitRec.tradeOff), `Trade-off clearly explained: "${deficitRec.tradeOff}"`);
    }
  } catch (err: any) {
    assert(false, `Scenario E evaluation failed: ${err.message}`);
  }

  // 10. Gemini Financial Advisor Integration
  console.log('\n[TEST 10] Testing Gemini AI Integration (GET /api/advisor/status)...');
  try {
    const advisorStatus = await axios.get(`${BACKEND_URL}/advisor/status`, authHeaders);
    assert(Boolean(advisorStatus.data.provider), `Provider: ${advisorStatus.data.provider}`);
    assert(Boolean(advisorStatus.data.model), `Model: ${advisorStatus.data.model}`);
    console.log(`    Configured in env: ${advisorStatus.data.configured}`);
    console.log(`    Key present: ${advisorStatus.data.keyPresent}`);
  } catch (err: any) {
    assert(false, `Advisor status failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndTests();
