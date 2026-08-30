# Sankar Karanam — Founder Platform & Publishing CMS

> **Personal Brand Website, Venture Portfolio, Daily Publishing Engine & Authenticated CMS**  
> Built for Serial Entrepreneur & Builder **Sankar Karanam** (Founder of OruMind, Creators Club, Worke, and AdPresence).

---

## 🌟 Overview

This repository contains the complete production code for **sankarkaranam.com**, combining an ultra-fast, luxury executive frontend design with a centralized REST API backend, server-side PBKDF2 authentication, and automated Static Site Generation (SSG) for 100% search-engine indexability.

---

## 🚀 Key Features

### 1. 🎨 Executive Brand Frontend
* **Modern Executive Theme**: Custom design tokens, fluid typography, high-contrast readability.
* **3D Particle Hero Canvas**: Interactive Three.js particle constellation reacting to pointer dynamics.
* **1% Growth Calculator**: Interactive mathematical compounding tool ($1.01^{365} = 37.78\times$).
* **Full Portfolio Suite**:
  * **Homepage** (`/index.html`): Hero, credibility belt, ventures, journal grid, quote rotator.
  * **About Sankar** (`/about.html`): Founder narrative, 6-pillar expertise matrix, philosophy, book highlight.
  * **Ventures** (`/ventures/index.html`): OruMind, Creators Club, Worke, and AdPresence showcase.
  * **Milestone Journey** (`/journey/index.html`): Vertical timeline of company foundings, exits, and milestones.
  * **Projects** (`/projects/index.html`): Detailed case studies and venture outcomes.
  * **Media & Press** (`/media/index.html`): Press appearances, keynote archives, downloadable media kit.
  * **Contact** (`/contact/index.html`): Ingestion form with reason routing.
  * **Newsletter** (`/newsletter/index.html`): Subscription landing page.

### 2. ⚡ Production REST API & Backend
* **Centralized Data Store**: Transactional persistence in `data/db.json` with write-ahead locks and automatic snapshot backups.
* **Cryptographic Security**: PBKDF2-HMAC-SHA256 password hashing with unique salt and 256-bit session tokens.
* **Server-Side Authorization**: Every admin mutation strictly verifies session bearer tokens on the server (HTTP 401/403).
* **Public Ingestion API**:
  * `POST /api/contact`: Form submission ingestion directly into the founder's centralized database.
  * `POST /api/newsletter`: RFC-5322 email validation, duplicate prevention, and subscriber tracking.
  * `POST /api/posts/{id}/clap`: Atomic reaction increments.

### 3. 🔍 Automated SSG & SEO Architecture
* **Server-Side Static Generation**: When an article is published in the CMS, the backend automatically generates the complete static HTML file at `journal/[slug].html` with full initial HTML and Schema.org `BlogPosting` JSON-LD.
* **Dynamic Sitemap & RSS Engine**: Automatically updates `sitemap.xml` and `rss.xml` on disk upon every publish or delete event.
* **Robots Directives**: Clean `robots.txt` protecting `/admin/` while exposing public routes to search engine crawlers.

### 4. 🎛️ Authenticated Admin CMS
* **Editor**: Rich text editor (Quill.js) with real-time SEO scoring, word counters, SERP previews, and automated revision history.
* **Command Center**: Dashboard tracking live metrics (published posts, drafts, unread contact messages, subscribers, and total page views).
* **Data Management**: Full CRUD interfaces for Ventures, Journey Milestones, Media Library, and quote-escaped CSV subscriber exports.

---

## 🛠️ Quick Start & Local Execution

To start the local production server:

```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```

* **Public Website**: `http://localhost:8080/`
* **Admin CMS Portal**: `http://localhost:8080/admin/`
* **REST API Root**: `http://localhost:8080/api/`

---

## 🔒 Default Admin Credentials

* **Username / Email**: `admin` or `sankarkaranam7@gmail.com`
* **Default Password**: `SecurePassword123!`  
*(Can be updated directly in the Admin Settings via the server password change endpoint).*

---

## 📁 Repository Structure

```
├── admin/                  # Authenticated CMS administration pages
│   ├── index.html          # Admin Dashboard & KPIs
│   ├── editor.html         # Post Editor with SEO scoring
│   ├── posts.html          # Post Management Table
│   ├── contacts.html       # Lead & Inquiry Inbox
│   ├── newsletter.html     # Subscriber Management & CSV Export
│   ├── ventures.html       # Venture Portfolio Manager
│   └── settings.html       # Global Configuration Manager
├── assets/                 # Brand logos, portraits, and media assets
├── css/                    # Modular Design System
│   ├── design-system.css   # Color palette, spacing, typography tokens
│   ├── components.css      # Reusable UI component styles
│   └── admin.css           # Admin dashboard & CMS styles
├── data/                   # Centralized Database
│   └── db.json             # Relational JSON database
├── js/                     # Application JavaScript
│   ├── cms.js              # REST API Client
│   ├── nav.js              # Header, navigation, search modal, footer
│   ├── home.js             # Homepage controller & 1% calculator
│   ├── three-hero.js       # 3D interactive hero mesh
│   └── admin/auth.js       # Admin authentication handler
├── journal/                # Articles & Pre-rendered SEO HTML Pages
├── contact/                # Contact routing page
├── newsletter/             # Newsletter subscription page
├── ventures/               # Venture portfolio showcase
├── journey/                # Milestone timeline
├── projects/               # Project portfolio
├── media/                  # Press kit & media appearances
├── sitemap.xml             # Dynamic XML sitemap
├── robots.txt              # Crawler directives
├── rss.xml                 # RSS 2.0 Syndication feed
└── server.ps1              # Production HTTP server, API & SSG engine
```

---

## 👤 Founder Profile

**Sankar Karanam**  
*Serial Entrepreneur & Builder*  
* **Ventures**: [OruMind](http://orumind.com/), [Creators Club](https://creatorsclub.co.in/), [Worke](http://worke.in/), [AdPresence](http://adpresence.in/)  
* **Author**: *Ethical Hacking: A Comprehensive Guide*  
* **LinkedIn**: [linkedin.com/in/sankarkaranam7](https://www.linkedin.com/in/sankarkaranam7/)  
* **Email**: `sankarkaranam7@gmail.com`  
* **WhatsApp**: `+91 88855 94123`
