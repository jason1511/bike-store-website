# CV Niaga Bersama Abadi E-Bike Showroom and Management System

A production-oriented e-bike showroom website and internal business management system built for an operating electric bicycle retailer.

The project combines a public product catalogue with inventory, sales, service, user management, audit and reporting tools. It was developed from real store requirements and continues to evolve as the business workflow changes.

- **Live website:** https://niagabersama.com/
- **Repository:** https://github.com/jason1511/bike-store-website

> The live admin dashboard is protected. Production usernames, passwords and other credentials are not published.

## The problem

The store needed more than a promotional website. Product information, colour-level stock, handwritten sales documents, service records and operational reporting all had to remain consistent across daily work.

The system was built to provide one practical workflow for:

- Presenting available bicycles to customers
- Maintaining products, colours, images and stock
- Creating sales invoices and service documents
- Tracking frame numbers for individual bicycles
- Recording stock movements and restoring stock after voided sales
- Separating Admin and Staff responsibilities
- Turning transaction records into useful reports

## Main features

### Customer showroom

- Responsive electric bicycle catalogue
- Brand, search and availability filtering
- Product specifications, colour variants and images
- Featured product support
- WhatsApp product enquiries
- AI-assisted bicycle recommendations
- Desktop, tablet and mobile layouts

### Catalogue and inventory

- Create and edit bicycle listings
- Maintain specifications, pricing and product media
- Track stock at product and colour-variant level
- Filter stock by out-of-stock, low-stock and safe-stock states
- Record additions, reductions, sales, restorations and corrections
- Preserve historical stock-movement records
- Prevent sales that exceed available inventory

### Sales and invoices

- Create multi-item sales invoices
- Select bicycle colours and quantities
- Record optional frame numbers for individual units
- Support cash and bank-transfer payment methods
- Generate sequential invoice numbers
- Deduct inventory when a sale is completed
- Void authorised invoices and restore affected stock
- Search, filter and paginate invoice history
- Produce practical A5 Faktur Penjualan documents

### Service records

- Record customer, bicycle, technician and service information
- Maintain searchable service history
- Store service notes and costs
- Print A5 service documents based on the sales Faktur design
- Restrict sensitive maintenance actions by role

### Reporting and oversight

- Daily, weekly, monthly and custom-period sales reporting
- Configurable day, week and month chart granularity
- Revenue, invoice and units-sold summaries
- Incoming-versus-outgoing stock analysis
- Product and colour-level stock insights
- Printable business reports
- Audit history for important administrative actions

## Roles and permissions

| Capability | Admin | Staff |
|---|:---:|:---:|
| View and edit the catalogue | Yes | Yes |
| Add and adjust stock | Yes | Yes |
| Upload product images | Yes | Yes |
| Create sales invoices | Yes | Yes |
| Create service records | Yes | Yes |
| View and print operational documents | Yes | Yes |
| Void or maintain transactions | Yes | No |
| Activate or deactivate catalogue listings | Yes | No |
| Manage brands | Yes | No |
| View reports and audit activity | Yes | No |
| Create, reset or deactivate users | Yes | No |

Permission checks are enforced in both the interface and the server-side API. Hiding a button is not treated as authorisation.

## Important workflows

### Sale and stock deduction

1. The API validates the invoice and requested quantities.
2. Current colour-level inventory is checked.
3. The invoice and line items are stored.
4. Sold quantities are deducted.
5. Stock-movement records are written.
6. The completed invoice becomes available for viewing and printing.

### Invoice voiding

1. An authorised Admin selects an active invoice.
2. The invoice is marked as void instead of being silently erased.
3. Quantities from each invoice line are restored.
4. Restoration movements are recorded.
5. The original transaction remains available for historical review.

### Authentication

- Passwords are stored as salted PBKDF2-SHA-256 hashes, not plaintext.
- Login attempts are checked against active users in Cloudflare D1.
- Five failed attempts for the same username and IP within 15 minutes trigger a temporary lockout.
- Successful login creates an HMAC-signed session token with an eight-hour expiry.
- Protected API requests re-check that the user still exists, remains active and still has the required role.
- Login successes, failures and lockouts are recorded for audit purposes.

## Architecture

~~~mermaid
flowchart TD
    A["Customer or staff browser"] --> B["Cloudflare Pages"]
    B --> C["Pages Functions API"]
    C --> D["D1 business data"]
    C --> E["R2 images"]
    C --> F["OpenAI API"]
~~~

The frontend is intentionally framework-light. JavaScript is separated into focused modules for authentication, catalogue editing, colour variants, media, invoices, services, analytics, reports, users and audit activity.

## Technology

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 and modular JavaScript |
| Hosting | Cloudflare Pages |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare D1 and SQL |
| Media | Cloudflare R2 |
| AI integration | OpenAI API |
| Visualisation | Browser-based charts |
| Development | Wrangler, Git and GitHub |

## Repository organisation

~~~text
admin.html              Protected administration entry point
admin-partials/         Catalogue, sales, service, reports, users and audit views
css/                    Public, admin, responsive and printable styles
js/                     Public and administrative JavaScript modules
functions/api/          Cloudflare Pages API routes
functions/_shared/      Shared authentication and backend helpers
migrations/             D1 schema changes
images/                 Static public assets
wrangler.toml           Cloudflare bindings and local configuration
~~~

SQL seed files are also included for local workflow testing with larger, multi-item and multi-colour datasets.

## Local development

### Requirements

- Node.js
- A Cloudflare account for remote resources
- Wrangler through npx or a global installation

Clone the project:

~~~bash
git clone https://github.com/jason1511/bike-store-website.git
cd bike-store-website
~~~

Start the local Pages environment:

~~~bash
npx wrangler pages dev .
~~~

Apply D1 migrations locally when required:

~~~bash
npx wrangler d1 migrations apply bike-store-db --local
~~~

Before applying a migration remotely, review it, back up important production data and test the affected inventory, invoice and reporting workflows locally.

## Configuration

The Cloudflare configuration defines these bindings:

| Binding | Purpose |
|---|---|
| **BIKE_DB** | D1 database containing operational records |
| **BIKE_IMAGES** | R2 bucket containing product images |

Server-side secrets may include:

| Secret | Purpose |
|---|---|
| **SESSION_SECRET** | Password hashing support and signed sessions |
| **OPENAI_API_KEY** | AI recommendation requests |
| **ALLOW_FALLBACK_ADMIN** | Explicitly enables the optional fallback administrator |
| **ADMIN_USERNAME** | Fallback administrator username |
| **ADMIN_PASSWORD** | Fallback administrator password |

Secrets must be stored in Cloudflare or local development secret files and must never be committed. The fallback administrator should remain disabled in normal production operation.

## Validation

Current validation covers the main business workflows:

- Product creation and editing
- Colour-level stock adjustments
- Multi-item and multi-colour invoices
- Overselling prevention
- Frame-number entry
- Invoice voiding and stock restoration
- Service creation and printing
- Admin and Staff permission boundaries
- Password hashing, session validation and login lockout
- Date-filtered reports and analytics
- Desktop, tablet and mobile administration
- A5 sales and service printing

JavaScript syntax checks, CSS structural checks and targeted workflow testing are performed when relevant features change. Broader automated API and end-to-end coverage remains an active improvement area.

## Current status

The system is actively used and maintained. The public catalogue, administration, inventory, invoicing, service, reporting, user-management and audit foundations are implemented.

Current priorities are:

1. Continue production testing of the Admin and Staff permission matrix.
2. Expand automated tests for authentication and transactional stock workflows.
3. Add deployment verification through continuous integration.
4. Improve export, backup and recovery workflows.
5. Continue refining reporting and data-quality validation.

## Engineering lessons

This project strengthened practical experience in:

- Translating business requirements into software workflows
- Modelling relational data for daily operations and historical reporting
- Maintaining inventory consistency across sales, edits and voids
- Designing role-based interfaces and server-side authorisation
- Managing Cloudflare D1 migrations and R2 media
- Refactoring a growing JavaScript codebase into focused modules
- Debugging mobile browser, caching and print-layout behaviour
- Maintaining a live system as business requirements evolve

## Author

**Jason Leonard**  
Graduate Full Stack Developer based in Melbourne, Australia.

- GitHub: https://github.com/jason1511
- LinkedIn: https://linkedin.com/in/jason-leonard-197230163

## Licence

This repository contains a custom business and portfolio project. Unless a separate licence is added, the source code should not be treated as licensed for redistribution or commercial reuse.
