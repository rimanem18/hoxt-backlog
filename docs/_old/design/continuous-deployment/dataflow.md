# データフロー図

作成日: 2025年09月12日
最終更新: 2025年09月23日

## 全体デプロイフロー

```mermaid
flowchart TD
    A[Developer Push to main] --> B[GitHub Actions Trigger]
    B --> C[Terraform Plan]
    C -->|Destructive Changes| D[Log Details & Auto Continue]
    C -->|Safe Changes| E[Auto Apply Infrastructure]
    D --> E
    E --> F[Extract Terraform Outputs]
    F --> G[shared-schemas Install]
    G --> H[Database Migration<br/>drizzle-kit push]
    H --> I[shared-schemas Install]
    I --> J[Lambda Build<br/>with JWKS Auth]
    J --> K[Lambda Deploy<br/>& Version Publish]
    K --> L[Alias Management<br/>stable → new version]
    L --> M[shared-schemas Install]
    M --> N[Frontend Build<br/>with TF outputs]
    N --> O[CloudFlare Pages Deploy]
    O --> P[Deployment Complete]
    
    H -->|Migration Timeout| Q[Alert & Manual Intervention]
    L -->|Alias Error| R[Retry with IAM Check]
    O -->|Pages Error| S[Retry with Exponential Backoff]
```

## プルリクエストプレビューフロー

```mermaid
flowchart TD
    A[PR Created/Updated] --> B[GitHub Actions Trigger]
    B --> C[Terraform Plan Only]
    C --> D[Database Migration<br/>PostgreSQL shared preview schema<br/>app_projectname_preview 上書き更新]
    D --> E[Lambda Preview Function Deploy<br/>shared function, overwrite deployment]
    E --> F[CloudFlare Preview Deploy<br/>via Direct Upload API]
    F --> G[Preview Environment Ready]
    G --> H[Comment PR with Preview URL]

    I[PR Closed] --> J[No Cleanup Action]
    J --> K[Resources remain for next PR<br/>app_projectname_preview schema reused]
    J --> L[Lambda Preview Function unchanged]
    J --> M[CloudFlare manages preview lifecycle]
    M --> N[Ready for Next PR]
```

## GitHub OIDC認証フロー

```mermaid
sequenceDiagram
    participant GHA as GitHub Actions
    participant OIDC as GitHub OIDC
    participant STS as AWS STS
    participant CF as CloudFlare API
    participant DB as PostgreSQL
    
    GHA->>OIDC: Request JWT Token
    OIDC-->>GHA: JWT Token (with claims)
    GHA->>STS: AssumeRoleWithWebIdentity
    STS-->>GHA: Temporary AWS Credentials
    
    par AWS Operations
        GHA->>STS: Use temp credentials
    and CloudFlare Operations
        GHA->>CF: Use CF_API_TOKEN
    and Database Operations
        GHA->>DB: Use DATABASE_URL direct connection
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
    
    subgraph "Phase 2: Dependencies"
        C --> E[shared-schemas Install]
        E --> F[Dependencies Ready]
    end
    
    subgraph "Phase 3: Database"
        F --> G[drizzle-kit Migration<br/>Production: app_projectname<br/>Preview: app_projectname_preview]
        G --> H[Database Schema Ready]
    end
    
    subgraph "Phase 4: Backend"
        H --> I[shared-schemas Install]
        I --> J[Lambda Build with JWKS]
        J --> K[Lambda Deploy & Version]
        K --> L[Alias Management]
    end
    
    subgraph "Phase 5: Frontend"
        L --> M[shared-schemas Install]
        M --> N[Next.js Build with TF outputs]
        N --> O[CloudFlare Pages Deploy]
        O --> P[DNS Propagation Check]
    end
    
    P --> Q[Health Check All Services]
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

    E --> H[TruffleHog Secret Scan]
    H --> I[Semgrep SAST Scan]
    I --> J{Vulnerabilities Found?}
    J -->|High/Critical| K[Block Deploy]
    J -->|Low/Medium| L[Deploy with Warning]
    J -->|None| M[Continue Deploy]
```

## デプロイ通知フロー

```mermaid
flowchart TD
    A[Deploy Start] --> B[Run Deployment Pipeline]
    B --> C{Deploy Result}

    C -->|Success| D[Collect Success Metadata]
    D --> E[Format Discord Embed<br/>Green Color]
    E --> F[Send Discord Webhook]
    F --> G[Post to Notification Channel]

    C -->|Failure| H[Collect Error Details]
    H --> I[Format Discord Embed<br/>Red Color]
    I --> J[Include Job Logs Link]
    J --> F

    G --> K[Team Notified]

    subgraph "Success Metadata"
        D1[Commit SHA]
        D2[Branch Name]
        D3[Actor]
        D4[Components Deployed]
    end

    subgraph "Failure Metadata"
        H1[Failed Step]
        H2[Error Message]
        H3[Job Logs URL]
        H4[Retry Instructions]
    end
```