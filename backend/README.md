# BillBook Backend - REST API Server

This is the backend server for the BillBook Invoicing App. It is built using **Node.js**, **Express.js**, and a zero-configuration **SQLite database**. It manages invoices, clients, product inventory, and transaction calculations securely, enforcing data relationships and inventory levels.

---

## 🚀 Local Setup & Installation

To run this backend server locally:

### Step 1: Navigate to the backend directory
Open your command prompt and run:
```bash
cd "C:\Users\nithi\.gemini\antigravity\scratch\billbook-mobile-app\backend"
```

### Step 2: Install dependencies
Install the required packages:
```bash
npm install
```

### Step 3: Run the Server
*   **For Development (with Auto-Reload):**
    ```bash
    npm run dev
    ```
*   **For Production:**
    ```bash
    npm start
    ```

The server will start on **`http://localhost:5000`** and automatically create a database file named **`database.sqlite`** in the `backend/` folder.

---

## 🗄️ Database Schema Details (SQLite)
The server auto-initializes the database with four tables:
1.  **`profile`**: Stores company branding, address, tax IDs, and currency.
2.  **`products`**: Manages product items, SKUs, unit prices, GST rates, and stock.
3.  **`customers`**: Holds client contact details and addresses.
4.  **`invoices`**: Records generated invoices, payments, and aggregates. Invoice items are stored as structured JSON arrays inside a single text field for portability.

---

## ☁️ Cloud Deployment Guide (Step-by-Step)

Here are the instructions to host this backend server on **Render** (which has a free tier and is the easiest to set up).

### Option A: Hosting with SQLite (Free Tier with Persistent Disk)
Since SQLite stores data in a file (`database.sqlite`), you must configure Render to preserve this file across restarts using a **Persistent Disk**.

1.  **Push code to GitHub**: Create a repository on GitHub and push the `billbook-mobile-app` project.
2.  **Create Render Web Service**:
    *   Sign in to [Render](https://render.com/).
    *   Click **New +** ➡️ **Web Service**.
    *   Connect your GitHub repository.
3.  **Configure Service Details**:
    *   **Name**: `billbook-backend` (or a name of your choice).
    *   **Root Directory**: `backend` (Important! This tells Render to only look inside the backend folder).
    *   **Runtime**: `Node`.
    *   **Build Command**: `npm install`.
    *   **Start Command**: `node server.js`.
4.  **Add a Persistent Disk**:
    *   In the Web Service settings, scroll down to the **Disks** section.
    *   Click **Add Disk**.
    *   **Name**: `database-disk`.
    *   **Mount Path**: `/data`.
    *   **Size**: `1 GB` (free).
5.  **Configure Environment Variable**:
    *   Go to the **Environment** tab.
    *   Add a variable: `PORT = 10000` (Render's default port).
6.  **Deploy**: Click **Deploy Web Service**. Render will build and launch your backend!

*Note: If you use the Mount Path `/data`, ensure you modify the database path in `database.js` to point to `/data/database.sqlite` on production (or set it via environment variables).*

---

### Option B: Hosting with PostgreSQL (Production Standard)
If you want to use a fully managed PostgreSQL database instead of a local SQLite file:

1.  **Create PostgreSQL DB on Render**:
    *   In Render Dashboard, click **New +** ➡️ **PostgreSQL**.
    *   Name it and copy the **Internal Database URL**.
2.  **Connect in Code**:
    *   Change the database connection logic in `database.js` to connect to PostgreSQL using the `pg` client instead of the `sqlite3` driver.
3.  **Provide the Connection String**:
    *   In your Web Service environment variables on Render, add a variable named `DATABASE_URL` and paste the connection string.
