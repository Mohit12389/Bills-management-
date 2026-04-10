# 🍬 MithaiBills — Sweet Shop Bill Manager

A full-stack bill management system built for sweet shops to track raw material purchases, manage vendor payments, and get spending insights.

**Tech Stack:** Next.js 14 • TypeScript • React • shadcn/ui • Tailwind CSS • Neon (PostgreSQL) • Drizzle ORM • Clerk Auth • Uploadthing • Recharts

---

## ✨ Features

### Core Features
- **Category Management** — Organize bills by type (Dairy, Vegetables, Dry Fruits, etc.)
- **Vendor Tracking** — Track vendors under each category with contact details
- **Bill Management** — Add bills with amount, date, notes, and image attachments
- **Payment Status** — Mark bills as paid/unpaid with automatic payment date tracking
- **Image Upload** — Auto-compressed bill images (client-side WebP compression)
- **Date Range Filtering** — Filter bills by custom date ranges with quick presets
- **Subtotals** — Per-category and per-date-range totals for paid/unpaid amounts

### Advanced Features
- **Statistics Dashboard** — Pie charts, bar graphs, vendor breakdown tables
- **Bulk Actions** — Select multiple bills to mark paid/unpaid or delete
- **Overdue Alerts** — Visual warnings for bills past their due date
- **Month-over-Month Comparison** — Track spending trends
- **Global Search** — Search bills across all categories
- **Recurring Bills** — Mark bills as daily/weekly/monthly
- **Responsive Design** — Works on desktop and mobile with bottom navigation

---

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+
- npm/pnpm/yarn

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd sweetshop-bills
npm install
```

### 2. Set Up Services (all free tier)

#### Neon Database (Free)
1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy the connection string from the dashboard

#### Clerk Authentication (Free)
1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. Copy the Publishable Key and Secret Key
4. Set up a webhook:
   - Go to Webhooks in Clerk dashboard
   - Add endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret

#### Uploadthing (Free - 2GB storage)
1. Go to [uploadthing.com](https://uploadthing.com) and create an account
2. Create a new app
3. Copy the Secret Key and App ID

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Neon
DATABASE_URL=postgresql://...@ep-...neon.tech/sweetshop?sslmode=require

# Uploadthing
UPLOADTHING_SECRET=sk_live_...
UPLOADTHING_APP_ID=...
```

### 4. Push Database Schema

```bash
npm run db:push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📂 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Dashboard with overview stats
│   ├── categories/         # Category CRUD + detail view
│   │   └── [id]/           # Single category with bills & vendors
│   ├── bills/              # All bills listing + filters
│   │   └── new/            # Add new bill form
│   ├── stats/              # Statistics with charts
│   ├── settings/           # User profile (Clerk)
│   ├── sign-in/            # Auth pages
│   ├── sign-up/
│   └── api/                # API routes
│       ├── bills/upload/   # Image upload endpoint
│       ├── uploadthing/    # Uploadthing handler
│       └── webhooks/clerk/ # Clerk user sync
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/             # Sidebar, MobileNav, Header
│   └── shared/             # Reusable: StatCard, StatusBadge, etc.
├── db/
│   ├── schema.ts           # Drizzle schema (users, categories, vendors, bills)
│   └── index.ts            # DB connection
├── lib/
│   ├── actions/            # Server actions (categories, vendors, bills, stats)
│   ├── auth.ts             # Auth helpers
│   ├── utils.ts            # Utility functions
│   ├── validations.ts      # Zod schemas
│   └── uploadthing.ts      # Upload config
└── styles/
    └── globals.css         # Global CSS with Tailwind + custom properties
```

---

## 🚢 Deploy to Vercel (Free)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add all environment variables from `.env.local`
4. Deploy!

**Important:** After deploying, update your Clerk webhook URL to your Vercel domain.

---

## 💰 Cost: ₹0

| Service     | Free Tier                | Your Usage              |
|-------------|--------------------------|-------------------------|
| Vercel      | 100GB bandwidth/mo       | More than enough        |
| Neon        | 512MB storage            | ~50K bills (text only)  |
| Clerk       | 10K monthly active users | 1 user = plenty         |
| Uploadthing | 2GB storage              | ~13K-40K bill images    |

---

## 📝 License

MIT
