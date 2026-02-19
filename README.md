# Nusantarasoft Docker Infrastructure

Complete enterprise infrastructure with 11 integrated stacks and 65+ services.

---

## 🏗️ Architecture Overview

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        LP["Landing Page<br/>Next.js :3000"]
        ADMIN["Admin CMS<br/>Next.js :3003"]
        MOBILE["Mobile Apps"]
    end
    
    subgraph "Gateway Layer"
        TRAEFIK["Traefik<br/>:80/:443<br/>SSL/Routing"]
        KONG["Kong API Gateway<br/>:8000<br/>Auth/Rate Limit"]
    end
    
    subgraph "Application Layer"
        MW["Middleware API<br/>NestJS + GraphQL :4001"]
        FUNCTIONS["Edge Functions<br/>Deno Runtime"]
    end
    
    subgraph "Supabase Backend"
        AUTH["GoTrue Auth<br/>JWT/OAuth"]
        REST["PostgREST<br/>Auto REST API"]
        REALTIME["Realtime<br/>WebSocket"]
        STORAGE["Storage API<br/>S3 Proxy"]
        STUDIO["Supabase Studio<br/>Admin UI"]
        ANALYTICS["Logflare<br/>Analytics"]
    end
    
    subgraph "Data Layer"
        PG[("PostgreSQL 15<br/>81 Extensions<br/>pgVector")]
        MINIO[("MinIO S3<br/>Object Storage")]
    end
    
    subgraph "AI/ML Services"
        GEMINI["Google Gemini<br/>Content Gen"]
        LABELSTUDIO["Label Studio<br/>Data Annotation"]
    end
    
    subgraph "Infrastructure"
        PIHOLE["Pi-hole DNS"]
        BIND9["BIND9"]
        MAIL["Mailserver"]
        PORTAINER["Portainer"]
        SOCKETIO["Socket.IO"]
    end
    
    LP --> TRAEFIK
    ADMIN --> TRAEFIK
    MOBILE --> TRAEFIK
    
    TRAEFIK --> KONG
    TRAEFIK --> MW
    
    KONG --> AUTH
    KONG --> REST
    KONG --> REALTIME
    KONG --> STORAGE
    KONG --> FUNCTIONS
    KONG --> STUDIO
    
    MW --> KONG
    MW --> PG
    MW --> MINIO
    MW --> GEMINI
    MW --> LABELSTUDIO
    
    AUTH --> PG
    REST --> PG
    REALTIME --> PG
    STORAGE --> MINIO
    ANALYTICS --> PG
```

---

### Data Flow Diagram

```mermaid
flowchart LR
    subgraph "User Actions"
        U1["Browse Website"]
        U2["Upload Media"]
        U3["AI Content Gen"]
        U4["Data Labeling"]
    end
    
    subgraph "Frontend Apps"
        FE1["Landing Page"]
        FE2["Admin CMS"]
    end
    
    subgraph "API Gateway"
        GW["Kong + Traefik"]
    end
    
    subgraph "Business Logic"
        API["Middleware API<br/>GraphQL"]
    end
    
    subgraph "Backend Services"
        SB1["Supabase Auth"]
        SB2["Supabase REST"]
        SB3["Storage API"]
        SB4["Edge Functions"]
    end
    
    subgraph "AI Pipeline"
        AI1["Gemini API"]
        AI2["Label Studio"]
        AI3["Embeddings"]
    end
    
    subgraph "Data Stores"
        DB[("PostgreSQL<br/>+ pgVector")]
        S3[("MinIO S3")]
    end
    
    U1 --> FE1 --> GW --> SB2 --> DB
    U2 --> FE2 --> API --> SB3 --> S3
    U3 --> FE2 --> API --> AI1 --> DB
    U4 --> API --> AI2 --> AI3 --> DB
    
    API --> DB
    S3 -.-> AI3
```

---

### CMS & AI Data Flow

```mermaid
sequenceDiagram
    participant User as Admin User
    participant CMS as Admin CMS
    participant MW as Middleware API
    participant Gemini as Google Gemini
    participant LS as Label Studio
    participant DB as PostgreSQL
    participant S3 as MinIO S3

    User->>CMS: Upload Media File
    CMS->>MW: GraphQL Mutation
    MW->>S3: Store File
    S3-->>MW: File URL
    MW->>DB: Save Metadata
    
    MW->>Gemini: Generate Embeddings
    Gemini-->>MW: Vector Embeddings
    MW->>DB: Store in pgVector
    
    MW->>Gemini: Auto-Label Content
    Gemini-->>MW: Labels/Tags
    MW->>LS: Create Annotation Task
    LS-->>MW: Task Created
    
    MW->>DB: Update Media Record
    MW-->>CMS: Success Response
    CMS-->>User: Media Uploaded
```

---

### Service Stacks Overview

| Stack | Services | Ports | Purpose |
|-------|----------|-------|---------|
| **Data & Storage** | MinIO, PostgreSQL, pgAdmin | 9000, 9001, 5432 | Object storage, RDBMS |
| **Supabase** | Kong, Auth, REST, Realtime, Storage, Studio | 8000, 4000 | Backend-as-a-Service |
| **CMS & AI** | Admin, Middleware, Label Studio | 3003, 4001, 8080 | Content management + AI |
| **Frontend** | Landing Page | 3000 | Public website |
| **Infrastructure** | Traefik, NPM, Pi-hole, BIND9, Portainer | 80, 443, 8081 | Proxy, DNS, monitoring |
| **Email** | Mailserver, Roundcube | 25, 465, 587, 993 | Email infrastructure |
| **Real-time** | Socket.IO, Realtime | 3002 | WebSocket communication |

---

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Landing Page (Next.js)  │  Admin CMS (Next.js + PrimeReact)   │
├─────────────────────────────────────────────────────────────────┤
│                       GATEWAY LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│          Traefik (Reverse Proxy)  │  Kong (API Gateway)        │
├─────────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Middleware (NestJS + GraphQL)  │  Edge Functions (Deno)       │
├─────────────────────────────────────────────────────────────────┤
│                      BACKEND LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Auth (GoTrue)  │  REST (PostgREST)  │  Storage  │  Realtime   │
├─────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL 15 (pgVector, 81 extensions)  │  MinIO S3          │
├─────────────────────────────────────────────────────────────────┤
│                       AI/ML LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Google Gemini (Embeddings, Generation)  │  Label Studio       │
└─────────────────────────────────────────────────────────────────┘
```

---

### Directory Structure

```
nusantarasoft/
├── admin/                 # Next.js Admin CMS Dashboard
│   └── src/
│       ├── app/           # App Router pages
│       ├── components/    # 496+ React components (PrimeReact)
│       ├── hooks/         # Custom React hooks
│       └── lib/           # GraphQL client, utilities
├── middleware/            # NestJS GraphQL API Server
│   └── src/
│       ├── auth/          # Authentication resolvers
│       ├── media/         # Media management module
│       ├── rag/           # RAG/AI integration
│       ├── pages/         # CMS pages module
│       └── webhooks/      # Label Studio webhooks
├── landing-page/          # Next.js Public Website
│   └── src/
│       ├── app/           # App Router pages
│       └── components/    # UI components
├── volumes/               # Docker persistent data & configs
│   ├── db/                # PostgreSQL init scripts
│   ├── functions/         # Supabase Edge Functions
│   ├── api/               # Kong configuration
│   └── bind9/             # DNS zone files
├── docker-compose.yml     # Main orchestration (30+ services)
├── docker-compose.full.yml# Full stack (65+ services)
└── .env                   # Environment variables
```

---

## 💻 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 8 cores | 16+ cores |
| **RAM** | 32 GB | 64+ GB |
| **Storage** | 100 GB SSD | 500+ GB NVMe |
| **Docker** | 24.0+ | Latest |
| **Docker Compose** | 2.20+ | Latest |
| **OS** | Windows 10/11, Ubuntu 22.04, macOS 13+ | - |

> ⚠️ **Note**: Running all 65+ services simultaneously requires significant resources. For limited hardware, start only the stacks you need.

## 🚀 Quick Start

```bash
docker compose up -d      # Start all services
docker compose down       # Stop all services
docker compose down -v    # Destroy all (including data)
```

## 🎯 Selective Startup (Recommended)

Run only the stacks you need to save resources:

### Core Services (Always Required)
```bash
# Start essential infrastructure first
docker compose up -d openldap phpldapadmin nginx-proxy-manager traefik portainer
```

### Start by Stack
```bash
# 1. Data & Analytics
docker compose up -d minio postgres pgadmin dremio superset nessie mindsdb anythingllm

# 2. Supabase (Backend)
docker compose up -d supabase-db supabase-studio kong supabase-auth supabase-rest supabase-realtime supabase-storage

# 3. Workflow & Automation
docker compose up -d n8n jenkins awx awx-redis socketio

# 4. Infrastructure & DNS
docker compose up -d openldap phpldapadmin nginxproxymanager pihole bind9

# 5. Email Server
docker compose up -d mailserver roundcube

# 6. Management & Monitoring
docker compose up -d portainer zabbix-server zabbix-web k3s

# 7. Observability
docker compose up -d prometheus grafana loki promtail

# 8. Security & Identity
docker compose up -d keycloak vault crowdsec

# 9. Collaboration
docker compose up -d mattermost nextcloud jitsi-web

# 10. DevOps
docker compose up -d gitlab registry sonarqube

# 11. Messaging & API
docker compose up -d zookeeper kafka kafka-ui rabbitmq hasura
```

### Quick Profiles
```bash
# Minimal (Core only)
docker compose up -d postgres openldap nginxproxymanager portainer traefik

# Development Stack
docker compose up -d postgres pgadmin minio n8n gitlab sonarqube

# Full Stack (All services)
docker compose up -d
```

---

## 🔗 Access Links & Credentials

> 🔐 **Configuration**: All credentials below are default values defined in `.env`. Change them there for security.

### 1. Data & Analytics
| Service | URL | User | Password |
|---------|-----|------|----------|
| Minio | http://localhost:9001 | `supa-storage` | `secret1234` |
| Dremio | http://localhost:9047 | *(setup)* / `admin` | `secret1234` |
| Superset | http://localhost:8080 | `admin` | `admin` |
| MindsDB | http://localhost:47334 | - | - |
| AnythingLLM | http://localhost:3001 | *(setup)* | - |
| PgAdmin | http://localhost:8888 | `spygunsoft@gmail.com` | `password` |

### 2. Supabase
| Service | URL | User | Password |
|---------|-----|------|----------|
| Studio | http://localhost:8000 | *(JWT auth)* | - |
| Kong API | http://localhost:8000 | *(ANON_KEY / SERVICE_ROLE_KEY)* | - |
| Analytics | http://localhost:4000 | - | - |

### 3. Workflow & Automation
| Service | URL | User | Password |
|---------|-----|------|----------|
| n8n | http://localhost:5678 | `spygunsoft@gmail.com` | `N8n@Nusantara2024!` |
| Jenkins | http://localhost:8084 | `admin` | *(from logs)* |
| AWX | http://localhost:8085 | `admin` | `Nusantarasoft123!` |

### 4. Infrastructure & DNS
| Service | URL | User | Password |
|---------|-----|------|----------|
| Pi-hole | http://localhost:8053/admin | - | `Nusantarasoft123!` |
| BIND9 Webmin | http://localhost:10000 | `root` | `Nusantarasoft123!` |
| phpLDAPadmin | http://localhost:8089 | `cn=admin,dc=nusantarasoft,dc=local` | `Nusantarasoft123!` |
| Nginx PM | http://localhost:8081 | `admin@example.com` | `changeme` |

### 5. Email Server
| Service | URL | User | Password |
|---------|-----|------|----------|
| Roundcube Webmail | http://localhost:8082 | *(email)* | - |
| Mailserver SMTP | localhost:25, 465, 587 | - | - |
| Mailserver IMAP | localhost:993 | - | - |

> **Add users**: `docker exec -it mailserver setup email add user@nusantarasoft.local`

### 6. Management & Monitoring
| Service | URL | User | Password |
|---------|-----|------|----------|
| Portainer | http://localhost:9090 | *(setup)* | - |
| Zabbix | http://localhost:8086 | `Admin` | `zabbix` |
| K3s API | https://localhost:6443 | *(kubeconfig)* | - |

### 7. Observability
| Service | URL | User | Password |
|---------|-----|------|----------|
| Grafana | http://localhost:3004 | `admin` | `Nusantarasoft123!` |
| Prometheus | http://localhost:9091 | - | - |
| Loki | http://localhost:3100 | - | - |

### 8. Security & Identity
| Service | URL | User | Password |
|---------|-----|------|----------|
| Keycloak | http://localhost:8180 | `admin` | `Nusantarasoft123!` |
| Vault | http://localhost:8200 | *(token)* | `vault-root-token-change-me` |
| CrowdSec | http://localhost:8083 | - | - |

### 9. Collaboration
| Service | URL | User | Password |
|---------|-----|------|----------|
| Mattermost | http://localhost:8065 | *(setup)* | - |
| Nextcloud | http://localhost:8090 | `admin` | `Nusantarasoft123!` |
| Jitsi | https://localhost:8443 | - | - |

### 10. DevOps
| Service | URL | User | Password |
|---------|-----|------|----------|
| GitLab | http://localhost:8929 | `root` | `Nusantarasoft123!` |
| Registry | http://localhost:5000 | - | - |
| SonarQube | http://localhost:9092 | `admin` | `admin` |

### 11. Messaging & API
| Service | URL | User | Password |
|---------|-----|------|----------|
| Kafka UI | http://localhost:8093 | - | - |
| RabbitMQ | http://localhost:15672 | `admin` | `Nusantarasoft123!` |
| Hasura | http://localhost:8094 | *(secret)* | `hasura_admin_secret_change_me` |

### 12. CMS & AI Stack
| Service | URL | Description |
|---------|-----|-------------|
| Admin CMS | http://localhost:3003 | Next.js Admin Dashboard with SpeedDial + MetaBalls |
| Middleware API | http://localhost:4001/graphql | NestJS GraphQL API with Gemini AI |
| Landing Page | http://localhost:3000 | Public website |

> **CMS Features**: PrimeReact SpeedDial for quick actions (AI Studio, Dark Mode, Settings), MetaBalls animation, Supabase Auth, MinIO file storage with pgVector semantic search

### 13. AI Data Labelling
| Service | URL | User | Password |
|---------|-----|------|----------|
| Label Studio | http://localhost:8080 | `admin@nusantarasoft.local` | `Nusantarasoft123!` |

---

## 🚀 Scripts

Helper scripts for common operations:

| Script | Description |
|--------|-------------|
| `scripts/pull-images.bat` | Pull all 65+ images in groups |
| `scripts/pull-minimal.bat` | Pull minimal infrastructure (21 images) |
| `scripts/start-minimal.bat` | Start minimal infrastructure |

### Minimal Infrastructure
```bash
.\scripts\pull-minimal.bat   # Pull images
.\scripts\start-minimal.bat  # Start services
```

**Includes**: **AI Middleware** (Gemini Auto-Label), **Supabase** (Auth, Storage, Realtime, REST), **DNS** (Pi-hole, BIND9), **Email** (Mailserver, Roundcube), **Infra** (Traefik, NPM, Portainer, Socket.IO)

---

## 🗄️ Database Credentials

All services use a **single PostgreSQL instance** with the following connection details:

### PostgreSQL Connection
| Property | Value |
|----------|-------|
| **Host** | `postgres` (Docker) / `localhost` (external) |
| **Port** | `5432` |
| **Username** | `supabase_admin` |
| **Password** | `Nusantarasoft123!` |

### Databases
| Service | Database Name |
|---------|---------------|
| **Main App/Supabase** | `nusantarasoft` |
| Supabase System | `_supabase` |
| Default PostgreSQL | `postgres` |
| NPM | `npm` |
| AWX | `awx` |
| Zabbix | `zabbix` |
| Keycloak | `keycloak` |
| Mattermost | `mattermost` |
| Nextcloud | `nextcloud` |
| SonarQube | `sonarqube` |

### Quick Connect Commands
```bash
# Connect via Docker (recommended)
docker exec -it postgres psql -U supabase_admin -d nusantarasoft

# Connect via psql (external)
psql -h localhost -p 5432 -U supabase_admin -d nusantarasoft
```

> **Note**: Supabase Studio connects to `nusantarasoft` database (set via `POSTGRES_DB` in `.env`)

### PostgreSQL Extensions (81 enabled)
| Category | Extensions |
|----------|------------|
| **AI/Vector** | `vector` |
| **Time-Series** | `timescaledb` |
| **Geospatial** | `postgis`, `postgis_raster`, `postgis_topology`, `postgis_sfcgal`, `postgis_tiger_geocoder`, `pgrouting`, `address_standardizer` |
| **Full-Text Search** | `pg_trgm`, `unaccent`, `rum`, `fuzzystrmatch`, `pgroonga`, `dict_int`, `dict_xsyn` |
| **Data Types** | `citext`, `hstore`, `ltree`, `cube`, `intarray`, `isn`, `seg`, `xml2` |
| **API & FDW** | `pg_graphql`, `pg_net`, `http`, `wrappers`, `dblink`, `postgres_fdw`, `file_fdw` |
| **Security** | `pgcrypto`, `pgjwt`, `supabase_vault`, `pgsodium`, `pgaudit`, `sslinfo` |
| **JavaScript** | `plv8`, `plcoffee`, `plls`, `plpgsql_check`, `pg_tle` |
| **Message Queue** | `pgmq` (in pgmq schema) |
| **Monitoring** | `pg_stat_monitor`, `pg_buffercache`, `hypopg`, `index_advisor`, `pgstattuple`, `pgrowlocks`, `pageinspect`, `amcheck` |
| **Utilities** | `tablefunc`, `earthdistance`, `pg_hashids`, `pgtap`, `btree_gin`, `btree_gist`, `bloom`, `pg_repack`, `pg_prewarm` |
| **Scheduling** | `pg_cron` (in postgres db only) |

> **Special Requirements:**
> - `pg_cron`: Must be installed in `postgres` database, not `nusantarasoft`
> - `pgmq`: Requires `pgmq` schema created first

### File Storage (S3 + pgVector + GitLab LFS)
A comprehensive storage solution leveraging MinIO S3 for files, PostgreSQL for metadata, and pgVector for AI-powered search. Integrated with GitLab for LFS.

**Architecture Diagram:**
```mermaid
graph TB
    subgraph Clients
        WEB[Web App]
        MOBILE[Mobile App]
        GL[GitLab LFS]
    end
    
    subgraph "Supabase Edge Functions"
        UPLOAD[upload-file]
        PROCESS[process-file]
        SEARCH[search-files]
    end
    
    subgraph "Storage Layer"
        MINIO[(MinIO S3)]
        PG[(PostgreSQL)]
        VECTOR[(pgVector)]
    end
    
    subgraph "AI Services"
        OPENAI[OpenAI / Whisper]
    end
    
    WEB & MOBILE --> UPLOAD
    GL --> MINIO
    
    UPLOAD --> MINIO
    UPLOAD --> PG
    UPLOAD --> PROCESS
    
    PROCESS --> OPENAI
    PROCESS --> VECTOR
    
    SEARCH --> VECTOR
    SEARCH --> PG
```

**Tech Stack:**
- **Storage**: MinIO (S3 Compatible)
- **Database**: PostgreSQL 16 + pgVector (Metadata & Embeddings)
- **GitLab**: Configured to use MinIO for LFS, Artifacts, and Uploads
- **AI**: OpenAI (Embeddings), Whisper (Transcription)
- **Compute**: Supabase Edge Functions (Deno)

**Buckets:**
| Bucket | Content | Access | AI Processing |
|--------|---------|--------|---------------|
| `documents` | PDF, Docs | Private | Text Extraction + Embedding |
| `images` | Photos | Public | Captioning |
| `audio/video` | Media | Private | Transcription + Embedding |
| `gitlab-lfs` | Git Objects | Private | N/A |

**Key Features:**
- **Semantic Search**: Find files by meaning ("financial report Q1") instead of just keywords.
- **GitLab Integration**: Seamlessly store large Git objects in MinIO.
- **Automated Processing**: Files are automatically processed for text/embeddings on upload.
- **Hybrid Search**: Combines vector similarity with full-text search rankings.

See: [Platform Services Guide](docs/platform-services-guide.md)

---

## 📁 Directory Structure

```
├── docker-compose.yml           # Main compose file (65+ services)
├── docker-compose.production.yml # Production overrides
├── .env                         # Local environment
├── .env.production              # Production template
├── docs/
│   ├── platform-services-guide.md  # Email & File Storage guide
│   └── management-app-plan.md      # Tech stack management plan
├── scripts/
│   ├── pull-images.bat          # Pull all Docker images
│   ├── pull-minimal.bat         # Pull minimal stack images
│   └── start-minimal.bat        # Start minimal infrastructure
└── volumes/
    ├── api/                     # Kong config
    ├── db/                      # Database init scripts
    │   ├── extensions.sql       # 81 PostgreSQL extensions
    │   ├── emails.sql           # Email schema
    │   └── pg_cron.sql          # Scheduled jobs
    ├── functions/               # Supabase Edge functions
    ├── logs/                    # Vector config
    └── pooler/                  # Supavisor config
```

---

## 🚀 Production Deployment

For deploying to Ubuntu VPS with nusantarasoft.com domain:

```bash
# Use production config
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

See [`docs/email-deployment.md`](docs/email-deployment.md) for complete guide including:
- DNS configuration (MX, SPF, DKIM, DMARC)
- SSL/TLS setup
- DKIM key generation
- Troubleshooting

---

## 🔒 Security

> ⚠️ **Change all default passwords before production!**

---

## 📝 License

MIT

