# Google Sheets & Apps Script Setup Guide
## Cruz Music Studio — Student Attendance Tracker

This guide shows you how to set up your Google Sheet database in **under 3 minutes** using the automated setup script.

---

### Step 1: Create a New Google Sheet
1. Go to [Google Sheets](https://sheets.google.com).
2. Create a blank spreadsheet and name it:
   **`Cruz Music Studio - Student Attendance Tracker`**

---

### Step 2: Open Google Apps Script Editor
1. In the top menu of your Google Sheet, click **Extensions** → **Apps Script**.
2. A new tab will open with a code editor.
3. Delete any default code inside `Code.gs`.
4. Open the file [`backend/Code.gs`](file:///h:/Projects/Cruz%20Music%20Studio%20Student%20Tracker/backend/Code.gs) from this project.
5. Copy all the code from `Code.gs` and paste it into the Google Apps Script editor.
6. Click the **Save** icon (disk icon or `Ctrl + S`).

---

### Step 3: Run the Auto-Initialize Function (One Click)
1. At the top of the Apps Script editor, look for the function dropdown (it usually says `myFunction` or `doGet`).
2. Select **`initializeStudioSheets`** from the dropdown.
3. Click **▷ Run**.
4. *First-time permission popup*: Google will ask for permission to edit this spreadsheet.
   - Click **Review permissions**.
   - Choose your Google account.
   - Click **Advanced** → **Go to Untitled project (unsafe)** (this is standard for your own personal script).
   - Click **Allow**.
5. Switch back to your Google Sheet tab. You will see that **all 4 tabs have been automatically created and styled**:
   - ⚙️ **Settings**: Studio name & Admin PIN (`9900`).
   - 🎵 **Teachers**: Pre-filled with 10 instructor rows, instruments, and 4-digit PINs.
   - 👨‍👩‍👧 **Families_Students**: Multi-sibling family rows with shared family PINs.
   - 📋 **Attendance**: Ready to receive real-time attendance logs.

---

### Step 4: Deploy as a Web App (API Endpoint)
1. In the Apps Script editor, click the blue **Deploy** button in the top right corner.
2. Select **New deployment**.
3. Click the gear icon (⚙️) next to "Select type" and choose **Web app**.
4. Configure the settings:
   - **Description**: `Cruz Music Studio Attendance API v1`
   - **Execute as**: `Me (your email)`
   - **Who has access**: **`Anyone`** *(Crucial: allows your website to securely record attendance and verify PINs without requiring parents to have a Google login)*.
5. Click **Deploy**.
6. Google will generate a **Web app URL** that looks like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
7. Click **Copy** to copy this URL.

---

### Step 5: Connect to the Web Portal
1. Open the Attendance Portal web app.
2. Enter the Admin PIN: **`9900`**.
3. Go to the **Google Sheet Connection** tab.
4. Paste your Web app URL into the input field and click **Save & Test Connection**.
5. You'll see a green checkmark: *"Connected to Google Apps Script successfully!"*.
