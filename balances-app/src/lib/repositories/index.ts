// Repository exports
export * from './interfaces';
export * from './webhook-repository';
export * from './transaction-repository';
export * from './source-repository';
export * from './parse-error-repository';

// Service exports
export * from '../services/webhook-service';

// Repository factory for dependency injection
export class RepositoryFactory {
  private static webhookRepository: IWebhookRepository | null = null;
  private static transactionRepository: ITransactionRepository | null = null;
  private static sourceRepository: ISourceRepository | null = null;
  private static parseErrorRepository: IParseErrorRepository | null = null;

  static getWebhookRepository(): IWebhookRepository {
    if (!this.webhookRepository) {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      const transactionRepo = this.getTransactionRepository();
      const sourceRepo = this.getSourceRepository();
      const parseErrorRepo = this.getParseErrorRepository();
      
      this.webhookRepository = new WebhookRepository(
        supabaseUrl,
        supabaseServiceKey,
        transactionRepo,
        sourceRepo,
        parseErrorRepo
      );
    }
    return this.webhookRepository;
  }

  static getTransactionRepository(): ITransactionRepository {
    if (!this.transactionRepository) {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      this.transactionRepository = new TransactionRepository(supabaseUrl, supabaseServiceKey);
    }
    return this.transactionRepository;
  }

  static getSourceRepository(): ISourceRepository {
    if (!this.sourceRepository) {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      this.sourceRepository = new SourceRepository(supabaseUrl, supabaseServiceKey);
    }
    return this.sourceRepository;
  }

  static getParseErrorRepository(): IParseErrorRepository {
    if (!this.parseErrorRepository) {
      this.parseErrorRepository = new ParseErrorRepository();
    }
    return this.parseErrorRepository;
  }

  static getWebhookService(): IWebhookService {
    const webhookRepo = this.getWebhookRepository();
    const webhookSecret = process.env.WEBHOOK_SECRET!;
    
    return new WebhookService(webhookRepo, webhookSecret);
  }

  // Reset all repositories (useful for testing)
  static reset(): void {
    this.webhookRepository = null;
    this.transactionRepository = null;
    this.sourceRepository = null;
    this.parseErrorRepository = null;
  }
}

// Import types for the factory
import { 
  IWebhookRepository, 
  ITransactionRepository, 
  ISourceRepository, 
  IParseErrorRepository, 
  IWebhookService 
} from './interfaces';
import { 
  WebhookRepository, 
  TransactionRepository, 
  SourceRepository, 
  ParseErrorRepository 
} from './';
import { WebhookService } from '../services/webhook-service';

