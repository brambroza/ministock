# LINE OA Stock Management System

Production-ready multi-tenant stock management for LINE OA + LIFF with Next.js, MUI, Supabase, and Vercel.

## Stack
- Next.js App Router + TypeScript strict mode
- MUI
- Supabase PostgreSQL + Auth + RLS
- LINE LIFF + Barcode/QR Scanner
- Vercel

## Setup
1. Copy `.env.example` to `.env.local` and fill all values.
2. Run SQL migration in `supabase/migrations/202605270001_init.sql`.
3. Run seed in `supabase/seed/202605270001_seed.sql`.
4. Install dependencies: `npm install`
5. Run dev: `npm run dev`
6. Build: `npm run build`

## Core Routes
- Portal: `/portal/dashboard`, `/portal/products`, `/portal/stock/on-hand`, `/portal/stock/receive`, `/portal/reports/monthly-purchase`
- LIFF: `/liff`, `/liff/dashboard`, `/liff/stock/scan`, `/liff/stock/receive`, `/liff/stock/issue`, `/liff/stock/on-hand`

## Supabase Notes
- All business tables include `id, company_id, created_at, updated_at, created_by, updated_by, is_deleted`.
- RLS enforces company isolation using `current_company_id()` and `is_super_admin()`.
- RPC functions:
  - `get_monthly_purchase_summary(company_id, month)`
  - `get_monthly_stock_balance(company_id, month)`
  - `get_stock_card(product_id, date_from, date_to)`

## LIFF Integration
- Set `NEXT_PUBLIC_LIFF_ID`
- Use `liff.scanCodeV2()` for QR/2D
- Barcode fallback uses `@zxing/browser`

## Deploy to Vercel
1. Push repo to GitHub.
2. Import project in Vercel.
3. Add environment variables from `.env.example`.
4. Deploy.

## Security
- Supabase Auth + RLS
- Zod validation in API/services
- Audit logs for product and stock operations
- Negative stock protection trigger for non-admin roles
