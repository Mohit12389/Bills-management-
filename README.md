# 🍬 Bill Manager

## 📱 Android Application Code

**The Android version of this project is available here:**  
👉 [**View Android Repository**](https://github.com/Mohit12389/Bill-Management-System)


A full-stack bill management system built for sweet shops to track raw material purchases, manage vendor payments, and get spending insights.

**Tech Stack:** Next.js 14 • TypeScript • React • shadcn/ui • Tailwind CSS • Neon (PostgreSQL) • Drizzle ORM • Clerk Auth • Recharts

---
## 📱 Screenshots

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Categories
![Categories](screenshots/categories.png)

### Bills
![Bills](screenshots/bills.png)

### Stats
![Stats](screenshots/stats.png)

### Stats
![payment-modal](screenshots/payment-modal.png)

## ✨ Features

### Core Features
- **Category Management** — Organize bills by type (Dairy, Vegetables, Dry Fruits, Cold Drinks, etc.)
- **Vendor Tracking** — Track vendors under each category with name, phone, and address
- **Bill Management** — Add, edit, and delete bills with amount, date, notes, and image attachments
- **Payment Status** — Mark bills as paid/unpaid with automatic payment date tracking
- **Image Upload** — Auto-compressed bill images stored as base64 (client-side WebP compression, zero external storage needed)
- **Date Range Filtering** — Filter bills by custom date ranges with quick presets (7d, 30d, This Month, etc.)
- **Subtotals** — Per-category and per-date-range totals for paid/unpaid amounts

### Advanced Features
- **Statistics Dashboard** — Pie charts, bar graphs, vendor breakdown tables with category & vendor filters
- **Export Reports** — Download filtered reports as PDF (printable) or CSV (Excel compatible)
- **Duplicate Bills** — One-click duplicate for recurring vendor deliveries (copies amount, vendor, category with today's date)
- **Bulk Actions** — Select multiple bills to mark paid/unpaid or delete at once
- **Overdue Alerts** — Visual warnings on dashboard for bills past their due date
- **Month-over-Month Comparison** — Track spending trends on the dashboard
- **Global Search** — Search bills by note, category, vendor, or amount
- **Edit Everything** — Edit bills (amount, image, vendor, dates, notes) and vendors (name, phone, address) anytime
- **Responsive Design** — Full desktop sidebar + mobile bottom navigation with dedicated "Add Bill" button

---

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+
- npm / pnpm / yarn
- Git (optional but recommended)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd sweetshop-bills
npm install
```

### 2. Set Up Services (all free tier)

#### Neon Database (Free)
1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project → name it `sweetshop-bills`
3. Select the closest region (e.g., Singapore for India)
4. Copy the **pooled connection string** from the dashboard

#### Clerk Authentication (Free)
1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application → name it `MithaiBills`
3. Enable Email + Google sign-in
4. Go to **API Keys** → copy `Publishable Key` and `Secret Key`
5. Set up webhook (after deployment):
   - Go to **Webhooks** → Add endpoint
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret**

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Neon Database
DATABASE_URL=postgresql://user:password@ep-xxxxx.region.aws.neon.tech/sweetshop?sslmode=require
```

### 4. Push Database Schema

```bash
npm install -D dotenv-cli
npx dotenv -e .env.local -- npx drizzle-kit push
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
├── app/
│   ├── (dashboard)/            # Authenticated pages (with sidebar)
│   │   ├── layout.tsx          # Sidebar + MobileNav wrapper
│   │   ├── dashboard/          # Dashboard with overview stats
│   │   ├── categories/         # Category CRUD
│   │   │   └── [id]/           # Category detail with bills & vendors
│   │   ├── bills/              # All bills listing + filters
│   │   │   └── new/            # Add new bill form
│   │   ├── stats/              # Statistics with charts & exports
│   │   └── settings/           # User profile (Clerk)
│   ├── sign-in/                # Auth pages (no sidebar)
│   ├── sign-up/
│   ├── api/
│   │   ├── bills/upload/       # Image upload endpoint (base64)
│   │   └── webhooks/clerk/     # Clerk user sync webhook
│   ├── layout.tsx              # Root layout (Clerk + Toaster)
│   └── page.tsx                # Redirect to dashboard or sign-in
├── components/
│   ├── ui/                     # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── layout/                 # Sidebar, MobileNav, MobileHeader, PageShell
│   └── shared/                 # Reusable: StatCard, StatusBadge, ImageUpload, etc.
├── db/
│   ├── schema.ts               # Drizzle schema (users, categories, vendors, bills)
│   └── index.ts                # Neon DB connection
├── lib/
│   ├── actions/                # Server actions (categories, vendors, bills, stats)
│   ├── auth.ts                 # Auth helpers (getCurrentUser)
│   ├── utils.ts                # Utility functions (formatCurrency, formatDate, etc.)
│   ├── validations.ts          # Zod validation schemas
│   └── export-report.ts        # PDF & CSV export utilities
└── styles/
    └── globals.css             # Global CSS with Tailwind + custom properties
```

---

## 🚢 Deploy to Vercel (Free)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add all environment variables from `.env.local`
4. Deploy!
5. **After deploying:** Update your Clerk webhook URL to your Vercel domain

---

## 💰 Cost: ₹0

| Service | Free Tier | Your Usage |
|---------|-----------|------------|
| Vercel | 100GB bandwidth/mo | More than enough |
| Neon | 512MB storage | ~10K+ bills with images |
| Clerk | 10K monthly active users | 1 user = plenty |

> **Note:** Bill images are compressed client-side (WebP, max 800px, 50% quality) and stored as base64 directly in Neon. At ~30-50KB per image, you can store 10,000+ bill images within Neon's 512MB free tier.

---

## 🛠 Useful Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Push database schema changes
npx dotenv -e .env.local -- npx drizzle-kit push

# View database in browser
npx dotenv -e .env.local -- npx drizzle-kit studio

# Lint code
npm run lint
```

---

## 📝 License

MIT