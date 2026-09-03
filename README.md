# White-Label Ecommerce CMS

A reusable ecommerce storefront + merchant CMS built for businesses that should be able to launch and operate a store without editing source code.

The same deployment can be configured for footwear, fruit, groceries, electronics, fashion, beauty, furniture, specialty products, or a mixed catalog. Store-specific content lives in PostgreSQL and is managed from `/admin`.

## Core product principle

**Normal store changes do not require Git or a developer.**

A merchant can use the CMS to manage:

- store name, logo, favicon, contact details, currency, locale and theme
- categories and nested categories
- collections and brands
- products, images, stock, pricing, variants and SEO
- homepage sections and their order
- header and footer navigation
- content pages and policies
- FAQs
- blog articles
- generic customer forms and submission queues
- coupons and review moderation
- orders, delivery status and tracking information
- customer accounts
- owner-managed staff roles

All content fields accept Unicode text, so merchant content can be entered in the language the business needs.

## Stack

### Storefront / CMS
- React 19
- Vite 8
- React Router
- Zustand
- Lucide React
- responsive custom CSS

### API
- Node.js 22
- Express 5
- Zod validation
- JWT authentication
- bcrypt password hashing
- Helmet
- CORS
- rate limiting
- Multer image uploads

### Data
- PostgreSQL 16
- Prisma ORM

## Storefront features

- premium neutral light theme controlled from CMS
- announcement bar
- CMS-defined header/footer menus
- responsive navigation
- live search suggestions
- catalog search
- nested category filtering
- collection and brand filtering
- price, stock, sale and rating filters
- sorting and pagination
- SEO-friendly category URLs
- product gallery
- simple and variant products
- stock validation
- wishlist
- persistent guest cart
- authenticated cart synchronization
- saved customer addresses
- coupon validation
- Cash on Delivery checkout
- transactional stock decrement to reduce overselling risk
- account registration/login
- order history
- secure order tracking using order number + checkout email
- customer reviews with moderation
- verified-purchase review flag for delivered orders
- CMS pages and policies
- FAQ
- blog
- dynamic forms
- 404 page

## CMS features

### Guided setup
The dashboard provides a simple launch path instead of exposing developer concepts:

1. Brand and store settings
2. Catalog structure
3. Products
4. Homepage
5. Navigation/content/forms
6. Orders and customer operations

### Catalog
- product create/edit/delete
- publish/draft/archive state
- product images via upload or URL
- SKU
- price / compare-at price
- stock
- optional variants such as size, color, storage or weight
- category, brand and collection assignment
- featured products
- product SEO metadata
- nested categories
- category SEO metadata
- collections
- brands

### Homepage builder
Supported section types:
- hero
- category grid
- product grid
- blog grid
- promotional banner
- text section
- trust/service cards
- FAQ

Sections can be enabled/disabled and reordered. Hero/banner/text blocks can contain editable labels, headings, copy, images and calls to action.

### Content
- pages / policies
- FAQ
- blog articles
- SEO metadata
- publish/hide controls

### Generic form builder
One form system can become any merchant workflow, for example:
- Contact
- Become a seller
- Bulk enquiry
- Wholesale request
- Product suggestion
- Request a quote
- Book a consultation

The merchant chooses the title, fields, required state, submit button and success message. Submissions enter a queue with statuses:

`NEW → IN_REVIEW → CONTACTED → APPROVED / REJECTED / CLOSED`

### Orders
Merchants can inspect:
- customer/contact snapshot
- shipping address
- purchased items
- subtotal / discount / shipping / tax / total
- payment state
- fulfillment state
- tracking number
- tracking link

Supported workflow states include pending, confirmed, processing, packed, shipped, out for delivery, delivered, cancelled, return requested, returned and refunded.

### Roles
- `OWNER` — complete administration and staff access
- `ADMIN` — operational administration
- `MANAGER` — order/customer/settings/coupon operations
- `EDITOR` — catalog/content/homepage/forms/review editing without owner-level controls
- `CUSTOMER` — storefront account

## SEO

The project includes:
- clean product/category/page/blog slugs
- editable product/page/blog/category meta title and description
- canonical product URLs
- index/no-index controls
- dynamic document metadata
- Open Graph/Twitter metadata support
- Product JSON-LD
- Article JSON-LD
- generated `/sitemap.xml`
- generated `/robots.txt`
- CMS blog/content support

This is a React SPA as requested. The SEO implementation makes the SPA crawlable and content-structured, but a future SSR/SSG storefront can be introduced if a deployment requires the strongest possible server-rendered SEO.

## Media

The built-in adapter accepts JPG, PNG, WebP and GIF images up to 5 MB and stores them under the API upload directory. Docker uses a persistent named volume.

For multi-instance production hosting, replace the local adapter with S3/Cloudinary-compatible object storage; the CMS/API contract is already isolated behind the upload endpoint.

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
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   ├── test/
│   └── Dockerfile
├── docs/
├── docker-compose.yml
└── package.json
```

## Fastest local start

Requirements: Docker Desktop.

```bash
docker compose up --build
```

Then open:

- Storefront/CMS web: `http://localhost:4173`
- CMS login: `http://localhost:4173/admin/login`
- API health: `http://localhost:5000/api/health`

Development owner credentials seeded by Docker:

```text
Email: owner@example.com
Password: ChangeMe123!
```

Change these before any public deployment.

## Manual development setup

Requirements:
- Node.js 22
- PostgreSQL 16

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

Vite proxies `/api`, `/uploads`, `/sitemap.xml` and `/robots.txt` to the local backend during development.

## Important environment variables

Backend:

```text
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
PUBLIC_SITE_URL=http://localhost:5173
UPLOAD_DIR=./uploads
INTEGRATION_ENCRYPTION_KEY=replace-with-a-long-random-encryption-secret
```

Frontend:

```text
VITE_API_URL=/api
```

Never commit production secrets.

## API highlights

### Public

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
GET  /api/storefront/sitemap.xml
GET  /api/storefront/robots.txt
POST /api/checkout
POST /api/coupons/validate
GET  /api/orders/:orderNumber?email=...
```

### Account

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
POST                /api/products/:productId/reviews
```

### CMS

Protected `/api/admin/*` endpoints cover dashboard, products, categories, collections, brands, orders, customers, navigation, homepage, pages, FAQs, blogs, generic forms, submissions, uploads, coupons, reviews, store settings and owner-managed staff.

## Automated verification

GitHub Actions runs on every push and pull request to `main`:

1. PostgreSQL 16 service
2. backend dependency install
3. Prisma schema validation
4. Prisma client generation
5. test schema creation
6. seed
7. backend syntax checks
8. backend unit/integration tests
9. frontend dependency install
10. Vite production build

The integration suite exercises the application through real HTTP routes against PostgreSQL, including CMS login, catalog creation, public product retrieval, checkout, stock decrement, secure order tracking, dynamic form validation, blog publication, image upload, sitemap and robots output.

See `docs/TEST_REPORT.md` for verification status.

## Credential-dependent integrations

The commerce core deliberately does not pretend that third-party services are configured when merchant credentials do not exist. These are provider adapters for deployment:

- Razorpay / Stripe payment capture
- S3 / Cloudinary production object storage
- transactional email
- SMS / WhatsApp
- shipping carrier APIs

Cash on Delivery is the complete built-in payment path. Adding a payment provider should extend the payment adapter rather than alter catalog/order/CMS architecture.

## Commercial deployment model

The current version is **one isolated store per deployment**, which is suitable for selling the ready-made application to separate customers while keeping each customer's database and settings isolated.

A future hosted SaaS version can introduce tenant/store IDs and custom domains to run many merchant stores from one shared platform.

## Future AI layer

AI should remain isolated from transaction/database rules. Suitable future modules:
- storefront shopping chatbot
- semantic product search
- recommendations
- FAQ assistant
- product-description drafting
- SEO metadata drafting
- merchant CMS assistant
- support summarization

The AI service should use validated application APIs instead of writing directly to PostgreSQL.

## Self-service integrations

Each deployed customer can connect their own service accounts from **Admin → Integrations**. No source-code edit or Git push is required for ordinary provider setup.

The CMS follows the same workflow for every provider:

1. enter the merchant's public configuration
2. enter secret credentials (stored encrypted server-side)
3. save
4. test the connection
5. enable the provider only after the test succeeds

Supported built-in pathways:

| Area | Built-in providers / fallback | Customer-facing/API pathway |
| --- | --- | --- |
| Payments | Cash on Delivery, Stripe, Razorpay | `GET /api/payments/methods`, `POST /api/payments/session`, `POST /api/payments/verify` |
| Media | Local persistent upload, Cloudinary, S3-compatible storage | `POST /api/admin/media/upload` |
| Email | Merchant SMTP | commerce notifications + integration test delivery |
| SMS | Twilio | commerce notifications + integration test delivery |
| WhatsApp | Meta WhatsApp Cloud API | commerce notifications + integration test delivery |
| Shipping | flat-rate fallback, Shiprocket, custom HTTP API | `POST /api/shipping/quote`, `POST /api/admin/orders/:id/shipment` |
| Automation | signed custom webhook | order/form events + test delivery |

Integration configuration is available only to operational administrator roles. Secret values are encrypted with `INTEGRATION_ENCRYPTION_KEY` and are never returned to the browser after saving.

### Adding another provider later

Provider-specific behavior is isolated under `server/src/integrations/`. A future provider can be added without changing catalog, customer, CMS, order, or product database architecture. Register its merchant fields in `server/src/integrations/catalog.js`, add its adapter, then expose it through the existing connection lifecycle.

## Merchant-controlled design system

The CMS is designed so normal visual changes do not require CSS edits.

Global theme controls include:

- primary/accent color
- page background
- surface/card color
- main and muted text colors
- border color
- global content/container width
- card corner radius
- store logo and favicon
- announcement content
- common storefront wording and language-friendly labels

Each homepage section can independently control:

- section type
- heading/subheading/eyebrow
- button text and link
- uploaded image
- boxed, narrow, or full-browser width
- desktop and mobile minimum height
- automatic height (`0`)
- image `cover` or `contain`
- left/center/right alignment
- vertical spacing
- corner radius
- grid gap
- desktop column count
- mobile column count
- background color
- text color
- display order
- visible/hidden state

This means one merchant can use a shallow promotional strip while another uses a large hero image without changing the React component.

## Flexible product data

Products are not tied to one industry. In addition to name, description, price, stock, SKU, category, brand and collection, the CMS supports reusable custom attribute/specification rows and shipping measurements.

Examples of data the same model can represent:

- footwear: material, size chart, fit, color
- food: net weight, ingredients, origin, storage instructions
- electronics: RAM, storage, processor, warranty
- furniture: material, dimensions, assembly information

Variants can independently carry price, compare-at price, stock, SKU, image, options and shipping information.

## Final storefront quality pass

The final audit adds production-facing polish without changing the platform architecture:

- FAQPage structured data on the FAQ route.
- Organization + WebSite/SearchAction schema on the homepage and BreadcrumbList schema on FAQ/product routes.
- CMS-configurable `imageAlt` text for hero/banner homepage assets, with sensible fallbacks for category, collection, brand and blog images.
- Product variant image switching, including variant-only images that are not duplicated in the main gallery.
- Product and variant compare-at pricing presentation.
- Related products and browser-local recently viewed products on product detail pages.
- `server/test/source-contract.test.js` to protect these storefront/SEO/schema contracts and CI expectations from regressions.

### Verification contract

`npm run verify` remains the canonical local verification command after dependencies are installed. GitHub Actions additionally provisions PostgreSQL 16, validates/generates Prisma, pushes and seeds the test schema, runs backend tests, and builds the Vite storefront. A green `Verify ecommerce platform` workflow on the pushed commit is the runtime completion signal.
