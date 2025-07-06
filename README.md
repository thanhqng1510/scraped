# Project: Bing Search Scraper

## Table of Contents

- [1. Overview](#1-overview)
- [2. Features](#2-features)
- [3. System Design & Architecture](#3-system-design--architecture)
- [4. Technical Stack](#4-technical-stack)
- [5. RESTful API](#5-restful-api)
- [6. Scraping Strategy](#6-scraping-strategy)
- [7. Getting Started (Local Development)](#7-getting-started-local-development)
- [8. Future Enhancements](#8-future-enhancements)

## 1. Overview

This web application allows authenticated users to upload a list of keywords in a CSV file. The system will then scrape the first page of Bing search results for each keyword, extracting key metrics. The results are stored and made available to the user in near real-time.

The application also provides a full-featured REST API with API Key authentication for programmatic access.

## 2. Features

### User Facing
-   **UI:** Modern Angular application
-   **Authentication:** Secure user sign-up and sign-in powered by Firebase Authentication.
-   **Keyword Upload:** Authenticated users can upload a CSV file containing 1-100 keywords.
-   **Dashboard:** View a list of all uploaded keywords, their current scraping status (Pending, In Progress, Complete, Failed), updated in real time.
-   **Detailed Report View:** For each keyword, view the detailed scraped data:
    -   Total ad count.
    -   Total link count.
    -   **HTML Viewer:** View the raw HTML of the scraped page, or a rendered preview.
-   **Search:** A global search bar to find relevant data across all scraping attempts.

### Backend & System
-   **Asynchronous Processing:** Keyword scraping is handled by background jobs to ensure the UI remains responsive.
-   **Scraping Engine:** Scraping mechanism is designed to handle failures and evade basic anti-scraping detection.
-   **Data Persistence:** All user data, keywords, and results are stored securely in a PostgreSQL database.
-   **Realtime notification:** Progress is pushed to client via Server Sent Event.
-   **RESTful API:** Endpoints for programmatic access to the application's features.

## 3. System Design & Architecture

**Components:**

1.  **Web Server (Node.js/Express):** A Node.js application using the Express.js framework serves as the main entry point. It handles:
    *   Verifying user identity by validating Firebase ID Tokens.
    *   Generate JWT token.
    *   Handling the CSV file upload.
    *   Providing the API endpoints to the front end for fetching keyword and result data.

2.  **Web UI (Angular):** A single page application using Angular, communicating with the backend solely via API.

3.  **Background Job Processor (BullMQ & Redis):** To prevent the scraping process from blocking web requests and to handle processing immediately, I use BullMQ.
    *   When a user uploads a CSV, the Express app will parse it and enqueue one background job per keyword.
    *   BullMQ workers will pick up these jobs from a Redis queue and execute the scraping task independently of the web server.

4.  **Scraping Service:** For a given keyword, it will:
    *   Launch a headless browser instance (using Puppeteer).
    *   Configure the browser to use a proxy from a pool.
    *   Use `puppeteer-extra` with a set of plugins (`puppeteer-extra-plugin-stealth`, `puppeteer-extra-plugin-proxy`) to apply a suite of patches that make the headless browser significantly harder to detect.
    *   Open a new page and set a random user-agent.
    *   Navigate to the Bing search URL.
    *   Wait for the page and necessary content to fully render, executing JavaScript.
    *   Extract the page's final HTML and parse it with Cheerio to find the required data.
    *   On failure (e.g., navigation timeout, CAPTCHA page), it will handle the error and schedule a retry with a backoff strategy.

5.  **Database (PostgreSQL):** The single source of truth for all persistent data.
    *   **Schema:** Includes tables for `User`, `Keyword`, `ApiKey` and `ScrapeAttempt`. The `ScrapeAttempt` table is crucial as it stores the results of every individual scraping attempt (successful or failed), including the raw HTML, status, and any errors. This provides a detailed audit trail for each keyword. Support full text search also.

6.  **Proxy Service (External):** A third-party proxy rotation service to avoid IP-based blocking.

7.  **Real-time Layer (Server Sent Event):** Using `EventSource`, the Express server maintains a persistent connection with the client's browser. When a background job completes, it will notify the web server, which will then push the updated data directly to the user.

8.  **Configuration Management:** All configuration (database URLs, API keys, etc.) is loaded from environment variables. The application uses `zod` to validate these variables on startup, ensuring that the application fails fast if any required configuration is missing or malformed.

## 4. Technical Stack

| Category | Technology |
| - | - |
| Backend | Node.js, Typescript, Express |
| ORM | Prisma |
| Frontend | Angular, SCSS |
| Database | PostgreSQL |
| Async Jobs | BullMQ and Redis |
| Authentication | Firebase Authentication |
| Browser Automation | Puppeteer |
| HTML Parsing | Cheerio |
| Testing | Jest, supertest |

## 5. RESTful API

The application provides a RESTful API for programmatic access. All API endpoints are prefixed with `/api/v1` and require authentication.

### API Authentication

For server-to-server communication or scripts. These are long-lived tokens that can be generated and managed through the web UI.

**Step 1: Generate an API Key**

1.  Sign into your account on the web application.
2.  Navigate to the Account page.
3.  Generate a new API key. Give it a descriptive name (e.g., "My Reporting Script").
4.  Securely copy the generated key. **You will only be shown this key once.**

**Step 2: Use the API Key to Make API Requests**

1. Include your API key in the `Authorization` header with the `Api-Key` scheme for every request.

    `Authorization: Api-Key <YOUR_GENERATED_API_KEY>`

### API Endpoints

#### Keyword Management
*   **`POST /api/v1/keywords/upload`**
    *   Uploads a CSV file of keywords for scraping.
    *   **Body:** `multipart/form-data` with a single field `keywords_file` containing the CSV.
    *   **Response:** `202 Accepted` with a list of the newly created keyword records.

*   **`GET /api/v1/keywords`**
    *   Retrieves a list of all keywords submitted by the authenticated user.
    *   **Response:** `200 OK` with a JSON array of keyword objects.

*   **`GET /api/v1/keywords/:id`**
    *   Retrieves the detailed status and scrape results for a single keyword.
    *   **Response:** `200 OK` with a JSON object for the specified keyword, including an array of all its `scrapeAttempts`.

*   **`POST /api/v1/apikeys`**
    *   Create a new API key for the authenticated user.
    *   **Body:** `application/json` with a `name` field and `expiredInDays` field.
    *   **Response:** `201 Created` with a JSON object containing the newly created API key.

*   **`GET /api/v1/apikeys`**
    *   Retrieves a list of all API keys for the authenticated user. For security, only a portion of each key is returned.
    *   **Response:** `200 OK` with a JSON array of API key objects.

*   **`PATCH /api/v1/apikeys/:id/revoke`**
    *   Revokes an API key by setting its expiration date to the current time.
    *   **Response:** `204 No Content`.

## 6. Scraping Strategy

1.  **Proxy Rotation:** Integrate with a proxy provider. For each request, a new IP address will be used.
2.  **User-Agent Rotation:** Maintain a list of real-world browser user-agents (Chrome, Firefox, Safari on Desktop/Mobile). A random one will be sent with each request.
3.  **Request Throttling & Jitter:** Introduce a small, random delay (1-3 seconds) between requests from the same worker to mimic human browsing patterns.
4.  **Error Handling:**
    *   For every attempt (including retries), a `ScrapeAttempt` record is created. A failed attempt will have its error message and status stored in this record.
    *   A retry mechanism exponential backoff is used via BullMQ. The job will be re-enqueued for another attempt.
    *   After 10 retries, if all attempts have failed, the parent `Keyword` status will be marked as `failed` in the database.

## 7. Getting Started (Local Development)

Follow these instructions to get the project running on the local machine for development and testing purposes.

### Prerequisites
-   Docker and Docker Compose
-   A Firebase project for authentication.

### Setup

1.  **Configure Backend Environment:**
    Check the `docker-compose.yaml` file in the root directory and enter the nessessary environment variables.

    Place the `firebase-service-account.json` file in the `server` directory.

2.  **Launch Services with Docker:**
    From the project root, start the whole stack.
    ```bash
    docker-compose up -d
    ```

3.  **Run Database Migrations:**
    Apply the database schema using Prisma.
    ```bash
    docker-compose exec backend npx prisma migrate deploy
    ```

The application should now be running. The Angular frontend will be available at `http://localhost:4200` and the Express backend at `http://localhost:3000`.

## 8. Future Enhancements
- Social logins.
- Redis cache for API-Key authentication.
