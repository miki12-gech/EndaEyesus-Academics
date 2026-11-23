# እንዳ ኢየሱስ ግቢ ጉባኤ — የነባር ተማሪዎችና አገልጋዮች አካዳሚክ ፖርታል (Telegram Mini App)

Complete Next.js 14 (App Router) + Neon Serverless PostgreSQL + Telegram Bot & Mini App built for Enda Eyesus Gibi Gubae Academic Department (`@EndaEyesusAcademicBot`).

## Features
- **3-Step Mobile-First Telegram Mini App** for 2nd Year to GC students & Gibi Gubae servants.
- **Tailored Colleges & Service Departments:** Includes Enda Eyesus colleges + all 8 Gibi Gubae departments (`ፅሕፈት ቤት`, `ትምህርት`, `መዝሙር እና ኪነጥበብ`, `ሞያና አገልግሎት`, `ልማት`, `ኦዲት እና ኢንስፔክሽን`, `ባችና ማስተባበርያ`, `አባላት ጉዳይ`) plus `ሌላ (Other)` custom inputs everywhere.
- **Auto-Initialized Neon Postgres Schema:** Zero manual migrations required — tables and indexes are created automatically via `@neondatabase/serverless`.
- **Cryptographically Verified Telegram Auth (`HMAC-SHA256`)**: Verifies Telegram `initData` so students can view/update their own status securely and only authorized Telegram IDs unlock the in-app **Admin Dashboard**.
- **Built-in & Browser Admin Dashboard (`/admin`)**: Real-time KPIs, Red Flag filtering (`Warning`, repeated courses, service/study time stress), Potential Tutor filter, and **1-Click UTF-8 Excel (CSV) Export** (preserves Amharic characters cleanly in Microsoft Excel).

## Quick Deployment Guide (Vercel + Neon)

1. **Rotate Credentials (Recommended):** Never commit `.env.local` to GitHub.
2. **Push to GitHub** and import the repository into **Vercel**.
3. **Add Environment Variables in Vercel:**
   - `DATABASE_URL` = Your Neon pooled PostgreSQL connection string
   - `TELEGRAM_BOT_TOKEN` = Your `@EndaEyesusAcademicBot` token
   - `NEXT_PUBLIC_APP_URL` = Your Vercel URL (e.g., `https://enda-eyesus-academic.vercel.app`)
   - `ADMIN_TELEGRAM_IDS` = Your numeric Telegram ID (send `/myid` to your bot after step 5, or ask `@userinfobot`)
   - `ADMIN_DASHBOARD_PIN` = Strong password for `/admin` browser login
   - `WEBHOOK_SECRET` = Any random secret string (e.g., `enda-eyesus-2019-secret`)
4. **Deploy on Vercel.**
5. **Activate Webhook & Database (1-Click):**
   Open `https://your-vercel-url.vercel.app/api/set-webhook` in your browser once.
   - This initializes the Neon PostgreSQL table, connects your Telegram webhook, and sets the Telegram Menu Button (`📋 አካዳሚክ ፖርታል`)!
6. Open `@EndaEyesusAcademicBot` in Telegram and send `/start`.
