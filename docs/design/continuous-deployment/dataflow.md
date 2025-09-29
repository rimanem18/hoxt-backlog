# データフロー図

作成日: 2025年09月12日
最終更新: 2025年09月12日

## 全体デプロイフロー

```mermaid
flowchart TD
    A[Developer Push to main] --> B[GitHub Actions Trigger]
    B --> C{Terraform Plan}
    C -->|Destructive Changes| D[Manual Approval Required]
    C -->|Safe Changes| E[Auto Apply Infrastructure]
    D --> F[Admin Approval]
    F --> E
    E --> G[Supabase Migration]
    G --> H[AWS Lambda Deploy]
    H --> I[CloudFlare Pages Deploy]
    I --> J[Deployment Complete]
    
    G -->|Migration Timeout| K[Alert & Manual Intervention]
    H -->|Lambda Error| L[Rollback Triggered]
    I -->|Pages Error| M[Retry with Exponential Backoff]
```

## プルリクエストプレビューフロー

```mermaid
flowchart TD
    A[PR Created/Updated] --> B[GitHub Actions Trigger]
    B --> C[Terraform Plan Only]
    C --> D[Supabase Preview Migration<br/>TABLE_PREFIX_dev_* tables]
    D --> E[Lambda $LATEST Deploy<br/>with dev TABLE_PREFIX]
    E --> F[CloudFlare Preview Deploy]
    F --> G[Preview Environment Ready]
    
    H[PR Closed] --> I[Cleanup Preview Resources]
    I --> J[Delete CloudFlare Preview]
    I --> K[Delete Lambda Version]
    I --> L[Drop TABLE_PREFIX_dev_* tables]
```

## GitHub OIDC認証フロー

```mermaid
sequenceDiagram
    participant GHA as GitHub Actions
    participant OIDC as GitHub OIDC
    participant STS as AWS STS
    participant CF as CloudFlare API
    participant SUP as Supabase CLI
    
    GHA->>OIDC: Request JWT Token
    OIDC-->>GHA: JWT Token (with claims)
    GHA->>STS: AssumeRoleWithWebIdentity
    STS-->>GHA: Temporary AWS Credentials
    
    par AWS Operations
        GHA->>STS: Use temp credentials
    and CloudFlare Operations
        GHA->>CF: Use CF_API_TOKEN
    and Supabase Operations
        GHA->>SUP: Use SUPABASE_ACCESS_TOKEN
    end
```

## デプロイメント依存関係フロー

```mermaid
graph TD
    subgraph "Phase 1: Infrastructure"
        A[Terraform Plan] --> B[Terraform Apply]
        B --> C[AWS Resources Ready]
        B --> D[CloudFlare DNS Ready]
    end
    
    subgraph "Phase 2: Database"
        C --> E[Supabase Migration<br/>Production: TABLE_PREFIX_*<br/>Preview: TABLE_PREFIX_dev_*]
        E --> F[Database Schema Ready]
    end
    
    subgraph "Phase 3: Backend"
        F --> G[Lambda Package Build]
        G --> H[Lambda Deploy]
        H --> I[API Gateway Update]
    end
    
    subgraph "Phase 4: Frontend"
        I --> J[Next.js Build]
        J --> K[CloudFlare Pages Deploy]
        K --> L[DNS Propagation Check]
    end
    
    L --> M[Health Check All Services]
```

## エラーハンドリングフロー

```mermaid
flowchart TD
    A[Deploy Step Execution] --> B{Success?}
    B -->|Yes| C[Next Step]
    B -->|No| D{Retry Count < Max?}
    D -->|Yes| E[Exponential Backoff Wait]
    E --> F[Increment Retry Count]
    F --> A
    D -->|No| G{Critical Error?}
    G -->|Yes| H[Stop Entire Pipeline]
    G -->|No| I[Skip Step & Continue]
    
    H --> J[Send Alert Notification]
    I --> K[Log Warning]
    K --> C
```

## Terraform State管理フロー

```mermaid
sequenceDiagram
    participant GHA as GitHub Actions
    participant S3 as S3 State Backend
    participant LOCK as DynamoDB Lock
    participant KMS as AWS KMS
    
    GHA->>LOCK: Acquire State Lock
    LOCK-->>GHA: Lock Acquired
    GHA->>S3: Download terraform.tfstate
    S3->>KMS: Decrypt state file
    KMS-->>S3: Decrypted state
    S3-->>GHA: State file
    
    GHA->>GHA: Execute Terraform Operations
    
    GHA->>S3: Upload updated state
    S3->>KMS: Encrypt state file
    KMS-->>S3: Encrypted state
    GHA->>LOCK: Release State Lock
```

## 並行実行制御フロー

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Queued: New Deploy Request
    Queued --> Running: Previous Deploy Complete
    Queued --> Queued: Deploy In Progress
    Running --> Success: Deploy Successful
    Running --> Failed: Deploy Failed
    Success --> Idle
    Failed --> Idle
    
    note right of Queued
        GitHub Actions concurrency group
        prevents parallel execution
    end note
```

## 監査ログフロー

```mermaid
flowchart LR
    A[Deploy Action] --> B[GitHub Actions Log]
    A --> C[AWS CloudTrail]
    A --> D[CloudFlare Audit Log]
    A --> E[Supabase Activity Log]
    
    B --> F[Centralized Monitoring]
    C --> F
    D --> F
    E --> F
    
    F --> G[Alert on Anomaly]
    F --> H[Compliance Report]
```

## セキュリティスキャンフロー

```mermaid
flowchart TD
    A[Code Push] --> B[GitHub Secret Scanning]
    B --> C{Secrets Detected?}
    C -->|Yes| D[Block Push]
    C -->|No| E[Continue to Deploy Pipeline]
    
    D --> F[Notify Security Team]
    F --> G[Quarantine Repository]
    
    E --> H[SAST Scan]
    H --> I{Vulnerabilities Found?}
    I -->|High/Critical| J[Block Deploy]
    I -->|Low/Medium| K[Deploy with Warning]
    I -->|None| L[Continue Deploy]
```