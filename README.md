# Cruz Music Studio — Student Attendance Tracker

A streamlined, mobile-responsive attendance tracking system designed for **Cruz Music Studio** (`cruzmusicstudio.com`).

Built specifically for:
- **10 Instructors** tracking daily lessons with single-tap buttons (Attended, Late, Missed, Rescheduled).
- **~200 Students / Families** logging in with a shared **4-digit Family PIN** to view all enrolled siblings' lesson progress and practice notes.
- **Studio Administration** maintaining full control via Google Sheets and the Admin Dashboard.
- **Zero Database Fees**: Runs on **Google Sheets** via **Google Apps Script**.
- **Squarespace Integration**: Seamlessly embeddable onto `cruzmusicstudio.com/tracker`.

---

## Quick Start: Test the App Locally

To launch a local preview right now:

```powershell
# Using Python
python -m http.server 8080 -d frontend

# Or using Node (npx)
npx serve frontend
```

Then open your browser to `http://localhost:8080`.

### Pre-loaded Demo PINs for Testing:
- **Family PIN (2 Siblings)**: `4421` (Maria Miller — Leo & Maya Miller)
- **Instructor PIN**: `1102` (Sarah Jenkins — Piano & Voice)
- **Studio Admin PIN**: `9900` (Full Studio Overview & PIN generator)

---

## Project Structure

```
Cruz Music Studio Student Tracker/
├── backend/
│   └── Code.gs                       # Full Google Apps Script API & auto-init setup
├── frontend/
│   ├── index.html                    # Main responsive web portal
│   ├── styles.css                    # Cruz Music Studio branded CSS
│   ├── app.js                        # Client state engine & PIN authentication
│   └── mockData.js                   # Sample demo data (10 teachers, families, logs)
└── docs/
    ├── GOOGLE_SHEETS_SETUP_GUIDE.md  # 3-minute Google Sheet & Apps Script guide
    └── SQUARESPACE_INTEGRATION_GUIDE.md # Step-by-step Squarespace embedding instructions
```

---

## Documentation Links
- [Google Sheets Setup Guide](file:///h:/Projects/Cruz%20Music%20Studio%20Student%20Tracker/docs/GOOGLE_SHEETS_SETUP_GUIDE.md)
- [Squarespace Integration Guide](file:///h:/Projects/Cruz%20Music%20Studio%20Student%20Tracker/docs/SQUARESPACE_INTEGRATION_GUIDE.md)
- [System Architecture Document](file:///C:/Users/iamdustins/.gemini/antigravity/brain/71a97848-bab6-4a92-bbc9-e13512b27daf/Cruz_Music_Studio_Tracker_Architecture.md)
