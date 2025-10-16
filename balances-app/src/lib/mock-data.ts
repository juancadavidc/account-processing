import { Transaction } from './types';
import { subWeeks, subDays, addDays, addHours, addMinutes, startOfDay, format } from 'date-fns';

// Colombian names dataset
const COLOMBIAN_NAMES = [
  'MARIA RODRIGUEZ', 'CARLOS GUTIERREZ', 'ANA MARTINEZ', 'LUIS GONZALEZ',
  'SOFIA LOPEZ', 'MIGUEL HERNANDEZ', 'LUCIA PEREZ', 'DIEGO SANCHEZ',
  'VALENTINA RAMIREZ', 'SEBASTIAN TORRES', 'ISABELLA FLORES', 'MATEO RIVERA',
  'CAMILA MORALES', 'NICOLAS VARGAS', 'SARA CASTRO', 'ALEJANDRO ORTIZ',
  'DANIELA RUBIO', 'ANDRES DELGADO', 'PAULA HERRERA', 'JUAN MEDINA',
  'CAROLINA JIMENEZ', 'FERNANDO RUIZ', 'ADRIANA MORENO', 'RICARDO MUÑOZ',
  'NATALIA ROMERO', 'OSCAR GUERRERO', 'MARIANA MENDOZA', 'GABRIEL CRUZ',
  'ALEXANDRA REYES', 'DAVID RAMOS', 'MARIA CUBAQUE', 'JOSE SILVA',
  'LAURA AGUILAR', 'EDUARDO VEGA', 'CRISTINA SERRANO', 'PABLO BLANCO',
  'ANDREA CAMPOS', 'ANTONIO GIMENEZ', 'ELENA NAVARRO', 'MANUEL PASCUAL'
];

// Colombian account patterns
const ACCOUNT_PATTERNS = [
  '**7251', '**8934', '**1456', '**3721', '**9567', '**2843', '**6159',
  '**4728', '**8352', '**1947', '**5683', '**2091', '**7834', '**3405'
];

// Colombian cities for context in SMS messages
const COLOMBIAN_CITIES = [
  'BOGOTA', 'MEDELLIN', 'CALI', 'BARRANQUILLA', 'CARTAGENA', 'BUCARAMANGA',
  'PEREIRA', 'MANIZALES', 'IBAGUE', 'SANTA MARTA', 'VILLAVICENCIO', 'PASTO'
];

/**
 * Generates a random UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generates a random amount in Colombian Pesos
 * Range: $50,000 - $2,000,000 COP
 */
function generateAmount(): number {
  const min = 50000;
  const max = 2000000;
  // Generate amounts in multiples of 1000 for realism
  const baseAmount = Math.floor(Math.random() * ((max - min) / 1000)) * 1000 + min;
  return baseAmount;
}

/**
 * Generates a random time during business hours with some evening/weekend variation
 * Business hours (8AM-6PM) get 70% weight, other hours get 30%
 */
function generateRealisticTime(date: Date): { hour: number; minute: number } {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const random = Math.random();
  
  let hour: number;
  const minute: number = Math.floor(Math.random() * 60);
  
  if (random < (isWeekend ? 0.4 : 0.7)) {
    // Business hours (8AM-6PM)
    hour = Math.floor(Math.random() * 10) + 8; // 8-17
  } else {
    // Evening/early morning hours
    const eveningHours = [6, 7, 18, 19, 20, 21, 22];
    hour = eveningHours[Math.floor(Math.random() * eveningHours.length)];
  }
  
  return { hour, minute };
}

/**
 * Generates a realistic Colombian SMS message for a transaction
 */
function generateSMSMessage(
  senderName: string, 
  amount: number, 
  accountNumber: string, 
  city: string,
  time: string
): string {
  const formattedAmount = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount);
  
  const templates = [
    `BANCOLOMBIA: Recibiste ${formattedAmount} de ${senderName} en tu cuenta ${accountNumber} el ${time}. Consulta saldos en App o *426#`,
    `BANCOLOMBIA Informa: Consignacion por ${formattedAmount} de ${senderName} aplicada a cuenta ${accountNumber} ${time} desde ${city}`,
    `Transferencia recibida: ${senderName} te envio ${formattedAmount} a cuenta ${accountNumber} ${time}. BANCOLOMBIA te informa`,
    `BANCOLOMBIA: Deposito por ${formattedAmount} realizado por ${senderName} en cuenta ${accountNumber} procesado ${time}`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generates a single mock transaction
 */
function generateTransaction(baseDate: Date, offsetHours?: number): Transaction {
  const senderName = COLOMBIAN_NAMES[Math.floor(Math.random() * COLOMBIAN_NAMES.length)];
  const accountNumber = ACCOUNT_PATTERNS[Math.floor(Math.random() * ACCOUNT_PATTERNS.length)];
  const city = COLOMBIAN_CITIES[Math.floor(Math.random() * COLOMBIAN_CITIES.length)];
  const amount = generateAmount();
  
  // Create transaction date with realistic time
  let transactionDate: Date;
  if (offsetHours !== undefined) {
    transactionDate = addHours(baseDate, offsetHours);
  } else {
    const { hour, minute } = generateRealisticTime(baseDate);
    transactionDate = addMinutes(addHours(startOfDay(baseDate), hour), minute);
  }
  
  const timeString = format(transactionDate, 'HH:mm');
  const smsMessage = generateSMSMessage(senderName, amount, accountNumber, city, timeString);
  
  // Status distribution: 95% processed, 4% duplicate, 1% failed
  const statusRandom = Math.random();
  let status: 'processed' | 'failed' | 'duplicate';
  if (statusRandom < 0.95) {
    status = 'processed';
  } else if (statusRandom < 0.99) {
    status = 'duplicate';
  } else {
    status = 'failed';
  }
  
  return {
    id: generateUUID(),
    amount,
    currency: 'COP',
    senderName,
    accountNumber,
    date: transactionDate,
    time: timeString,
    rawMessage: smsMessage,
    parsedAt: new Date(),
    webhookId: `wh_${generateUUID().substring(0, 8)}`,
    status
  };
}

/**
 * Generates varied transaction patterns over time
 * More transactions during weekdays, fewer on weekends
 * Varying daily volumes to simulate real business patterns
 */
function generateDailyTransactions(date: Date): Transaction[] {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const isMonday = date.getDay() === 1; // Mondays typically have more transactions
  const isFriday = date.getDay() === 5; // Fridays typically have more transactions
  
  let baseCount: number;
  if (isWeekend) {
    baseCount = Math.floor(Math.random() * 3) + 1; // 1-3 transactions
  } else if (isMonday || isFriday) {
    baseCount = Math.floor(Math.random() * 8) + 5; // 5-12 transactions
  } else {
    baseCount = Math.floor(Math.random() * 6) + 3; // 3-8 transactions
  }
  
  const transactions: Transaction[] = [];
  
  for (let i = 0; i < baseCount; i++) {
    transactions.push(generateTransaction(date));
  }
  
  return transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Generates mock transaction data spanning multiple weeks
 * Creates 100+ transactions with realistic patterns
 */
export function generateMockTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  const today = new Date();
  const startDate = subWeeks(today, 4); // Go back 4 weeks
  
  // Generate transactions for each day
  for (let i = 0; i <= 28; i++) { // 4 weeks = 28 days
    const currentDate = addDays(startDate, i);
    const dailyTransactions = generateDailyTransactions(currentDate);
    transactions.push(...dailyTransactions);
  }
  
  // Ensure we have at least 100 transactions as required
  while (transactions.length < 100) {
    const randomDate = addDays(startDate, Math.floor(Math.random() * 28));
    transactions.push(generateTransaction(randomDate));
  }
  
  // Sort by date for chronological order
  return transactions
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, Math.min(150, transactions.length)); // Cap at 150 for performance
}

/**
 * Generates a single new transaction for real-time simulation
 */
export function generateRealTimeTransaction(): Transaction {
  const now = new Date();
  const offsetMinutes = Math.floor(Math.random() * 30); // Within last 30 minutes
  const recentTime = addMinutes(now, -offsetMinutes);
  
  return generateTransaction(recentTime);
}

/**
 * Adds realistic variation to existing transactions for testing
 */
export function addTransactionVariation(baseTransactions: Transaction[]): Transaction[] {
  // Add some failed and duplicate transactions for testing edge cases
  const additionalTransactions: Transaction[] = [];
  
  // Add 2-3 failed transactions
  for (let i = 0; i < 3; i++) {
    const failedTransaction = generateTransaction(subDays(new Date(), Math.floor(Math.random() * 7)));
    failedTransaction.status = 'failed';
    additionalTransactions.push(failedTransaction);
  }
  
  // Add 1-2 duplicate transactions
  if (baseTransactions.length > 0) {
    const originalTransaction = baseTransactions[Math.floor(Math.random() * baseTransactions.length)];
    const duplicateTransaction = {
      ...originalTransaction,
      id: generateUUID(),
      status: 'duplicate' as const,
      parsedAt: new Date()
    };
    additionalTransactions.push(duplicateTransaction);
  }
  
  return [...baseTransactions, ...additionalTransactions]
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}