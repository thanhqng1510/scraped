# Project: Bing Search Scraper

This document describes the plan, architecture, and technical details for the Bing Search Scraper web application.

## 1. Overview

This web application allows authenticated users to upload a list of keywords in a CSV file. The system will then scrape the first page of Bing search results for each keyword, extracting key metrics. The results are stored and made available to the user in near real-time.

The core challenge is to perform this scraping at scale while navigating Bing's anti-bot measures.

## 2. Features

### User Facing
-   **Authentication:** Secure user sign-up and sign-in powered by Firebase Authentication (supports email/password and social logins).
-   **Keyword Upload:** Authenticated users can upload a CSV file containing 1-100 keywords.
-   **Dashboard:** View a list of all uploaded keywords, their current scraping status (Pending, In Progress, Complete, Failed).
-   **Detailed Report View:** For each keyword, view the detailed scraped data:
    -   Total Ad count.
    -   Total link count.
    -   **HTML Viewer:** View the scraped page's HTML, with options for raw text view or rendered view.
-   **Search:** A global search bar to find specific keywords across all user reports.

### Backend & System
-   **Asynchronous Processing:** Keyword scraping is handled by background jobs to ensure the UI remains responsive.
-   **Scraping Engine:** Scraping mechanism is designed to handle failures and evade basic anti-scraping detection.
-   **Data Persistence:** All user data, keywords, and results are stored securely in a PostgreSQL database.
-   **RESTful API:** Endpoints for programmatic access to the application's features.

## 3. System Design & Architecture

**Components:**

1.  **Web Server (Node.js/Express):** A Node.js application using the Express.js framework serves as the main entry point. It handles:
    *   Verifying user identity by validating Firebase ID Tokens.
    *   Handling the CSV file upload.
    *   Providing the API endpoints to the front end for fetching keyword and result data.

2.  **Web UI (Angular):** A single page application using Angular, communicating with the backend solely via API.

2.  **Background Job Processor (BullMQ & Redis):** To prevent the scraping process from blocking web requests and to handle processing immediately, I use BullMQ.
    *   When a user uploads a CSV, the Express app will parse it and enqueue one background job per keyword.
    *   BullMQ workers will pick up these jobs from a Redis queue and execute the scraping task independently of the web server.

3.  **Scraping Service:** For a given keyword, it will:
    *   Launch a headless browser instance (using Puppeteer).
    *   Configure the browser to use a proxy from a pool.
    *   Use `puppeteer-extra` with a set of plugins (`puppeteer-extra-plugin-stealth`, `puppeteer-extra-plugin-proxy`) to apply a suite of patches that make the headless browser significantly harder to detect.
    *   Open a new page and set a random user-agent.
    *   Navigate to the Bing search URL.
    *   Wait for the page and necessary content to fully render, executing JavaScript.
    *   Extract the page's final HTML and parse it with Cheerio to find the required data.
    *   On failure (e.g., navigation timeout, CAPTCHA page), it will handle the error and schedule a retry with a backoff strategy.

4.  **Database (PostgreSQL):** The single source of truth for all persistent data.
    *   **Schema:** Includes tables for `User`, `Keyword`, `ApiKey` and `ScrapeAttempt`. The `ScrapeAttempt` table is crucial as it stores the results of every individual scraping attempt (successful or failed), including the raw HTML, status, and any errors. This provides a detailed audit trail for each keyword.

5.  **Proxy Service (External):** A third-party proxy rotation service to avoid IP-based blocking.

6.  **Real-time Layer (Server Sent Event):** Using `EventSource`, the Express server maintains a persistent connection with the client's browser. When a background job completes, it will notify the web server, which will then push the updated data directly to the user.

7.  **Configuration Management:** All configuration (database URLs, API keys, etc.) is loaded from environment variables. The application uses `zod` to validate these variables on startup, ensuring that the application fails fast if any required configuration is missing or malformed.

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

The API supports two methods of authentication:

1.  **API Keys:** For server-to-server communication or scripts. These are long-lived tokens that can be generated and managed through the web UI.
2.  **Firebase ID Tokens:** For the web UI communication where a user is signed in. These are short-lived JSON Web Tokens (JWTs) issued by Firebase.

#### Method 1: Using an API Key

**Step 1: Generate an API Key**

1.  Sign into your account on the web application.
2.  Navigate to the Account page.
3.  Generate a new API key. Give it a descriptive name (e.g., "My Reporting Script").
4.  Securely copy the generated key. **You will only be shown this key once.**

**Step 2: Use the API Key to Make API Requests**

1. Include your API key in the `Authorization` header with the `Api-Key` scheme for every request.

    `Authorization: Api-Key <YOUR_GENERATED_API_KEY>`

#### Method 2: Using a Firebase ID Token

**Step 1: Obtain a Firebase ID Token**

1. After a user signs in to your client application using the Firebase SDK, the application will retrieve the ID token for the current user.

**Step 2: Use the Token to Make API Requests**

1. Include the Firebase ID token in the `Authorization` header with the `Bearer` scheme for every request.

    `Authorization: Bearer <FIREBASE_ID_TOKEN>`

2. The server will validate this token with Firebase to authenticate the request.

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
    *   Retrieves a list of all API keys of the authenticated user.
    *   **Response:** `200 OK` with a JSON array of API key objects.

*   **`PATCH /api/v1/apikey/:id/revoke`**
    *   Revokes an API key.
    *   **Response:** `202 Accepted`.

## 6. Scraping Strategy

1.  **Proxy Rotation:** Integrate with a proxy provider. For each request, a new IP address will be used.
2.  **User-Agent Rotation:** Maintain a list of 20+ real-world browser user-agents (Chrome, Firefox, Safari on Desktop/Mobile). A random one will be sent with each request.
3.  **Request Throttling & Jitter:** Introduce a small, random delay (1-3 seconds) between requests from the same worker to mimic human browsing patterns.
4.  **Error Handling:**
    *   If a request returns a non-200 status code or the HTML indicates a CAPTCHA, the job will fail.
    *   For every attempt (including retries), a `ScrapeAttempt` record is created. A failed attempt will have its error message and status stored in this record.
    *   A retry mechanism exponential backoff is used via BullMQ. The job will be re-enqueued for another attempt.
    *   After 10 retries, if all attempts have failed, the parent `Keyword` status will be marked as `failed` in the database.

## 7. Testing

To ensure code quality, reliability, and maintainability, the project uses **Jest** as the primary testing framework.

### Testing Layers

1.  **Unit Tests:** To test the smallest, isolated parts of the application (e.g., individual functions, classes, or modules).

2.  **Integration Tests:** To verify that different components of the system work together as expected, the project uses `supertest` for testing Express API endpoints and set up a separate test database to run tests.

3.  **End-to-End (E2E) Tests (Future Scope):** To simulate a full user journey from the browser to the backend and back.
