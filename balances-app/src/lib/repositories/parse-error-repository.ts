import { ParseErrorDatabase } from '../database';
import { IParseErrorRepository } from './interfaces';
import { ParseError } from '../types';

export class ParseErrorRepository implements IParseErrorRepository {
  async createParseError(data: {
    rawMessage: string;
    errorReason: string;
    webhookId: string;
  }): Promise<ParseError | null> {
    try {
      return await ParseErrorDatabase.insertParseError(data);
    } catch (error) {
      console.error('Failed to create parse error:', error);
      return null;
    }
  }

  async getParseErrors(filters: {
    resolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ParseError[]> {
    try {
      return await ParseErrorDatabase.getParseErrors(filters);
    } catch (error) {
      console.error('Failed to get parse errors:', error);
      return [];
    }
  }

  async resolveParseError(id: string): Promise<ParseError | null> {
    try {
      return await ParseErrorDatabase.resolveParseError(id);
    } catch (error) {
      console.error('Failed to resolve parse error:', error);
      return null;
    }
  }
}

