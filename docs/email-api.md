# Email API Documentation

API reference for the Supabase email integration.

## Database Tables

### `emails`
Main email storage table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `message_id` | TEXT | Unique message ID |
| `account_id` | UUID | FK to email_accounts |
| `from_address` | TEXT | Sender email |
| `from_name` | TEXT | Sender display name |
| `to_addresses` | JSONB | Array of recipients |
| `subject` | TEXT | Email subject |
| `body_text` | TEXT | Plain text body |
| `body_html` | TEXT | HTML body |
| `folder` | TEXT | INBOX, SENT, DRAFT, etc. |
| `is_read` | BOOLEAN | Read status |
| `is_starred` | BOOLEAN | Starred status |
| `received_at` | TIMESTAMPTZ | When received |
| `labels` | TEXT[] | Custom labels |

---

## Edge Functions

### Send Email

**Endpoint:** `POST /functions/v1/send-email`

**Headers:**
```
Authorization: Bearer <user_jwt>
Content-Type: application/json
```

**Body:**
```json
{
  "from": "user@nusantarasoft.com",
  "to": ["recipient@example.com"],
  "cc": ["cc@example.com"],
  "subject": "Hello",
  "text": "Plain text body",
  "html": "<p>HTML body</p>"
}
```

**Response:**
```json
{
  "success": true,
  "emailId": "uuid",
  "message": "Email sent successfully"
}
```

---

### Receive Email (Webhook)

**Endpoint:** `POST /functions/v1/receive-email`

**Headers:**
```
x-webhook-secret: <EMAIL_WEBHOOK_SECRET>
Content-Type: application/json
```

**Body:**
```json
{
  "messageId": "<message-id>",
  "from": { "address": "sender@example.com", "name": "Sender" },
  "to": [{ "address": "user@nusantarasoft.com" }],
  "subject": "Subject",
  "text": "Body",
  "date": "2024-12-19T00:00:00Z",
  "attachments": []
}
```

---

## Frontend Examples

### Fetch Inbox (JavaScript)

```javascript
const { data: emails } = await supabase
  .from('emails')
  .select('*')
  .eq('folder', 'INBOX')
  .order('received_at', { ascending: false })
  .limit(50);
```

### Mark as Read

```javascript
await supabase
  .from('emails')
  .update({ is_read: true })
  .eq('id', emailId);
```

### Send Email

```javascript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    from: 'me@nusantarasoft.com',
    to: ['recipient@example.com'],
    subject: 'Hello',
    text: 'Message body'
  }
});
```

### Search Emails

```javascript
const { data: emails } = await supabase
  .from('emails')
  .select('*')
  .textSearch('subject', 'search query');
```

### Subscribe to New Emails (Realtime)

```javascript
supabase
  .channel('emails')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'emails' },
    (payload) => {
      console.log('New email:', payload.new);
    }
  )
  .subscribe();
```

---

## Apply Migration

```bash
# Run migration on nusantarasoft database
Get-Content "volumes/db/emails.sql" | docker exec -i postgres psql -U supabase_admin -d nusantarasoft

# Or use Supabase Studio SQL Editor (connects to nusantarasoft automatically)
```

---

## Environment Variables

Add to `.env`:

```bash
# For receive-email webhook
EMAIL_WEBHOOK_SECRET=your-secret-key

# For send-email SMTP
SMTP_HOST=mailserver
SMTP_PORT=25
```
