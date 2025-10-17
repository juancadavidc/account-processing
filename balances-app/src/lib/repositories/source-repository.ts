import { V2DatabaseService } from '../v2-database';
import { ISourceRepository } from './interfaces';
import { Source, UserSource, SourceType } from '../types';

export class SourceRepository implements ISourceRepository {
  private v2DatabaseService: V2DatabaseService;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.v2DatabaseService = new V2DatabaseService(supabaseUrl, supabaseServiceKey);
  }

  async findOrCreateSource(sourceType: SourceType, sourceValue: string): Promise<{
    data: Source | null;
    error: Error | null;
  }> {
    return await this.v2DatabaseService.findOrCreateSource(sourceType, sourceValue);
  }

  async getSourceById(sourceId: string): Promise<{
    data: Source | null;
    error: Error | null;
  }> {
    return await this.v2DatabaseService.getSourceById(sourceId);
  }

  async getSourcesForUser(userId: string): Promise<{
    data: Source[];
    error: Error | null;
  }> {
    return await this.v2DatabaseService.getSourcesForUser(userId);
  }

  async getUsersForSource(sourceId: string): Promise<{
    data: string[];
    error: Error | null;
  }> {
    return await this.v2DatabaseService.getUsersForSource(sourceId);
  }

  async addUserSource(userId: string, sourceId: string): Promise<{
    data: UserSource | null;
    error: Error | null;
  }> {
    return await this.v2DatabaseService.addUserSource(userId, sourceId);
  }

  async removeUserSource(userId: string, sourceId: string): Promise<{
    error: Error | null;
  }> {
    return await this.v2DatabaseService.removeUserSource(userId, sourceId);
  }
}

