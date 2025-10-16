import { Transaction, DashboardMetrics } from './types';

/**
 * Validates that a Transaction object matches the architecture specification
 */
export function validateTransaction(transaction: unknown): transaction is Transaction {
  if (!transaction || typeof transaction !== 'object') {
    console.error('Transaction validation failed: not an object');
    return false;
  }

  const t = transaction as Record<string, unknown>;

  const requiredFields = [
    'id', 'amount', 'currency', 'senderName', 'accountNumber', 
    'date', 'time', 'rawMessage', 'parsedAt', 'webhookId', 'status'
  ];

  for (const field of requiredFields) {
    if (!(field in t)) {
      console.error(`Transaction validation failed: missing field '${field}'`);
      return false;
    }
  }

  // Type validations
  if (typeof t.id !== 'string' || t.id.length === 0) {
    console.error('Transaction validation failed: id must be a non-empty string');
    return false;
  }

  if (typeof t.amount !== 'number' || t.amount <= 0) {
    console.error('Transaction validation failed: amount must be a positive number');
    return false;
  }

  if (t.currency !== 'COP') {
    console.error('Transaction validation failed: currency must be "COP"');
    return false;
  }

  if (typeof t.senderName !== 'string' || t.senderName.length === 0) {
    console.error('Transaction validation failed: senderName must be a non-empty string');
    return false;
  }

  if (typeof t.accountNumber !== 'string' || !t.accountNumber.startsWith('**')) {
    console.error('Transaction validation failed: accountNumber must start with "**"');
    return false;
  }

  if (!(t.date instanceof Date) || isNaN(t.date.getTime())) {
    console.error('Transaction validation failed: date must be a valid Date object');
    return false;
  }

  if (typeof t.time !== 'string' || !/^\d{2}:\d{2}$/.test(t.time)) {
    console.error('Transaction validation failed: time must be in HH:mm format');
    return false;
  }

  if (typeof t.rawMessage !== 'string' || t.rawMessage.length === 0) {
    console.error('Transaction validation failed: rawMessage must be a non-empty string');
    return false;
  }

  if (!(t.parsedAt instanceof Date) || isNaN(t.parsedAt.getTime())) {
    console.error('Transaction validation failed: parsedAt must be a valid Date object');
    return false;
  }

  if (typeof t.webhookId !== 'string' || t.webhookId.length === 0) {
    console.error('Transaction validation failed: webhookId must be a non-empty string');
    return false;
  }

  const validStatuses = ['processed', 'failed', 'duplicate'];
  if (!validStatuses.includes(t.status as string)) {
    console.error(`Transaction validation failed: status must be one of ${validStatuses.join(', ')}`);
    return false;
  }

  return true;
}

/**
 * Validates that a DashboardMetrics object matches the architecture specification
 */
export function validateDashboardMetrics(metrics: unknown): metrics is DashboardMetrics {
  if (!metrics || typeof metrics !== 'object') {
    console.error('DashboardMetrics validation failed: not an object');
    return false;
  }

  const m = metrics as Record<string, unknown>;

  const requiredFields = [
    'period', 'totalAmount', 'transactionCount', 'averageAmount',
    'periodStart', 'periodEnd', 'lastUpdated'
  ];

  for (const field of requiredFields) {
    if (!(field in m)) {
      console.error(`DashboardMetrics validation failed: missing field '${field}'`);
      return false;
    }
  }

  // Type validations
  const validPeriods = ['daily', 'weekly', 'monthly'];
  if (!validPeriods.includes(m.period as string)) {
    console.error(`DashboardMetrics validation failed: period must be one of ${validPeriods.join(', ')}`);
    return false;
  }

  if (typeof m.totalAmount !== 'number' || m.totalAmount < 0) {
    console.error('DashboardMetrics validation failed: totalAmount must be a non-negative number');
    return false;
  }

  if (typeof m.transactionCount !== 'number' || m.transactionCount < 0) {
    console.error('DashboardMetrics validation failed: transactionCount must be a non-negative number');
    return false;
  }

  if (typeof m.averageAmount !== 'number' || m.averageAmount < 0) {
    console.error('DashboardMetrics validation failed: averageAmount must be a non-negative number');
    return false;
  }

  if (!(m.periodStart instanceof Date) || isNaN(m.periodStart.getTime())) {
    console.error('DashboardMetrics validation failed: periodStart must be a valid Date object');
    return false;
  }

  if (!(m.periodEnd instanceof Date) || isNaN(m.periodEnd.getTime())) {
    console.error('DashboardMetrics validation failed: periodEnd must be a valid Date object');
    return false;
  }

  if (!(m.lastUpdated instanceof Date) || isNaN(m.lastUpdated.getTime())) {
    console.error('DashboardMetrics validation failed: lastUpdated must be a valid Date object');
    return false;
  }

  if (m.periodStart >= m.periodEnd) {
    console.error('DashboardMetrics validation failed: periodStart must be before periodEnd');
    return false;
  }

  return true;
}

/**
 * Validates an array of transactions
 */
export function validateTransactionArray(transactions: unknown[]): Transaction[] {
  if (!Array.isArray(transactions)) {
    console.error('Transaction array validation failed: not an array');
    return [];
  }

  const validTransactions = transactions.filter(transaction => {
    const isValid = validateTransaction(transaction);
    if (!isValid) {
      const t = transaction as Record<string, unknown>;
      console.warn('Skipping invalid transaction:', t?.id || 'unknown');
    }
    return isValid;
  });

  console.log(`✅ Validated ${validTransactions.length} out of ${transactions.length} transactions`);
  return validTransactions;
}

/**
 * Validates mock data against Colombian business rules
 */
export function validateColombianBusinessRules(transaction: Transaction): boolean {
  // Check amount is within typical Colombian transfer range
  if (transaction.amount < 1000 || transaction.amount > 50000000) {
    console.warn(`Transaction ${transaction.id} has unusual amount: ${transaction.amount}`);
    return false;
  }

  // Check sender name follows Colombian naming pattern
  if (!transaction.senderName.match(/^[A-Z\s]+$/)) {
    console.warn(`Transaction ${transaction.id} has invalid sender name format: ${transaction.senderName}`);
    return false;
  }

  // Check account number follows expected pattern
  if (!transaction.accountNumber.match(/^\*\*\d{4}$/)) {
    console.warn(`Transaction ${transaction.id} has invalid account number format: ${transaction.accountNumber}`);
    return false;
  }

  // Check transaction time is within reasonable hours (not 3 AM unless it's a special case)
  const hour = parseInt(transaction.time.split(':')[0]);
  if (hour < 6 || hour > 23) {
    // Allow some late-night transactions (they do happen)
    if (Math.random() > 0.1) { // 10% tolerance for late-night transactions
      console.warn(`Transaction ${transaction.id} has unusual time: ${transaction.time}`);
    }
  }

  return true;
}

/**
 * Comprehensive validation that runs all checks
 */
export function runFullValidation(transactions: Transaction[]): {
  valid: Transaction[];
  invalid: unknown[];
  businessRuleViolations: Transaction[];
} {
  const valid: Transaction[] = [];
  const invalid: unknown[] = [];
  const businessRuleViolations: Transaction[] = [];

  for (const transaction of transactions) {
    if (!validateTransaction(transaction)) {
      invalid.push(transaction);
      continue;
    }

    if (!validateColombianBusinessRules(transaction)) {
      businessRuleViolations.push(transaction);
    } else {
      valid.push(transaction);
    }
  }

  console.log(`🔍 Full validation results:
    ✅ Valid: ${valid.length}
    ❌ Invalid: ${invalid.length}
    ⚠️  Business rule violations: ${businessRuleViolations.length}`);

  return { valid, invalid, businessRuleViolations };
}