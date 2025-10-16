import { ParsedMessage } from './types';

export const BANCOLOMBIA_PATTERN = /Bancolombia:\s*Recibiste una transferencia por \$([0-9,]+) de ([A-Z\s]+) en tu cuenta \*\*(\d{4}), el (\d{2}\/\d{2}\/\d{4}) a las (\d{2}:\d{2})/;

export function parseBancolombiaSMS(message: string): ParsedMessage {
  const match = message.match(BANCOLOMBIA_PATTERN);
  
  if (!match) {
    return {
      amount: 0,
      senderName: '',
      account: '',
      date: new Date(),
      time: '',
      success: false,
      errorReason: 'SMS message does not match Bancolombia transfer pattern'
    };
  }

  try {
    const [, amountStr, senderName, account, dateStr, timeStr] = match;
    
    // Parse amount - remove commas and convert to number
    const amount = parseInt(amountStr.replace(/,/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      return {
        amount: 0,
        senderName: '',
        account: '',
        date: new Date(),
        time: '',
        success: false,
        errorReason: 'Invalid amount format in SMS'
      };
    }

    // Clean sender name - trim whitespace
    const cleanedSenderName = senderName.trim();
    if (!cleanedSenderName) {
      return {
        amount: 0,
        senderName: '',
        account: '',
        date: new Date(),
        time: '',
        success: false,
        errorReason: 'Empty or invalid sender name'
      };
    }

    // Validate account number (should be 4 digits)
    if (!/^\d{4}$/.test(account)) {
      return {
        amount: 0,
        senderName: '',
        account: '',
        date: new Date(),
        time: '',
        success: false,
        errorReason: 'Invalid account number format'
      };
    }

    // Parse date - DD/MM/YYYY format
    const [day, month, year] = dateStr.split('/').map(n => parseInt(n, 10));
    
    // Validate date values before creating Date object
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
      return {
        amount: 0,
        senderName: '',
        account: '',
        date: new Date(),
        time: '',
        success: false,
        errorReason: 'Invalid date format in SMS'
      };
    }
    
    const parsedDate = new Date(year, month - 1, day); // Month is 0-indexed
    
    // Check if the date was auto-corrected by JavaScript (e.g., Feb 30 -> Mar 2)
    if (parsedDate.getDate() !== day || parsedDate.getMonth() !== month - 1 || parsedDate.getFullYear() !== year) {
      return {
        amount: 0,
        senderName: '',
        account: '',
        date: new Date(),
        time: '',
        success: false,
        errorReason: 'Invalid date format in SMS'
      };
    }
    
    if (isNaN(parsedDate.getTime())) {
      return {
        amount: 0,
        senderName: '',
        account: '',
        date: new Date(),
        time: '',
        success: false,
        errorReason: 'Invalid date format in SMS'
      };
    }

    // Validate time format (HH:mm)
    if (!/^\d{2}:\d{2}$/.test(timeStr)) {
      return {
        amount: 0,
        senderName: '',
        account: '',
        date: new Date(),
        time: '',
        success: false,
        errorReason: 'Invalid time format in SMS'
      };
    }

    // Validate time values
    const [hours, minutes] = timeStr.split(':').map(n => parseInt(n, 10));
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return {
        amount: 0,
        senderName: '',
        account: '',
        date: new Date(),
        time: '',
        success: false,
        errorReason: 'Invalid time values in SMS'
      };
    }

    return {
      amount,
      senderName: cleanedSenderName,
      account: `**${account}`,
      date: parsedDate,
      time: timeStr,
      success: true
    };

  } catch (error) {
    return {
      amount: 0,
      senderName: '',
      account: '',
      date: new Date(),
      time: '',
      success: false,
      errorReason: `Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export function validateWebhookPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const webhookData = payload as Record<string, unknown>;
  
  return (
    typeof webhookData.message === 'string' &&
    typeof webhookData.timestamp === 'string' &&
    typeof webhookData.phone === 'string' &&
    typeof webhookData.webhookId === 'string' &&
    webhookData.message.length > 0 &&
    webhookData.webhookId.length > 0
  );
}