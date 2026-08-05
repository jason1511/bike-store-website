# CV Niaga Bersama Abadi E-Bike Showroom and Management System

A full-stack customer website and internal business management platform built for an operating electric bicycle retailer.

The system combines a public product catalogue with administrative tools for managing inventory, sales, invoices, service records, users, reports, and stock movements.

This project was developed from real business requirements and continues to evolve as the store’s operational needs change.

## Project Overview

The application supports two main areas:

### Customer Website

Customers can:

- Browse available electric bicycles
- View product specifications, images, colours, and availability
- Explore the showroom catalogue on desktop and mobile devices
- Submit product-related enquiries

### Internal Management System

Authorised staff can:

- Create and manage bicycle listings
- Track available stock
- Create multi-item sales invoices
- Record individual bicycle frame numbers
- Manage customer service records
- Track incoming and outgoing stock
- Generate sales and stock reports
- Print invoices, service documents, and reports
- Manage users and administrative permissions
- Review audit logs for important system changes

## Key Features

### Product and Inventory Management

- Create, edit, and remove bicycle products
- Manage product specifications, images, colours, and stock quantities
- Track stock increases and decreases
- Record stock movements when products are added, adjusted, sold, restored, or deleted
- Prevent invalid sales quantities and stock inconsistencies
- Maintain historical stock movement information for reporting

### Invoice Management

- Create invoices containing multiple products
- Automatically deduct sold quantities from inventory
- Support separate variants of the same bicycle
- Record optional frame numbers for individual bicycles
- Generate sequential invoice numbers
- Support cash and bank-transfer payment methods
- Void invoices and restore affected stock
- Edit or remove authorised invoice records
- Display invoice history and sales details

### Service Management

- Record bicycle service transactions
- Store customer, bicycle, cost, and service information
- Maintain searchable service history
- Generate printable service documents
- Support internal staff and technician sign-off

### Reporting and Analytics

- Generate daily, weekly, monthly, and custom-period reports
- Select a custom start date for weekly reporting
- Limit monthly options to periods containing business data
- Analyse sales and stock movements
- Display interactive charts
- Track incoming and outgoing inventory
- Produce printable statement-style reports

### Authentication and Administration

- Secure administrator and staff authentication
- Role-based access control
- User activation and deactivation
- Administrative editing and deletion controls
- Audit logging for important business actions
- Protected serverless API routes

### Printable Documents

- A4 invoice layout
- Printable service records
- Landscape business reports
- Mobile-compatible print previews
- Ink-conscious styling with reduced large colour blocks
- Structured sections designed for practical store use

## Technical Highlights

This project involves more than a static catalogue. It includes business-critical workflows and data relationships such as:

- Transactional stock deduction and restoration
- Multi-item invoice processing
- Product variant handling
- Frame-number tracking
- Role-based authorisation
- Historical reporting
- Stock movement reconciliation
- Legacy data compatibility
- Database migrations
- Mobile input and print-layout handling
- Modular frontend and backend organisation

## Tech Stack

### Frontend

- JavaScript
- HTML5
- CSS3
- Responsive web design
- Chart-based data visualisation

### Backend

- Cloudflare Pages Functions
- Serverless REST-style API endpoints
- JavaScript runtime
- Role-based route protection

### Data and Storage

- Cloudflare D1
- SQL
- Relational data modelling
- Database migrations
- Cloudflare R2 for media storage

### Integrations and Tooling

- OpenAI API
- Cloudflare Pages
- Wrangler CLI
- Git
- GitHub

## Architecture

The application is organised into separate public, administrative, API, data, and printable-document layers.

```text
Public customer interface
        |
        v
Cloudflare Pages Functions / API routes
        |
        v
Cloudflare D1 relational database
        |
        +---- Product and inventory data
        +---- Invoice and sales data
        +---- Service records
        +---- Users and permissions
        +---- Audit and stock movement records

Cloudflare R2
        |
        +---- Product images and media
```

The frontend JavaScript has been progressively modularised to separate responsibilities such as:

- Authentication
- API communication
- Product editing
- Product media
- Product colours
- Invoice forms
- Invoice details
- Invoice analytics
- Stock charts
- Reporting
- Printable document generation

## Business Rules Implemented

Several features required careful handling of business rules rather than basic CRUD operations.

### Stock Deduction

When an invoice is created:

1. The requested quantities are validated.
2. Available inventory is checked.
3. The invoice and its line items are stored.
4. Product stock is reduced.
5. Stock movement records are created.

### Invoice Voiding

When an invoice is voided:

1. The invoice is marked as void.
2. Quantities from its line items are restored.
3. Restoration movements are recorded.
4. Historical invoice data remains available for auditing.

### Frame Numbers

Frame numbers can be recorded for individual bicycles included in an invoice.

The field is optional to support older inventory and cases where the number is entered later.

### Stock Movement Reporting

The reporting system distinguishes between movements such as:

- New inventory received
- Manual stock increases
- Manual stock reductions
- Product sales
- Voided-sale restoration
- Administrative corrections

## Data and Reporting Focus

A major part of the project is transforming operational records into useful business information.

The application collects data across products, invoices, stock adjustments, service transactions, and users. It then uses these records to generate:

- Sales summaries
- Revenue trends
- Stock movement history
- Incoming-versus-outgoing stock charts
- Date-filtered reports
- Printable business statements
- Administrative audit trails

This required designing data structures that support both day-to-day transactions and historical analysis.

## Engineering Challenges

Some of the main challenges addressed during development include:

- Maintaining inventory consistency across sales, edits, and voids
- Supporting multiple products and variants within one invoice
- Handling historical records created before newer fields existed
- Introducing database changes safely through migrations
- Separating a growing JavaScript codebase into maintainable modules
- Producing reliable A4 print layouts across desktop and mobile browsers
- Preventing mobile quantity inputs from exceeding available stock
- Tracking incoming stock rather than reporting only completed sales
- Balancing practical business needs with maintainable architecture

## Local Development

### Prerequisites

- Node.js
- npm
- A Cloudflare account
- Wrangler CLI
- Cloudflare D1 database
- Cloudflare R2 bucket where media storage is required

Install Wrangler globally when needed:

```bash
npm install -g wrangler
```

Clone the repository:

```bash
git clone https://github.com/jason1511/bike-store-website.git
cd bike-store-website
```

Install dependencies when required by the current project configuration:

```bash
npm install
```

Start the local Cloudflare development environment:

```bash
wrangler pages dev .
```

The exact bindings and environment variables must match the project’s Cloudflare configuration.

## Environment Configuration

The application may require bindings or secrets for:

- Cloudflare D1
- Cloudflare R2
- OpenAI API
- Administrative authentication
- Production-specific configuration

Secrets should be configured through Cloudflare or Wrangler and must not be committed to the repository.

Example:

```bash
wrangler secret put OPENAI_API_KEY
```

## Database Migrations

Database changes are managed through SQL migration files.

Apply migrations using the migration workflow configured for the project’s D1 database.

Before applying changes to production:

1. Review the migration.
2. Test it against a local or development database.
3. Back up important production data.
4. Apply migrations in numerical order.
5. Verify affected invoice, inventory, and reporting workflows.

## Testing and Validation

The project currently relies on workflow-based validation across major business processes, including:

- Creating and editing products
- Increasing and reducing stock
- Creating multi-item invoices
- Preventing overselling
- Recording frame numbers
- Voiding invoices
- Restoring stock
- Creating service records
- Filtering reports by date
- Printing documents
- Testing desktop and mobile layouts
- Verifying role-based administrative access

Future improvements may include broader automated testing for API routes, transactional workflows, and reporting calculations.

## Current Status

The application is an active, evolving business system.

Implemented areas include:

- Public product catalogue
- Product administration
- Authentication and user roles
- Inventory management
- Multi-item invoicing
- Frame-number recording
- Invoice voiding and stock restoration
- Service records
- Audit logging
- Sales reports
- Stock movement reports
- Interactive charts
- Printable business documents
- Cloudflare deployment

## Planned Improvements

Potential future improvements include:

- Expanded automated testing
- Stronger end-to-end transactional tests
- Additional data-quality validation
- More detailed inventory forecasting
- Improved reporting exports
- Further mobile usability refinements
- Additional dashboard metrics
- Enhanced deployment and CI workflows
- Broader API documentation

## What I Learned

This project strengthened my experience in:

- Translating business requirements into software workflows
- Designing relational databases for operational systems
- Building frontend and backend features together
- Working with serverless APIs
- Managing database migrations
- Handling transactional inventory logic
- Designing role-based administrative systems
- Refactoring large JavaScript files into focused modules
- Debugging mobile and browser-specific behaviour
- Building reports from transactional data
- Maintaining software as requirements evolve

## Author

**Jason Leonard**

Graduate Full Stack Developer based in Melbourne, Australia.

- GitHub: [github.com/jason1511](https://github.com/jason1511)
- LinkedIn: [linkedin.com/in/jason-leonard-197230163](https://linkedin.com/in/jason-leonard-197230163)

## Licence

This repository represents a custom business and portfolio project.

Unless a separate licence is added, the source code should not be treated as licensed for redistribution or commercial reuse.
