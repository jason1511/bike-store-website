# CV Niaga Bersama Abadi E-Bike Showroom Website

A responsive electric bike showroom website built for **CV Niaga Bersama Abadi**, a local electric bike business in Lumajang, Indonesia.

The website allows customers to browse available electric bikes, filter by brand, compare models, view product details, and contact the showroom directly through WhatsApp. It also includes an admin dashboard for managing catalogue data, brands, sales, services, users, and activity logs.

## Live Website

https://niagabersama.com/

## Features

### Public Website

* Responsive homepage for desktop and mobile
* Electric bike catalogue page
* Brand filtering
* Product search
* Product sorting by range, motor power, and battery size
* Product detail modal
* Colour variant display
* Stock availability display
* WhatsApp enquiry button for each bike
* Contact page with showroom locations
* SEO meta tags and Open Graph tags
* Structured data for local business/store information
* Dark mode toggle
* Fallback static catalogue data if the API is unavailable

### Bike Catalogue

The catalogue supports multiple electric bike brands, including:

* Exotic
* Pacific
* Larizz
* Saige
* Uwinfly
* Nuv

Each bike can include:

* Brand
* Model name
* Battery specification
* Motor specification
* Top speed
* Range
* Maximum weight
* Safety features
* Comfort level
* Description
* Stock quantity
* Colour variants
* Product image
* Price or contact-for-price display

### AI Bike Comparison

The catalogue includes an AI-assisted comparison feature that allows customers to select two bikes and describe their main usage needs.

The system compares the selected bikes based on:

* Battery
* Motor
* Range
* Top speed
* Safety features
* Comfort
* Customer usage needs

It then provides a short recommendation in Bahasa Indonesia to help customers choose the most suitable model.

### Admin Dashboard

The project includes an admin dashboard for business management.

Admin features include:

* Admin login
* Role-based access for admin and staff users
* Catalogue management
* Brand management
* Sales/invoice management
* Service record management
* User management
* Activity/audit log view
* Image upload support through Cloudflare R2 binding

## Tech Stack

### Frontend

* HTML
* CSS
* JavaScript

### Backend

* Cloudflare Pages Functions
* Cloudflare D1
* Cloudflare R2
* OpenAI API

### Deployment

* Cloudflare Pages
* Custom domain: `niagabersama.com`

## Project Structure

```text
bike-store-website/
├── admin.html
├── bikes.html
├── contact.html
├── index.html
├── wrangler.toml
├── css/
│   ├── admin.css
│   ├── admin-audit.css
│   ├── admin-bikes.css
│   ├── admin-brands.css
│   ├── admin-invoices.css
│   ├── admin-services.css
│   ├── admin-users.css
│   ├── bikes.css
│   ├── contact.css
│   ├── global.css
│   └── home.css
├── data/
│   └── bikes.json
├── functions/
│   ├── _shared/
│   │   └── auth.js
│   └── api/
│       ├── bikes.js
│       ├── brands.js
│       ├── compare-bikes.js
│       └── admin/
├── images/
│   ├── bikes/
│   ├── brands/
│   └── og/
└── js/
    ├── admin.js
    ├── admin-audit.js
    ├── admin-bikes.js
    ├── admin-brands.js
    ├── admin-core.js
    ├── admin-invoices.js
    ├── admin-partials.js
    ├── admin-services.js
    ├── admin-users.js
    ├── bike-modal.js
    ├── bike-service.js
    ├── bikes.js
    ├── data.js
    └── global.js
```

## Cloudflare Configuration

The project uses Cloudflare Pages with D1 and R2 bindings.

Example `wrangler.toml`:

```toml
name = "bike-store-website"
pages_build_output_dir = "."

[[d1_databases]]
binding = "BIKE_DB"
database_name = "bike-store-db"
database_id = "your-d1-database-id"

[[r2_buckets]]
binding = "BIKE_IMAGES"
bucket_name = "bike-store-images"
```

## Environment Variables

The project requires the following environment variables for admin authentication and AI comparison features:

```env
SESSION_SECRET=your-session-secret
OPENAI_API_KEY=your-openai-api-key
ADMIN_USERNAME=your-fallback-admin-username
ADMIN_PASSWORD=your-fallback-admin-password
```

These should be stored in Cloudflare Pages environment variables or in a local `.dev.vars` file during development.

Do not commit `.env`, `.dev.vars`, or secret files to GitHub.

## Local Development

Install Wrangler if it is not already installed:

```bash
npm install -g wrangler
```

Run the project locally:

```bash
wrangler pages dev .
```

The local development server will serve the static website and Cloudflare Pages Functions.

## API Overview

### Public APIs

| Endpoint             | Method | Description                                |
| -------------------- | -----: | ------------------------------------------ |
| `/api/bikes`         |    GET | Returns public bike catalogue data from D1 |
| `/api/brands`        |    GET | Returns active brand data from D1          |
| `/api/compare-bikes` |   POST | Compares selected bikes using OpenAI       |

### Admin APIs

The admin APIs are protected using bearer token authentication.

Admin functionality includes:

* Login and session verification
* Catalogue CRUD
* Brand CRUD
* Sales and invoice management
* Service record management
* User management
* Audit logging
* Image upload handling

## Security Notes

Current security features:

* Admin login
* Signed session token
* Session expiry
* Role-based permission checks
* Admin-only dashboard sections
* Protected admin API routes
* Secrets excluded through `.gitignore`

Recommended future improvements:

* Add Cloudflare Turnstile to the admin login form
* Add rate limiting for login attempts
* Use stronger password hashing with per-user salt
* Add stricter validation for admin form inputs
* Add more detailed audit logging for sensitive actions

## Future Improvements

Planned or recommended improvements:

* Remove duplicated bike colour and stock helper logic
* Consolidate shared frontend utilities
* Improve admin dashboard responsiveness
* Add image optimisation
* Add loading skeletons for catalogue cards
* Add product detail pages for better SEO
* Add customer enquiry tracking
* Add unit/integration tests for API functions
* Add database migration files
* Add screenshots to this README

## Portfolio Summary

This project demonstrates:

* Building a real business website from scratch
* Responsive frontend development with HTML, CSS, and JavaScript
* Dynamic catalogue rendering
* Cloudflare Pages deployment
* Serverless backend development with Cloudflare Pages Functions
* D1 database integration
* R2 storage binding
* Admin dashboard development
* Authentication and role-based access control
* OpenAI API integration for AI-assisted product comparison
* SEO and local business optimisation

## Author

Built by **Jason Leonard**.

GitHub: https://github.com/jason1511
