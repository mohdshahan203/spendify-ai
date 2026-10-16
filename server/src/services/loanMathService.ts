import {
  LoanCalculationInput,
  LoanCalculationResult,
  RepaymentScheduleItem,
  FinancialProfile,
  LoanScenarioSuggestion,
  Alert
} from '../types';

/**
 * Standard reducing-balance EMI calculation formula:
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * Where:
 * - P = Principal loan amount
 * - r = Monthly interest rate (annualRate / 12 / 100)
 * - n = Tenure in months
 */
export function calculateReducingBalanceEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRate <= 0) {
    return Math.round((principal / tenureMonths) * 100) / 100;
  }

  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Generates full amortisation schedule and fee reconciliation.
 */
export function generateAmortisationSchedule(
  input: LoanCalculationInput,
  loanId: string = 'calc',
  startDate: Date = new Date()
): LoanCalculationResult {
  const {
    amount: principal,
    annualRate,
    tenureMonths,
    processingFeePercent = 1.5,
    flatProcessingFee = 0,
    additionalCharges = 0
  } = input;

  const validPrincipal = Math.max(0, Number(principal) || 0);
  const validRate = Math.max(0, Number(annualRate) || 0);
  const validTenure = Math.max(1, Math.round(Number(tenureMonths) || 1));

  const monthlyRate = validRate / 12 / 100;
  const emi = calculateReducingBalanceEMI(validPrincipal, validRate, validTenure);

  const schedule: RepaymentScheduleItem[] = [];
  let currentBalance = validPrincipal;
  let cumulativeInterest = 0;

  for (let month = 1; month <= validTenure; month++) {
    const openingBalance = Math.round(currentBalance * 100) / 100;
    let interestComponent = validRate > 0
      ? Math.round(openingBalance * monthlyRate * 100) / 100
      : 0;

    let principalComponent = Math.round((emi - interestComponent) * 100) / 100;

    // Last month adjustment to perfectly zero out rounding variances
    if (month === validTenure || principalComponent > openingBalance) {
      principalComponent = openingBalance;
    }

    const closingBalance = Math.max(0, Math.round((openingBalance - principalComponent) * 100) / 100);
    cumulativeInterest = Math.round((cumulativeInterest + interestComponent) * 100) / 100;

    // Due date: 1 month after previous
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + month);

    const now = new Date();
    let status: 'UPCOMING' | 'DUE_SOON' | 'PAID' | 'OVERDUE' = 'UPCOMING';
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      status = 'OVERDUE';
    } else if (diffDays <= 5) {
      status = 'DUE_SOON';
    }

    schedule.push({
      id: `${loanId}-inst-${month}`,
      loanId,
      instalmentNumber: month,
      dueDate: dueDate.toISOString(),
      emiAmount: emi,
      principalComponent,
      interestComponent,
      openingBalance,
      closingBalance,
      status
    });

    currentBalance = closingBalance;
  }

  const processingFee = Math.round(
    ((validPrincipal * (processingFeePercent / 100)) + flatProcessingFee + additionalCharges) * 100
  ) / 100;

  const totalRepayment = Math.round((validPrincipal + cumulativeInterest) * 100) / 100;
  const totalPayable = Math.round((totalRepayment + processingFee) * 100) / 100;

  return {
    principal: validPrincipal,
    annualRate: validRate,
    tenureMonths: validTenure,
    monthlyRate,
    emi,
    totalInterest: cumulativeInterest,
    totalRepayment,
    processingFee,
    totalPayable,
    schedule
  };
}

/**
 * Deterministic Affordability and Recommendation Engine
 */
export function evaluateAffordabilityScenarios(
  profile: FinancialProfile,
  requestedAmount: number,
  baseRate: number = 13.5,
  requestedTenure: number = 12
): {
  profile: FinancialProfile;
  requestedEmi: number;
  projectedSurplus: number;
  overallStatus: 'COMFORTABLE' | 'MODERATE' | 'STRETCHED' | 'HIGH_RISK';
  scenarios: LoanScenarioSuggestion[];
  recommendationSummary: string;
} {
  const { monthlyIncome, essentialExpenses, existingDebtEmis } = profile;
  const monthlySurplus = Math.round((monthlyIncome - essentialExpenses - existingDebtEmis) * 100) / 100;
  const requestedEmi = calculateReducingBalanceEMI(requestedAmount, baseRate, requestedTenure);
  const projectedSurplus = Math.round((monthlySurplus - requestedEmi) * 100) / 100;
  const totalDebtCommitments = existingDebtEmis + requestedEmi;
  const dti = monthlyIncome > 0 ? Math.round((totalDebtCommitments / monthlyIncome) * 1000) / 10 : 0;

  let overallStatus: 'COMFORTABLE' | 'MODERATE' | 'STRETCHED' | 'HIGH_RISK' = 'COMFORTABLE';
  if (projectedSurplus < 0 || dti > 60) {
    overallStatus = 'HIGH_RISK';
  } else if (dti > 45 || projectedSurplus < monthlySurplus * 0.25) {
    overallStatus = 'STRETCHED';
  } else if (dti > 30) {
    overallStatus = 'MODERATE';
  }

  const scenarios: LoanScenarioSuggestion[] = [];

  // 1. Requested Plan
  const reqCalc = generateAmortisationSchedule({ amount: requestedAmount, annualRate: baseRate, tenureMonths: requestedTenure });
  scenarios.push({
    scenarioType: 'REQUESTED_PLAN',
    title: 'Requested Loan Terms',
    amount: requestedAmount,
    tenureMonths: requestedTenure,
    interestRate: baseRate,
    emi: reqCalc.emi,
    totalInterest: reqCalc.totalInterest,
    totalPayable: reqCalc.totalPayable,
    projectedSurplus,
    debtToIncomeRatio: dti,
    affordabilityStatus: overallStatus,
    rationale: `Baseline plan as requested. Consumes ${Math.round((reqCalc.emi / Math.max(1, monthlySurplus)) * 100)}% of your available monthly surplus.`,
    recommendation: projectedSurplus > 0
      ? 'Manageable within current cashflow baseline.'
      : 'Projected monthly surplus is negative. We recommend extending tenure or reducing the borrowing principal.'
  });

  // 2. Extended Tenure (Lower monthly burden)
  const longerTenure = Math.min(36, requestedTenure + 6);
  if (longerTenure > requestedTenure) {
    const extCalc = generateAmortisationSchedule({ amount: requestedAmount, annualRate: baseRate, tenureMonths: longerTenure });
    const extSurplus = Math.round((monthlySurplus - extCalc.emi) * 100) / 100;
    const extDti = monthlyIncome > 0 ? Math.round(((existingDebtEmis + extCalc.emi) / monthlyIncome) * 1000) / 10 : 0;

    scenarios.push({
      scenarioType: 'EXTENDED_TENURE',
      title: `Extended Tenure (${longerTenure} Months)`,
      amount: requestedAmount,
      tenureMonths: longerTenure,
      interestRate: baseRate,
      emi: extCalc.emi,
      totalInterest: extCalc.totalInterest,
      totalPayable: extCalc.totalPayable,
      projectedSurplus: extSurplus,
      debtToIncomeRatio: extDti,
      affordabilityStatus: extSurplus >= 0 ? (extDti <= 40 ? 'COMFORTABLE' : 'MODERATE') : 'STRETCHED',
      rationale: `Reduces monthly EMI by ₹${Math.round(reqCalc.emi - extCalc.emi).toLocaleString('en-IN')}, relieving immediate monthly liquidity pressure.`,
      recommendation: `Note: Total interest increases by ₹${Math.round(extCalc.totalInterest - reqCalc.totalInterest).toLocaleString('en-IN')} due to extended duration.`
    });
  }

  // 3. Shorter Tenure (Save on interest)
  const shorterTenure = Math.max(3, requestedTenure - 6);
  if (shorterTenure < requestedTenure) {
    const shortCalc = generateAmortisationSchedule({ amount: requestedAmount, annualRate: baseRate, tenureMonths: shorterTenure });
    const shortSurplus = Math.round((monthlySurplus - shortCalc.emi) * 100) / 100;
    const shortDti = monthlyIncome > 0 ? Math.round(((existingDebtEmis + shortCalc.emi) / monthlyIncome) * 1000) / 10 : 0;

    scenarios.push({
      scenarioType: 'SHORTER_TENURE',
      title: `Interest-Saver Tenure (${shorterTenure} Months)`,
      amount: requestedAmount,
      tenureMonths: shorterTenure,
      interestRate: baseRate,
      emi: shortCalc.emi,
      totalInterest: shortCalc.totalInterest,
      totalPayable: shortCalc.totalPayable,
      projectedSurplus: shortSurplus,
      debtToIncomeRatio: shortDti,
      affordabilityStatus: shortSurplus >= 0 ? (shortDti <= 35 ? 'COMFORTABLE' : 'MODERATE') : 'STRETCHED',
      rationale: `Saves ₹${Math.round(reqCalc.totalInterest - shortCalc.totalInterest).toLocaleString('en-IN')} in total interest payments.`,
      recommendation: shortSurplus >= 0
        ? 'Best financial value if your monthly budget comfortably absorbs the higher EMI.'
        : 'High monthly EMI may cause cashflow stress; choose only with high emergency reserves.'
    });
  }

  // 4. Safe Micro-Borrowing Principal (Cap at 40% of available monthly surplus)
  const safeEmiCap = Math.max(1000, monthlySurplus * 0.4);
  const safePrincipal = Math.min(requestedAmount, Math.round((safeEmiCap * requestedTenure * 0.85) / 1000) * 1000);
  if (safePrincipal < requestedAmount && safePrincipal >= 5000) {
    const safeCalc = generateAmortisationSchedule({ amount: safePrincipal, annualRate: baseRate, tenureMonths: requestedTenure });
    const safeSurplus = Math.round((monthlySurplus - safeCalc.emi) * 100) / 100;
    const safeDti = monthlyIncome > 0 ? Math.round(((existingDebtEmis + safeCalc.emi) / monthlyIncome) * 1000) / 10 : 0;

    scenarios.push({
      scenarioType: 'REDUCED_PRINCIPAL',
      title: `Conservative Micro-Loan (₹${safePrincipal.toLocaleString('en-IN')})`,
      amount: safePrincipal,
      tenureMonths: requestedTenure,
      interestRate: baseRate,
      emi: safeCalc.emi,
      totalInterest: safeCalc.totalInterest,
      totalPayable: safeCalc.totalPayable,
      projectedSurplus: safeSurplus,
      debtToIncomeRatio: safeDti,
      affordabilityStatus: 'COMFORTABLE',
      rationale: `Sizes loan directly to a safe 40% slice of your monthly surplus, preserving ₹${safeSurplus.toLocaleString('en-IN')} as liquidity buffer.`,
      recommendation: 'Recommended if you have variable income or upcoming seasonal expenses.'
    });
  }

  // Recommendation summary narrative
  let recommendationSummary = '';
  if (overallStatus === 'COMFORTABLE') {
    recommendationSummary = `Your financial health comfortably accommodates a ₹${requestedAmount.toLocaleString('en-IN')} loan. Total debt commitments will be ${dti}% of monthly income, leaving ₹${projectedSurplus.toLocaleString('en-IN')} in monthly surplus.`;
  } else if (overallStatus === 'MODERATE') {
    recommendationSummary = `The proposed loan is feasible but occupies ${Math.round((reqCalc.emi / monthlySurplus) * 100)}% of your monthly surplus. An extended tenure of ${longerTenure} months provides better buffer security.`;
  } else if (overallStatus === 'STRETCHED') {
    recommendationSummary = `Caution: Total debt-to-income will reach ${dti}%. We advise selecting an extended tenure or reducing the loan principal to ₹${safePrincipal.toLocaleString('en-IN')}.`;
  } else {
    recommendationSummary = `Warning: The proposed monthly EMI of ₹${requestedEmi.toLocaleString('en-IN')} exceeds your available monthly surplus (₹${monthlySurplus.toLocaleString('en-IN')}). Consider paying off existing obligations first or applying for a restructured micro-loan.`;
  }

  return {
    profile: {
      ...profile,
      monthlySurplus,
      debtToIncomeRatio: dti
    },
    requestedEmi,
    projectedSurplus,
    overallStatus,
    scenarios,
    recommendationSummary
  };
}

/**
 * Transparent Data-Driven Warning Engine
 */
export function evaluateFinancialWarnings(
  userId: string,
  profile: FinancialProfile,
  activeLoans: any[] = [],
  kycStatus: string = 'NOT_STARTED',
  repayments: RepaymentScheduleItem[] = []
): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  // Rule 1: KYC Status
  if (kycStatus === 'NOT_STARTED' || kycStatus === 'REJECTED') {
    alerts.push({
      id: `alert-kyc-${userId}`,
      userId,
      level: 'YELLOW',
      severity: 'WARNING',
      triggerType: 'KYC_INCOMPLETE',
      title: 'KYC Documents Incomplete',
      description: 'Your identity and banking documents must be submitted and approved before loan disbursal.',
      explanation: 'Unverified KYC locks loan applications in compliance with micro-lending regulations.',
      recommendedAction: 'Navigate to the KYC portal and upload your Aadhaar, PAN, and Bank Statement.',
      resolved: false,
      createdAt: now.toISOString()
    });
  }

  // Rule 2: High Debt-to-Income Ratio
  const totalEmis = profile.existingDebtEmis;
  const dti = profile.monthlyIncome > 0 ? (totalEmis / profile.monthlyIncome) * 100 : 0;
  if (dti > 50) {
    alerts.push({
      id: `alert-dti-urgent-${userId}`,
      userId,
      level: 'RED',
      severity: 'URGENT',
      triggerType: 'HIGH_DTI',
      title: 'High Debt-to-Income Exposure',
      description: `Existing debt payments consume ${Math.round(dti)}% of your monthly income (₹${totalEmis.toLocaleString('en-IN')} / ₹${profile.monthlyIncome.toLocaleString('en-IN')}).`,
      explanation: 'A debt ratio exceeding 50% severely impacts liquidity and credit scoring resilience.',
      recommendedAction: 'Focus on debt consolidation and avoid taking on new non-essential liabilities.',
      relevantAmount: totalEmis,
      resolved: false,
      createdAt: now.toISOString()
    });
  } else if (dti > 35) {
    alerts.push({
      id: `alert-dti-warning-${userId}`,
      userId,
      level: 'YELLOW',
      severity: 'WARNING',
      triggerType: 'MODERATE_DTI',
      title: 'Elevated Monthly Debt Obligations',
      description: `Debt obligations currently stand at ${Math.round(dti)}% of monthly earnings.`,
      explanation: 'Maintaining your debt-to-income under 30% is ideal for optimal borrowing terms.',
      recommendedAction: 'Keep discretionary credit card spending under 30% utilization.',
      relevantAmount: totalEmis,
      resolved: false,
      createdAt: now.toISOString()
    });
  }

  // Rule 3: Negative Monthly Surplus
  if (profile.monthlySurplus < 0) {
    alerts.push({
      id: `alert-surplus-deficit-${userId}`,
      userId,
      level: 'RED',
      severity: 'URGENT',
      triggerType: 'DEFICIT_SURPLUS',
      title: 'Monthly Cashflow Deficit',
      description: `Your monthly living expenses and debt payments exceed your income by ₹${Math.abs(profile.monthlySurplus).toLocaleString('en-IN')}.`,
      explanation: 'Persistent monthly deficits require drawing down emergency savings.',
      recommendedAction: 'Review non-essential monthly subscriptions and adjust discretionary spend.',
      relevantAmount: Math.abs(profile.monthlySurplus),
      resolved: false,
      createdAt: now.toISOString()
    });
  }

  // Rule 4: Approaching or Overdue Repayments
  for (const item of repayments) {
    if (item.status === 'OVERDUE') {
      alerts.push({
        id: `alert-overdue-${item.id}`,
        userId,
        level: 'RED',
        severity: 'URGENT',
        triggerType: 'OVERDUE_REPAYMENT',
        title: `Overdue Instalment #${item.instalmentNumber}`,
        description: `Instalment of ₹${item.emiAmount.toLocaleString('en-IN')} was due on ${new Date(item.dueDate).toLocaleDateString('en-IN')}.`,
        explanation: 'Overdue instalments trigger late fees and negative reporting on credit scores.',
        recommendedAction: 'Make an immediate repayment in the Repayments tab to restore active standing.',
        relevantAmount: item.emiAmount,
        relevantDate: item.dueDate,
        resolved: false,
        createdAt: now.toISOString()
      });
    } else if (item.status === 'DUE_SOON') {
      alerts.push({
        id: `alert-due-soon-${item.id}`,
        userId,
        level: 'YELLOW',
        severity: 'WARNING',
        triggerType: 'REPAYMENT_DUE_SOON',
        title: `Instalment Due Soon (#${item.instalmentNumber})`,
        description: `Upcoming EMI of ₹${item.emiAmount.toLocaleString('en-IN')} is due on ${new Date(item.dueDate).toLocaleDateString('en-IN')}.`,
        explanation: 'Payment due within 5 calendar days.',
        recommendedAction: 'Verify adequate bank balance or record your instalment payment online.',
        relevantAmount: item.emiAmount,
        relevantDate: item.dueDate,
        resolved: false,
        createdAt: now.toISOString()
      });
    }
  }

  return alerts;
}

/**
 * Simulates loan prepayment impacts (extra monthly EMI or one-time lump sum).
 */
export function simulatePrepayment(input: {
  amount?: number;
  principal?: number;
  annualRate: number;
  tenureMonths: number;
  extraMonthlyPayment?: number;
  oneTimePrepayment?: number;
  lumpSumPrepayment?: number;
  prepaymentMonth?: number;
  lumpSumMonth?: number;
}) {
  const amount = input.amount ?? input.principal ?? 0;
  const annualRate = input.annualRate;
  const tenureMonths = input.tenureMonths;
  const extraMonthlyPayment = input.extraMonthlyPayment ?? 0;
  const oneTimePrepayment = input.oneTimePrepayment ?? input.lumpSumPrepayment ?? 0;
  const prepaymentMonth = input.prepaymentMonth ?? input.lumpSumMonth ?? 1;

  const validPrincipal = Math.max(0, Number(amount) || 0);
  const validRate = Math.max(0, Number(annualRate) || 0);
  const validTenure = Math.max(1, Math.round(Number(tenureMonths) || 1));
  const monthlyRate = validRate / 12 / 100;

  const originalSchedule = generateAmortisationSchedule({ amount: validPrincipal, annualRate: validRate, tenureMonths: validTenure });
  const standardEmi = originalSchedule.emi;

  let currentBalance = validPrincipal;
  let newTotalInterest = 0;
  let simulatedMonths = 0;

  const now = new Date();
  const originalPayoff = new Date(now);
  originalPayoff.setMonth(originalPayoff.getMonth() + validTenure);

  while (currentBalance > 0.01 && simulatedMonths < validTenure * 2) {
    simulatedMonths++;
    const interest = validRate > 0 ? Math.round(currentBalance * monthlyRate * 100) / 100 : 0;
    newTotalInterest = Math.round((newTotalInterest + interest) * 100) / 100;

    let payment = standardEmi + (extraMonthlyPayment || 0);
    if (oneTimePrepayment && simulatedMonths === prepaymentMonth) {
      payment += oneTimePrepayment;
    }

    const principalPaid = Math.min(currentBalance, Math.max(0, payment - interest));
    currentBalance = Math.round((currentBalance - principalPaid) * 100) / 100;

    if (currentBalance <= 0) break;
  }

  const interestSaved = Math.max(0, Math.round((originalSchedule.totalInterest - newTotalInterest) * 100) / 100);
  const tenureMonthsSaved = Math.max(0, validTenure - simulatedMonths);
  const newPayoff = new Date(now);
  newPayoff.setMonth(newPayoff.getMonth() + simulatedMonths);

  return {
    originalEmi: standardEmi,
    originalTotalInterest: originalSchedule.totalInterest,
    originalTenureMonths: validTenure,
    newTenureMonths: simulatedMonths,
    tenureMonthsSaved,
    newTotalInterest,
    interestSaved,
    newTotalPayable: Math.round((validPrincipal + newTotalInterest) * 100) / 100,
    estimatedPayoffDate: newPayoff.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    originalPayoffDate: originalPayoff.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  };
}

/**
 * Side-by-side comparison of two loan options.
 */
export function compareLoanScenarios(
  planA: any,
  planB: any
) {
  const normA: LoanCalculationInput = {
    amount: planA.amount ?? planA.principal ?? 0,
    annualRate: Number(planA.annualRate) || 0,
    tenureMonths: Number(planA.tenureMonths) || 12
  };
  const normB: LoanCalculationInput = {
    amount: planB.amount ?? planB.principal ?? 0,
    annualRate: Number(planB.annualRate) || 0,
    tenureMonths: Number(planB.tenureMonths) || 12
  };

  const resultA = generateAmortisationSchedule(normA);
  const resultB = generateAmortisationSchedule(normB);

  const emiDiff = Math.round((resultA.emi - resultB.emi) * 100) / 100;
  const interestDiff = Math.round((resultA.totalInterest - resultB.totalInterest) * 100) / 100;
  const totalPayableDiff = Math.round((resultA.totalPayable - resultB.totalPayable) * 100) / 100;

  let summary = '';
  if (emiDiff > 0 && interestDiff < 0) {
    summary = `${planA.title || 'Plan A'} has a higher EMI by ₹${Math.abs(emiDiff)}/mo, but saves ₹${Math.abs(interestDiff)} in total interest compared to ${planB.title || 'Plan B'}.`;
  } else if (emiDiff < 0 && interestDiff > 0) {
    summary = `${planA.title || 'Plan A'} reduces your monthly EMI by ₹${Math.abs(emiDiff)}, but adds ₹${Math.abs(interestDiff)} in cumulative interest compared to ${planB.title || 'Plan B'}.`;
  } else if (interestDiff === 0) {
    summary = `Both plans accrue the same total interest (₹${resultA.totalInterest}).`;
  } else {
    summary = `${planA.title || 'Plan A'} difference: EMI ₹${emiDiff > 0 ? '+' : ''}${emiDiff}, Total Interest ₹${interestDiff > 0 ? '+' : ''}${interestDiff}.`;
  }

  return {
    scenarioA: { ...resultA, title: planA.title || 'Scenario A' },
    scenarioB: { ...resultB, title: planB.title || 'Scenario B' },
    emiDifference: emiDiff,
    interestDifference: interestDiff,
    totalPayableDifference: totalPayableDiff,
    summary
  };
}
