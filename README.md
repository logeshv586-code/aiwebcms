# AI Web CMS — White-Label Commerce Platform

<p align="center">
  <strong>Launch and operate a complete ecommerce storefront without editing React source code for everyday store changes.</strong>
</p>

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-20232a?logo=react" />
  <img alt="Express 5" src="https://img.shields.io/badge/Express-5-111111?logo=express" />
  <img alt="PostgreSQL 16" src="https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-ORM-2d3748?logo=prisma" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white" />
  <img alt="CI" src="https://github.com/logeshv586-code/aiwebcms/actions/workflows/ci.yml/badge.svg" />
</p>

## Overview

**AI Web CMS** is a reusable white-label ecommerce storefront and merchant CMS. It is designed for businesses that need to manage branding, catalog, content, customers, orders, promotions, forms, navigation, staff, and integrations from an admin dashboard instead of changing source code.

The same codebase can be configured for fashion, footwear, groceries, electronics, beauty, furniture, specialty products, or mixed catalogs. Store-specific content is persisted in PostgreSQL and managed from `/admin`.

> **Core principle:** normal store operations should not require Git or a developer.

## Product preview

![Commerce CMS dashboard](docs/images/cms-dashboard.png)

The dashboard gives a store owner a guided launch flow, operational KPIs, review queues, and direct access to catalog, inventory, orders, customers, content, promotions, navigation, integrations, and staff access.

## Architecture

![System architecture](docs/images/architecture.svg)

| Layer | Technology | Responsibility |
|---|---|---|
| Storefront + CMS | React 19, Vite 8, React Router, Zustand | Customer shopping experience and merchant administration |
| API | Node.js 22, Express 5, Zod | Business logic, auth, catalog, checkout, content, operations |
| Data | PostgreSQL 16, Prisma ORM | Products, customers, orders, content, configuration |
| Security | JWT, bcrypt, Helmet, CORS, rate limiting | Authentication and baseline API hardening |
| Media | Multer + upload adapter | Product/content image handling |
| Runtime | Docker Compose | Repeatable local / self-hosted deployment |

## What merchants can manage

- Store name, logo, favicon, contact information, currency, locale, and theme
- Categories and nested categories
- Collections and brands
- Products, pricing, images, variants, inventory, and SEO
- Homepage sections and ordering
- Header and footer navigation
- Pages, policies, FAQs, and blog content
- Dynamic customer forms and enquiry queues
- Coupons and review moderation
- Orders, payment state, fulfillment state, tracking, returns, and refunds
- Customer accounts and saved addresses
- Owner-managed staff roles and access
- Integration configuration through the server adapter layer

All merchant content fields support Unicode text.

## Storefront capabilities

- Responsive white-label storefront
- CMS-driven announcement bar, navigation, footer, and homepage
- Live search suggestions and catalog search
- Category, collection, brand, price, stock, sale, and rating filters
- Sorting and pagination
- Product galleries, variants, compare-at pricing, and stock validation
- Wishlist and persistent guest cart
- Authenticated cart synchronization
- Saved addresses
- Coupon validation
- Cash on Delivery checkout flow
- Transactional stock decrement to reduce overselling risk
- Registration, login, account, and order history
- Secure order tracking by order number + checkout email
- Moderated product reviews with verified-purchase support
- CMS pages, FAQ, blog, dynamic forms, and 404 handling

## CMS capabilities

The admin experience is organized for non-technical owners:

1. **Brand & store settings** — identity, locale, contact details, theme
2. **Catalog structure** — categories, collections, brands
3. **Products & inventory** — SKUs, variants, stock, publishing, SEO
4. **Homepage builder** — hero, grids, banners, text, trust cards, FAQ
5. **Content & navigation** — pages, policies, blog, menus, forms
6. **Operations** — orders, customers, promotions, reviews, enquiries
7. **Platform** — payment review, integrations, and staff access

### Dynamic forms

The generic form builder can be configured for workflows such as Contact, Become a Seller, Bulk Enquiry, Wholesale Request, Product Suggestion, Request a Quote, or Book a Consultation.

Submission lifecycle:

```text
NEW → IN_REVIEW → CONTACTED → APPROVED / REJECTED / CLOSED
```

### Roles

| Role | Typical access |
|---|---|
| `OWNER` | Complete administration and staff access |
| `ADMIN` | Operational administration |
| `MANAGER` | Orders, customers, settings, coupon operations |
| `EDITOR` | Catalog, content, homepage, forms, review editing |
| `CUSTOMER` | Storefront account |

## SEO foundation

The project includes clean slugs, editable metadata, canonical product URLs, index/no-index controls, Open Graph/Twitter metadata support, Product JSON-LD, Article JSON-LD, FAQ structured data, BreadcrumbList structured data, Organization/WebSite schema, generated sitemap, and robots.txt support.

This implementation is a React SPA. The code includes crawlability and structured-data support; SSR/SSG can be introduced later where server-rendered SEO is required.

## Quick start with Docker

**Requirement:** Docker Desktop / Docker Engine with Compose.

```bash
git clone https://github.com/logeshv586-code/aiwebcms.git
cd aiwebcms
docker compose up --build
```

Open:

- Storefront + CMS: `http://localhost:4173`
- CMS login: `http://localhost:4173/admin/login`
- API health: `http://localhost:5000/api/health`

Development seed credentials:

```text
Email: owner@example.com
Password: ChangeMe123!
```

> Change seeded credentials and all example secrets before any public deployment.

## Manual development setup

Requirements: **Node.js 22** and **PostgreSQL 16**.

### Backend

```bash
cd server
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

### Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Vite proxies `/api`, `/uploads`, `/sitemap.xml`, and `/robots.txt` to the backend in development.

## Environment variables

### Server

```env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
PUBLIC_SITE_URL=http://localhost:5173
UPLOAD_DIR=./uploads
INTEGRATION_ENCRYPTION_KEY=replace-with-a-long-random-encryption-secret
```

### Client

```env
VITE_API_URL=/api
```

Never commit production secrets.

## Repository structure

```text
.
├── .github/workflows/ci.yml
├── client/
│   ├── src/
│   │   ├── admin/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.js
├── server/
│   ├── prisma/
│   ├── src/
│   │   ├── integrations/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── test/
│   └── Dockerfile
├── docs/
│   ├── FINAL_AUDIT.md
│   ├── OPEN_SOURCE_REVIEW.md
│   ├── TEST_REPORT.md
│   └── images/
├── docker-compose.yml
└── package.json
```

## Useful commands

From the repository root:

```bash
npm run install:all   # install root, server, and client dependencies
npm run dev           # run server + client in development
npm run check         # backend JavaScript syntax/static checks
npm run test          # backend Node test suite
npm run build         # client production build
npm run verify        # check + test + build
```

## API highlights

### Public / storefront

```text
GET  /api/storefront/config
GET  /api/storefront/categories
GET  /api/storefront/collections
GET  /api/storefront/brands
GET  /api/storefront/products
GET  /api/storefront/search-suggestions
GET  /api/storefront/products/:slug
GET  /api/storefront/pages/:slug
GET  /api/storefront/blogs
GET  /api/storefront/blogs/:slug
GET  /api/storefront/faqs
GET  /api/storefront/forms/:formKey
POST /api/storefront/forms/:formKey/submissions
POST /api/checkout
POST /api/coupons/validate
GET  /api/orders/:orderNumber?email=...
```

### Account / commerce

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
GET  /api/orders/my
GET/POST/PUT/DELETE /api/account/addresses
GET/POST/DELETE     /api/account/wishlist
GET                 /api/cart
POST/PUT/DELETE     /api/cart/items
PUT                 /api/cart/sync
```

## CI and audit material

The repository includes a GitHub Actions workflow plus documentation for final audit, open-source review, and test reporting. The CI configuration provisions PostgreSQL and validates the backend, Prisma setup, tests, and frontend production build.

See:

- [`docs/FINAL_AUDIT.md`](docs/FINAL_AUDIT.md)
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md)
- [`docs/OPEN_SOURCE_REVIEW.md`](docs/OPEN_SOURCE_REVIEW.md)

## Production checklist

Before deploying publicly:

- Replace seed owner credentials
- Set long random values for `JWT_SECRET` and `INTEGRATION_ENCRYPTION_KEY`
- Use a production PostgreSQL database with backups
- Configure production `CLIENT_URL` and `PUBLIC_SITE_URL`
- Place the service behind HTTPS
- Move media to durable object storage for multi-instance deployments
- Review payment/shipping integration configuration for the target market
- Run `npm run verify`

## Project status

This repository is structured as a reusable commerce foundation: storefront, CMS, API, database schema, integration adapters, tests, Docker deployment, and operator-facing documentation are included in one codebase.
