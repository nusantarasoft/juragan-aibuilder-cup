# Nusantarasoft Docker Infrastructure

Complete enterprise infrastructure with 11 integrated stacks.

## 🚀 Quick Start

```bash
docker compose up -d      # Start
docker compose down       # Stop
docker compose down -v    # Destroy
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
| Studio | http://localhost:3000 | `supabase` | *(see .env)* |
| Kong API | http://localhost:8000 | *(API key)* | - |

### 3. Workflow & Automation
| Service | URL | User | Password |
|---------|-----|------|----------|
| n8n | http://localhost:5678 | *(setup)* | - |
| Jenkins | http://localhost:8084 | `admin` | *(from logs)* |
| Ansible AWX | http://localhost:8085 | `admin` | `Nusantarasoft123!` |

### 4. Infrastructure & DNS
| Service | URL | User | Password |
|---------|-----|------|----------|
| Pi-hole | http://localhost:8053/admin | - | `Nusantarasoft123!` |
| BIND9 Webmin | http://localhost:10000 | `root` | `Nusantarasoft123!` |
| phpLDAPadmin | http://localhost:8089 | `cn=admin,dc=nusantarasoft,dc=local` | `Nusantarasoft123!` |
| Nginx PM | http://localhost:8081 | `admin@example.com` | `changeme` |

### 5. Mailcow
| Service | URL | User | Password |
|---------|-----|------|----------|
| Mailcow | http://localhost:8082 | `admin` | *(setup)* |
| SOGo | https://localhost:8444/SOGo | *(email)* | - |

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
| Harbor | http://localhost:5000 | `admin` | `Harbor12345` |
| SonarQube | http://localhost:9092 | `admin` | `admin` |

### 11. Messaging & API
| Service | URL | User | Password |
|---------|-----|------|----------|
| Kafka UI | http://localhost:8093 | - | - |
| RabbitMQ | http://localhost:15672 | `admin` | `Nusantarasoft123!` |
| Hasura | http://localhost:8094 | *(secret)* | `hasura_admin_secret_change_me` |

---

## 📁 Directory Structure

```
├── docker-compose.yml
├── .env
└── volumes/
    ├── api/, db/, functions/
    ├── logs/, n8n/, pooler/
    └── prometheus/
```

## 🔒 Security

> ⚠️ **Change all default passwords before production!**

---

## 📝 License

MIT
