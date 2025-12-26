# Nusantarasoft CMS Admin Panel

A modern CMS with interactive page builder, built on Next.js 16 with ProLayout (Ant Design Pro Components).

## Architecture

| Component | URL | Port | Description |
|-----------|-----|------|-------------|
| **Admin** | nusantarasoft.local/admin | 3001 | CMS Dashboard & Page Builder |
| **Landing** | nusantarasoft.local | 3000 | End-user frontend |

## Features

### 🎨 Page Builder
- Drag-and-drop interface
- Template blocks (Navigation, Banner, Menu, Content, Footer)
- Content blocks (Features, Testimonials, Pricing, etc.)
- Widgets (Floating Dock, Mini Games, Chat, etc.)
- Real-time preview
- Responsive design support

### 🔐 Authentication
- Email + Password login
- 2FA (TOTP)
- Role-based access control
- Super Admin: admin@nusantarasoft.local

### 📊 Tech Stack
- Next.js 16
- React 19
- Ant Design Pro Components (ProLayout)
- Supabase (Database + Auth)
- Tailwind CSS 4
- TypeScript 5

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server (port 3001)
pnpm dev

# Build for production
pnpm build
```

## Local Domain Setup

Add to your hosts file:
```
127.0.0.1 nusantarasoft.local
```
