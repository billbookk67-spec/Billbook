# BillBook - Full-Stack Mobile Invoicing & Inventory App

BillBook is a full-stack, mobile invoicing and inventory catalog application. It features a modern onboarding screen (Google Sign-In Account Chooser, email Sign-Up, and email Log-In), real-time stock validations, interactive sales charts, and transaction-safe invoice updates.

This repository is structured as a **Full-Stack monorepo**:
*   `/www`: Mobile frontend web assets (HTML5, CSS3, Javascript).
*   `/android`: Capacitor wrapper code to run the frontend as a native mobile application.
*   `/backend`: Node.js + Express.js REST API backend with dual-mode database support.

---

## ⚡ Setup Guide for Manager's PC

Follow these steps to get both the mobile app and backend database server running on your computer.

### Prerequisites
Make sure you have the following installed:
*   [Node.js (v18 or higher)](https://nodejs.org/)
*   [Android Studio](https://developer.android.com/studio)
*   [Git](https://git-scm.com/)

---

### Step 1: Clone the Project
Open your command prompt or terminal and run:
```cmd
git clone https://github.com/nithies-png/Billing-app.git
cd Billing-app
```

---

### Step 2: Running the Backend Server (Optional)
The mobile app is pre-configured to connect to the live Render endpoint (`https://billing-app-ccvg.onrender.com`). However, if you want to inspect or run the backend server locally:

1. Navigate to the `/backend` folder:
   ```cmd
   cd backend
   ```
2. Install dependencies:
   ```cmd
   npm install
   ```
3. Start the server:
   ```cmd
   npm start
   ```
   *   **No DB Configuration Required**: The backend uses a **dual-mode database connector**. Since no `DATABASE_URL` environment variable is set locally, it will automatically connect to a local **SQLite database file** (`database.sqlite`) and initialize the tables for you instantly.

---

### Step 3: Run the App in Android Studio

To compile and launch the mobile application wrapper on an emulator or physical device:

1. Navigate back to the root folder of the project:
   ```cmd
   cd ..
   ```
2. Install the frontend dependencies:
   ```cmd
   npm install
   ```
3. Synchronize the web assets with the native Android folder:
   ```cmd
   npx cap sync
   ```
4. Open **Android Studio**.
5. Select **Open an Existing Project** and choose the **`android` subfolder** inside the cloned directory:
   `...\Billing-app\android`
6. Wait for the Gradle build and sync to complete (shown at the bottom-right corner).
7. Connect your phone via USB (with USB Debugging enabled) or start a virtual device (AVD Emulator).
8. Click the green **Run (Play)** button in Android Studio to install and run the app on the device!

---

### 📱 Viewing the App in the Web Browser (Without Android Studio)
If you do not want to use Android Studio, you can view the mobile layout directly in Google Chrome:

1. Run this in your terminal inside the root project directory:
   ```cmd
   npx serve www
   ```
2. Open the URL shown (e.g. `http://localhost:3000`) in Chrome.
3. Press `F12` (or right-click and click **Inspect**).
4. Click the **Device Toggle Icon** (mobile view icon at the top of the DevTools panel) and select a phone size (like iPhone or Pixel) to experience the app interface.
