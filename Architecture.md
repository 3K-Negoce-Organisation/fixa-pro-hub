flowchart TB
  %% ======================
  %% GITHUB
  %% ======================
  GitHub[(GitHub Repo)]
  GitHub --- DevBranch[dev]
  GitHub --- StagingBranch[staging]
  GitHub --- MainBranch[main]

  %% ======================
  %% DEV
  %% ======================
  subgraph DEV["ENV : DEV (Lovable)"]
    Lovable[Lovable\nCloud Editor]
    SupabaseDEV[(Supabase DEV\nPostgres + Auth + RLS + Edge Functions)]

    Lovable -->|SUPABASE_URL / ANON_KEY| SupabaseDEV
  end

  DevBranch --> Lovable

  %% ======================
  %% STAGING
  %% ======================
  subgraph STAGING["ENV : STAGING (Railway)"]
    RailwayStaging[Railway STAGING\nWeb App / API]
    SupabaseStaging[(Supabase STAGING\nPostgres + Auth + RLS + Edge Functions)]
    n8nStaging[n8n STAGING]
    PgN8nStaging[(Postgres n8n STAGING)]

    RailwayStaging -->|SUPABASE_URL / ANON_KEY| SupabaseStaging
    RailwayStaging -->|Webhooks / Jobs| n8nStaging
    n8nStaging --> PgN8nStaging
  end

  DevBranch -->|PR dev → staging| StagingBranch
  StagingBranch --> RailwayStaging

  %% ======================
  %% PRODUCTION
  %% ======================
  subgraph PROD["ENV : PRODUCTION (Railway)"]
    RailwayProd[Railway PROD\nWeb App / API]
    SupabaseProd[(Supabase PROD\nPostgres + Auth + RLS + Edge Functions)]
    n8nProd[n8n PROD]
    PgN8nProd[(Postgres n8n PROD)]

    RailwayProd -->|SUPABASE_URL / ANON_KEY| SupabaseProd
    RailwayProd -->|Webhooks / Jobs| n8nProd
    n8nProd --> PgN8nProd
  end

  StagingBranch -->|PR staging → main| MainBranch
  MainBranch --> RailwayProd
