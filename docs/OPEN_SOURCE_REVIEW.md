# Open-source commerce review

The project was compared against mature open-source ecommerce platforms before finalizing the white-label architecture.

## Medusa

Repository: https://github.com/medusajs/medusa

Why it is useful as a reference:

- Node.js/TypeScript commerce platform
- PostgreSQL-first local setup
- products, variants, categories and collections
- orders, inventory, pricing, promotions and customers
- React/Vite admin dashboard
- admin extension routes/widgets
- core uses the MIT license

Important licensing note: current Medusa Enterprise RBAC and SSO materials are separately licensed. This white-label repository does not copy or depend on those enterprise materials. Its basic roles are implemented independently.

## Vendure

Repository: https://github.com/vendurehq/vendure

Strengths:

- Node.js + NestJS + GraphQL
- PostgreSQL support
- strong plugin architecture
- React/TanStack admin dashboard
- D2C, B2B and marketplace capabilities

Reason it was not selected as the direct base: the main project is GPLv3. That can be perfectly valid for open-source projects, but it is less convenient for this project's goal of selling a proprietary white-label application.

## EverShop

Repository: https://github.com/evershopcommerce/evershop

Strengths:

- Node.js/TypeScript
- React
- PostgreSQL
- GraphQL
- storefront and admin capabilities

Reason it was not selected as the direct base: the main repository is GPL-3.0, which introduces distribution obligations that are less convenient for the intended proprietary white-label model.

## Decision

Use the proven commerce-domain ideas from mature systems, while keeping this repository's implementation straightforward and commercially controllable:

```text
React storefront + CMS
        ↓
Express REST API
        ↓
PostgreSQL + Prisma
```

This allows the product to keep its own customer-friendly CMS experience for dynamic pages, FAQs, form builder, submission queues, menus and theme settings while avoiding unnecessary dependency on another platform's enterprise/licensing layer.
