# Diagrama UML - BMAD Bank Deposits Application

## Diagrama de Arquitectura del Sistema

```mermaid
graph TB
    subgraph "AWS Cloud"
        SES[AWS SES<br/>Simple Email Service]
        Lambda[AWS Lambda<br/>Function]
    end
    
    subgraph "Next.js Application"
        subgraph "Frontend"
            Dashboard[Dashboard]
            Charts[Charts]
            Filters[Filters]
            UI[UI Components]
        end
        
        subgraph "State"
            Store[Store Management]
        end
        
        subgraph "API"
            WebhookAPI[Webhook Endpoint]
        end
        
        subgraph "Services"
            SMSParser[SMS Parser]
            Database[Database Service]
            Realtime[Real-time Service]
        end
    end
    
    subgraph "Supabase Backend"
        Database[Database]
        RealtimeService[Real-time Service]
        AuthService[Auth Service]
    end
    
    subgraph "External Systems"
        BankSMS[Bancolombia<br/>SMS System]
    end
    
    %% SMS Flow
    BankSMS -->|SMS Message| SES
    SES -->|Trigger| Lambda
    Lambda -->|HTTP POST| WebhookAPI
    
    %% Webhook Processing
    WebhookAPI -->|Parse SMS| SMSParser
    WebhookAPI -->|Store Data| Database
    
    %% Real-time Updates
    Database -->|Real-time| RealtimeService
    RealtimeService -->|Updates| Realtime
    Realtime -->|Notifies| Store
    
    %% Frontend Data Flow
    Store -->|State| Dashboard
    Dashboard -->|Renders| Charts
    Dashboard -->|Renders| Filters
    Dashboard -->|Renders| UI
    
    %% Authentication
    WebhookAPI -->|Verify Token| AuthService
    
    %% Styling
    classDef aws fill:#ff9900,stroke:#232f3e,stroke-width:2px,color:#fff
    classDef nextjs fill:#000000,stroke:#000000,stroke-width:2px,color:#fff
    classDef supabase fill:#3ecf8e,stroke:#1a1a1a,stroke-width:2px,color:#000
    classDef external fill:#e1e1e1,stroke:#666,stroke-width:2px,color:#000
    
    class SES,Lambda aws
    class Dashboard,Charts,Filters,UI,Store,WebhookAPI,SMSParser,Database,Realtime nextjs
    class Database,RealtimeService,AuthService supabase
    class BankSMS external
```

## Diagrama de Clases Principal

```mermaid
classDiagram
    class Transaction {
        +string id
        +number amount
        +string currency
        +string senderName
        +string accountNumber
        +Date date
        +string time
        +string rawMessage
        +Date parsedAt
        +string webhookId
        +string status
    }
    
    class ParseError {
        +string id
        +string rawMessage
        +string errorReason
        +string webhookId
        +Date occurredAt
        +boolean resolved
    }
    
    class WebhookRequest {
        +string message
        +string timestamp
        +string phone
        +string webhookId
    }
    
    class WebhookResponse {
        +string status
        +string transactionId
        +string webhookId
        +string error
    }
    
    class ParsedMessage {
        +number amount
        +string senderName
        +string account
        +Date date
        +string time
        +boolean success
        +string errorReason
    }
    
    class DashboardState {
        +Transaction[] transactions
        +MetricCard[] metrics
        +DashboardFilters filters
        +boolean isLoading
        +string error
    }
    
    class MetricCard {
        +string title
        +number value
        +string currency
        +number change
        +string changeType
        +string period
    }
    
    class DashboardFilters {
        +Date startDate
        +Date endDate
        +string searchTerm
        +string accountFilter
        +string senderFilter
    }
    
    class SMSParser {
        +parseBancolombiaSMS(message: string) ParsedMessage
        +validateWebhookPayload(payload: any) boolean
    }
    
    class WebhookHandler {
        +POST(request: NextRequest) NextResponse
        +OPTIONS() NextResponse
        -validateAuth(request: NextRequest) boolean
        -handleDuplicate(webhookId: string) boolean
    }
    
    class SupabaseClient {
        +createClient() SupabaseClient
        +createServerClient() SupabaseClient
        +createClientComponentClient() SupabaseClient
    }
    
    class DatabaseService {
        +insertTransaction(data: Transaction) Promise~Transaction~
        +insertParseError(error: ParseError) Promise~ParseError~
        +getTransactions(filters: DashboardFilters) Promise~Transaction[]~
        +getMetrics(period: string) Promise~MetricCard[]~
    }
    
    class RealtimeService {
        +subscribe(table: string, callback: Function) Subscription
        +unsubscribe(subscription: Subscription) void
    }
    
    %% Relationships
    WebhookHandler --> SMSParser : uses
    WebhookHandler --> DatabaseService : uses
    WebhookHandler --> SupabaseClient : uses
    SMSParser --> ParsedMessage : creates
    WebhookHandler --> Transaction : creates
    WebhookHandler --> ParseError : creates
    DatabaseService --> Transaction : manages
    DatabaseService --> ParseError : manages
    DashboardState --> Transaction : contains
    DashboardState --> MetricCard : contains
    DashboardState --> DashboardFilters : contains
    RealtimeService --> Transaction : notifies
```

## Diagrama de Secuencia - Flujo de Webhook

```mermaid
sequenceDiagram
    participant Bank as Bancolombia SMS
    participant SES as AWS SES
    participant Lambda as AWS Lambda
    participant Webhook as Webhook API
    participant Parser as SMS Parser
    participant DB as Supabase DB
    participant RT as Real-time Service
    participant UI as Dashboard UI
    
    Bank->>SES: SMS Message
    SES->>Lambda: Email Trigger
    Lambda->>Webhook: HTTP POST /api/webhook/sms
    
    Webhook->>Webhook: Validate Auth Token
    Webhook->>Webhook: Validate Content-Type
    Webhook->>Webhook: Parse JSON Body
    
    Webhook->>DB: Check Duplicate
    alt Duplicate Found
        Webhook-->>Lambda: 200 - Duplicate Response
    else No Duplicate
        Webhook->>Parser: Parse SMS Message
        
        alt Parse Success
            Webhook->>DB: Store Transaction
            DB->>RT: Real-time Notification
            RT->>UI: Update Dashboard
            Webhook-->>Lambda: 200 - Success Response
        else Parse Failure
            Webhook->>DB: Log Error
            Webhook-->>Lambda: 400 - Parse Error Response
        end
    end
    
    Lambda-->>SES: Processing Complete
```

## Diagrama de Componentes - Frontend

```mermaid
graph TB
    subgraph "Pages"
        Page[Dashboard Page<br/>page.tsx]
    end
    
    subgraph "Layout Components"
        Layout[App Layout<br/>layout.tsx]
    end
    
    subgraph "Dashboard Components"
        MetricsCards[Metrics Cards]
        TransactionTable[Transaction Table]
        FilterSection[Filter Section]
        ChartSection[Chart Section]
    end
    
    subgraph "Chart Components"
        BalanceChart[Balance Chart]
        TransactionChart[Transaction Chart]
        SenderChart[Sender Distribution]
        TimeChart[Time Series Chart]
    end
    
    subgraph "Filter Components"
        DateFilter[Date Range Picker]
        SearchFilter[Search Filter]
        AccountFilter[Account Filter]
        StatusFilter[Status Filter]
    end
    
    subgraph "UI Components"
        Button[Button]
        Card[Card]
        Table[Table]
        Dialog[Dialog]
        Badge[Badge]
        Calendar[Calendar]
        Select[Select]
    end
    
    subgraph "State Management"
        DashboardStore[Dashboard Store<br/>Zustand]
    end
    
    subgraph "Hooks"
        CustomHooks[Custom Hooks]
    end
    
    %% Component relationships
    Layout --> Page
    Page --> MetricsCards
    Page --> TransactionTable
    Page --> FilterSection
    Page --> ChartSection
    
    ChartSection --> BalanceChart
    ChartSection --> TransactionChart
    ChartSection --> SenderChart
    ChartSection --> TimeChart
    
    FilterSection --> DateFilter
    FilterSection --> SearchFilter
    FilterSection --> AccountFilter
    FilterSection --> StatusFilter
    
    %% UI Component usage
    MetricsCards --> Card
    TransactionTable --> Table
    TransactionTable --> Badge
    DateFilter --> Calendar
    AccountFilter --> Select
    StatusFilter --> Select
    
    %% State management
    Page --> DashboardStore
    MetricsCards --> DashboardStore
    TransactionTable --> DashboardStore
    FilterSection --> DashboardStore
    ChartSection --> DashboardStore
    
    %% Hooks
    Page --> CustomHooks
    FilterSection --> CustomHooks
```

## Tecnologías y Arquitectura

### Stack Tecnológico
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **Estado**: Zustand
- **Backend**: Next.js API Routes (Edge Functions)
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Bearer Token Authentication
- **Real-time**: Supabase Real-time Subscriptions
- **Charts**: Recharts
- **Testing**: Jest, React Testing Library

### Servicios Externos
- **AWS SES**: Recepción de emails/SMS
- **AWS Lambda**: Procesamiento de triggers
- **Bancolombia**: Sistema bancario que envía SMS

### Características Clave
- **Procesamiento en Tiempo Real**: SMS → Lambda → Webhook → DB → UI
- **Autenticación Segura**: Bearer tokens para webhooks
- **Manejo de Errores**: Logging de errores de parsing
- **Prevención de Duplicados**: Validación de webhookId
- **Localización**: Formato de peso colombiano y fechas
- **Testing Comprehensivo**: 46 casos de prueba