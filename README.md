# Nusantarasoft Docker Infrastructure

Complete enterprise infrastructure with 11 integrated stacks and 65+ services.

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

### 1. Data & Analytics
| Service | URL | User | Password |
|---------|-----|------|----------|
| Minio | http://localhost:9001 | `supa-storage` | `secret1234` |
| Dremio | http://localhost:9047 | *(setup)* | - |
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
| n8n | http://localhost:5678 | *(setup)* | - |
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
| Grafana | http://localhost:3003 | `admin` | `Nusantarasoft123!` |
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

---

## � Scripts

Helper scripts for common operations:

| Script | Description |
|--------|-------------|
| `scripts/pull-images.bat` | Pull all 65+ images in groups |
| `scripts/pull-minimal.bat` | Pull minimal infrastructure (17 images) |
| `scripts/start-minimal.bat` | Start minimal infrastructure |

### Minimal Infrastructure
```bash
.\scripts\pull-minimal.bat   # Pull images
.\scripts\start-minimal.bat  # Start services
```

**Includes**: LDAP, Reverse Proxy, DNS (BIND9), Email, Portainer, **Supabase** (postgres, studio, auth, rest, meta, kong, analytics)

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

---

## 📁 Directory Structure

```
├── docker-compose.yml           # Main compose file
├── docker-compose.production.yml # Production overrides
├── .env                         # Local environment
├── .env.production              # Production template
├── docs/
│   ├── email-api.md             # Email database API docs
│   └── email-deployment.md      # VPS deployment guide
├── scripts/
│   ├── pull-images.bat
│   ├── pull-minimal.bat
│   └── start-minimal.bat
└── volumes/
    ├── api/                     # Kong config
    ├── bind9/zones/             # DNS zone files
    ├── db/                      # Supabase init scripts
    ├── functions/               # Edge functions
    ├── logs/                    # Vector config
    ├── pooler/                  # Supavisor config
    └── roundcube/               # Roundcube config
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

