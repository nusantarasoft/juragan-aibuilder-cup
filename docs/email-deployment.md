# Email Deployment Guide for nusantarasoft.com

This guide explains how to deploy the Nusantarasoft Docker stack with production email configuration on your Ubuntu VPS.

## Prerequisites

- Ubuntu VPS with Docker and Docker Compose installed
- Domain `nusantarasoft.com` registered
- Access to domain registrar DNS settings OR using BIND9 as authoritative DNS
- Port 25 open (verify with your VPS provider)

---

## Step 1: Prepare the VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Logout and login to apply group changes
```

---

## Step 2: Transfer Files to VPS

```bash
# From your local machine, copy the project to VPS
scp -r "nusantarasoft 3" user@YOUR_VPS_IP:~/nusantarasoft

# SSH into VPS
ssh user@YOUR_VPS_IP
cd ~/nusantarasoft
```

---

## Step 3: Configure Environment

```bash
# Copy production env
cp .env.production .env

# Edit with your VPS IP and secrets
nano .env
```

**Required changes in `.env`:**
1. Replace `YOUR_VPS_IP` with your actual VPS public IP
2. Generate new `JWT_SECRET`: `openssl rand -base64 32`
3. Generate new `POSTGRES_PASSWORD`: `openssl rand -base64 24`
4. Update `ANON_KEY` and `SERVICE_ROLE_KEY` using [Supabase JWT Generator](https://supabase.com/docs/guides/self-hosting#api-keys)

---

## Step 4: Configure DNS Zone

```bash
# Edit DNS zone file
nano volumes/bind9/zones/db.nusantarasoft.com

# Replace all instances of YOUR_VPS_IP with your actual IP
sed -i 's/YOUR_VPS_IP/YOUR_ACTUAL_IP/g' volumes/bind9/zones/db.nusantarasoft.com
```

---

## Step 5: Update Docker Compose for Production

Update `docker-compose.yml`:

```yaml
# Change mailserver domain
mailserver:
  hostname: mail
  domainname: nusantarasoft.com  # Change from nusantarasoft.local
```

---

## Step 6: Start Services

```bash
# Start minimal stack with email
docker compose up -d postgres mailserver roundcube bind9 portainer

# Wait for services to be healthy
docker compose ps
```

---

## Step 7: Generate DKIM Keys

```bash
# Generate DKIM keys for your domain
docker exec mailserver setup config dkim keysize 2048 domain nusantarasoft.com

# View the DKIM public key
docker exec mailserver cat /tmp/docker-mailserver/opendkim/keys/nusantarasoft.com/mail.txt
```

Copy the output and add it to your DNS zone file as a TXT record for `mail._domainkey`.

---

## Step 8: Create Email Accounts

```bash
# Add admin email
docker exec mailserver setup email add admin@nusantarasoft.com
# Enter password when prompted

# Add other accounts
docker exec mailserver setup email add info@nusantarasoft.com
docker exec mailserver setup email add support@nusantarasoft.com
```

---

## Step 9: Configure Domain Registrar (if not using BIND9)

If you're using your domain registrar's DNS instead of BIND9, add these records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | mail | YOUR_VPS_IP | 3600 |
| MX | @ | mail.nusantarasoft.com | 3600 |
| TXT | @ | v=spf1 mx ip4:YOUR_VPS_IP -all | 3600 |
| TXT | mail._domainkey | (DKIM key from Step 7) | 3600 |
| TXT | _dmarc | v=DMARC1; p=quarantine; rua=mailto:admin@nusantarasoft.com | 3600 |

---

## Step 10: Request PTR Record

Contact your VPS provider to set up reverse DNS (PTR record):
- **IP**: YOUR_VPS_IP
- **Hostname**: mail.nusantarasoft.com

This is critical for email deliverability.

---

## Step 11: Test Email Delivery

```bash
# Test sending to external address
docker exec mailserver swaks --to your-external@gmail.com \
  --from admin@nusantarasoft.com \
  --server localhost

# Check mail logs
docker logs mailserver --tail 50
```

---

## Step 12: SSL/TLS Certificates (Optional but Recommended)

```bash
# Install certbot
sudo apt install certbot -y

# Generate certificates
sudo certbot certonly --standalone -d mail.nusantarasoft.com

# Copy to mailserver volume
sudo cp /etc/letsencrypt/live/mail.nusantarasoft.com/fullchain.pem volumes/mailserver/ssl/
sudo cp /etc/letsencrypt/live/mail.nusantarasoft.com/privkey.pem volumes/mailserver/ssl/
```

---

## Verify Email Deliverability

Use these tools to check your configuration:
- [Mail Tester](https://www.mail-tester.com/) - Send an email and get a score
- [MXToolbox](https://mxtoolbox.com/) - Check DNS records
- [DKIM Validator](https://dkimvalidator.com/) - Verify DKIM setup

---

## Troubleshooting

### Port 25 Blocked
Many cloud providers block port 25 by default. Contact support to unblock.

### Emails Going to Spam
- Verify SPF, DKIM, DMARC are correct
- Check PTR record is set
- Use mail-tester.com to diagnose issues

### DKIM Not Working
```bash
# Regenerate DKIM
docker exec mailserver setup config dkim keysize 2048 domain nusantarasoft.com

# Restart mailserver
docker compose restart mailserver
```

---

## Quick Reference

| Service | URL |
|---------|-----|
| Webmail | https://mail.nusantarasoft.com (via Nginx Proxy Manager) |
| SMTP | mail.nusantarasoft.com:25, 465, 587 |
| IMAP | mail.nusantarasoft.com:993 |
| Supabase Studio | https://api.nusantarasoft.com |
