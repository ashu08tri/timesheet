# ⏱ TimeSheet Pro

A production-grade, open-source timesheet management system inspired by [Kimai](https://www.kimai.org/), built with Next.js 15, Tailwind CSS, Framer Motion, and PostgreSQL.

## ✨ Features

- **Daily timesheet entry** — Log hours per project with descriptions and billable/non-billable tracking
- **Week navigation** — Browse and edit any week's timesheet
- **Submission workflow** — Draft → Submitted → In Review → Approved / Rejected
- **Manager approvals** — Review team timesheets, expand entries, approve or reject with notes
- **Dashboard** — Weekly/monthly totals, bar charts, project pie chart, recent activity
- **Reports** — Team breakdown, monthly analytics, progress bars
- **Admin panel** — Create users, manage projects, set roles
- **3 roles** — Employee, Manager, Admin (role-based access control throughout)
- **Dark mode ready** — Full dark mode support via Tailwind
- **Responsive** — Works on mobile with slide-in sidebar
- **Animations** — Framer Motion throughout (page transitions, list reveals, modals)

## 🏗 Tech Stack

| Layer     | Technology               |
|-----------|--------------------------|
| Framework | Next.js 15 (App Router)  |
| Styling   | Tailwind CSS 3           |
| Animation | Framer Motion 11         |
| Database  | PostgreSQL                |
| ORM       | Prisma 5                  |
| Auth      | NextAuth v4 (JWT)        |
| Charts    | Recharts                 |
| Icons     | Lucide React             |
| Toasts    | React Hot Toast          |

## 🚀 Getting Started

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally or remote

### 2. Clone & Install

```bash
git clone https://github.com/yourname/timesheet-pro.git
cd timesheet-pro
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/timesheet_pro"
NEXTAUTH_SECRET="your-super-secret-key-run-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Set up the Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Seed with demo data
npm run db:seed
```

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 👤 Demo Accounts

| Role     | Email                  | Password     |
|----------|------------------------|--------------|
| Admin    | admin@timepro.com      | password123  |
| Manager  | manager@timepro.com    | password123  |
| Employee | jordan@timepro.com     | password123  |

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx         # Sidebar + auth guard
│   │   ├── dashboard/         # Dashboard with charts
│   │   ├── timesheets/        # Timesheet entry
│   │   ├── approvals/         # Manager approval view
│   │   ├── reports/           # Analytics & reports
│   │   └── admin/             # User & project management
│   └── api/
│       ├── auth/[...nextauth]/ # Auth endpoints
│       ├── timesheets/         # CRUD + submit/approve/reject
│       ├── projects/           # Project management
│       ├── users/              # User management
│       └── dashboard/          # Stats & analytics
├── components/
│   ├── layout/                 # Sidebar, Header, Providers
│   ├── ui/                     # StatusBadge, StatsCard, Modal, etc.
│   ├── timesheet/              # TimesheetEditor, EntryRow, WeekNavigator
│   └── dashboard/              # Charts (WeeklyBarChart, ProjectPieChart)
├── lib/
│   ├── auth.ts                 # NextAuth config
│   ├── prisma.ts               # Prisma singleton
│   └── utils.ts                # Helpers
└── types/
    └── index.ts                # TypeScript types
```

## 🔄 Workflow

```
Employee creates DRAFT timesheet
     ↓
Employee adds entries (project + hours + description)
     ↓
Employee clicks Submit → status: SUBMITTED
     ↓
Manager reviews → APPROVED or REJECTED
     ↓
If REJECTED → Employee edits and re-submits
```

## 🗄 Database Schema

```
User ──< Timesheet ──< TimesheetEntry >── Project
          │
          ├── status: DRAFT | SUBMITTED | IN_REVIEW | APPROVED | REJECTED
          ├── weekStart / weekEnd
          └── totalHours (auto-calculated)
```

## 🔐 Role Permissions

| Feature               | Employee | Manager | Admin |
|-----------------------|----------|---------|-------|
| View own timesheets   | ✓        | ✓       | ✓     |
| Create entries        | ✓        | ✓       | ✓     |
| Submit timesheets     | ✓        | ✓       | ✓     |
| Approve/reject        | ✗        | ✓       | ✓     |
| View team timesheets  | ✗        | ✓       | ✓     |
| View reports          | ✗        | ✓       | ✓     |
| Manage users          | ✗        | ✗       | ✓     |
| Manage projects       | ✗        | ✗       | ✓     |

## 📝 Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:generate  # Regenerate Prisma client
npm run db:push      # Sync schema to DB (no migration history)
npm run db:migrate   # Create migration (production)
npm run db:seed      # Seed demo data
```

## 🌐 Deployment

### Vercel + Supabase (recommended)

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Create a [Supabase](https://supabase.com) project and copy the `DATABASE_URL`
4. Set env vars in Vercel dashboard
5. Run `npm run db:migrate` against production DB

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run db:generate && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📄 License

MIT — use freely, contribute back!
