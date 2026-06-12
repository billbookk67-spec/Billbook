# BillBook - Premium Invoicing & Billing Mobile Application

BillBook is a high-fidelity, offline-first billing and inventory management mobile application designed for modern SMEs. It offers an elegant, high-performance interface with key features including dynamic invoicing, invoice printing/PDF generation, inventory tracking, client database management, interactive SVG charting, and full backup import/export utilities.

This repository contains all the necessary source files and configurations to run the app in a browser and package it into a fully functional Android APK using **Capacitor**.

---

## 📂 Project Structure

```text
billbook-mobile-app/
├── capacitor.config.json    # Capacitor configuration
├── package.json              # Project dependencies and script runner
├── README.md                 # Project documentation (this file)
└── www/                      # Web application folder (compiled assets)
    ├── index.html            # Main markup and page layout
    ├── styles.css            # Custom CSS variables, grid layouts, print stylesheet
    └── app.js                # Router, local database, invoicing engine, SVG charting
```

---

## ⚡ Quick Start: Run Locally in the Browser

Since the application is built using standard web technologies with no heavy build systems, you can run it immediately on any device.

### Method 1: Direct File Launch
Double-click `www/index.html` on your computer to open it directly in Google Chrome, Microsoft Edge, or Safari. It works instantly!

### Method 2: Serve Locally (Optional but Recommended)
If you have Node.js installed, open a command prompt inside the project folder and run:
```bash
npm install
npm start
```
You can also run a simple local web server using Python or VS Code Live Server:
*   **Python 3:** `python -m http.server 8000` (then open `http://localhost:8000/www/`)
*   **VS Code:** Right-click `www/index.html` and click **"Open with Live Server"**.

---

## 🤖 APK Conversion Guide (Using Capacitor)

To package BillBook into an Android APK, follow these steps. You will need **Node.js** and **Android Studio** installed on your development machine.

### Step 1: Install Dependencies
Open a terminal in the project root directory (`billbook-mobile-app/`) and run:
```bash
npm install
```
This installs the Capacitor core and CLI tools.

### Step 2: Initialize Capacitor (If not already initialized)
Run the following command to link the project to your app identity:
```bash
npx cap init BillBook com.billbook.app --web-dir=www
```
*(`capacitor.config.json` is pre-configured, so you can skip this step or run it to re-initialize).*

### Step 3: Add the Android Platform
Initialize the native Android project folder:
```bash
npx cap add android
```
This generates a native Android Studio project folder inside `android/` linked to your web assets in `www/`.

### Step 4: Sync Web Code to Android Project
Every time you make edits to files inside the `www/` folder, run this sync command to copy updates into the Android build folder:
```bash
npx cap sync
```

### Step 5: Build the APK in Android Studio
1.  Open the native project inside Android Studio:
    ```bash
    npx cap open android
    ```
2.  Wait for Android Studio to index and run Gradle sync (this may take a few minutes on first run).
3.  In Android Studio's top menu, go to:
    **Build** ➡️ **Build Bundle(s) / APK(s)** ➡️ **Build APK(s)**.
4.  Once compiled, a notification popup will appear in the bottom-right corner. Click **"locate"** to open the folder containing your brand new `app-debug.apk` file!
5.  Transfer the `app-debug.apk` file to your mobile phone and install it.

---

## 🛠️ Offline-First Architecture & Storage

*   **Database**: All data (invoices, products, clients, profile settings) is stored locally on the device using standard browser `localStorage`. No internet connection is required.
*   **Backup / Restore**: In the **Settings** panel, you can click **Export Data (JSON)** to download a complete backup file of your database, or **Import Data (JSON)** to restore database tables on a new device.
*   **Demo Mode**: Click **Load Demo Data** under Settings to pre-fill the dashboard with sample invoices, low-stock warnings, and clients to test out the application flows immediately.
