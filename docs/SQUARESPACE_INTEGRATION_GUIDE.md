# Squarespace Integration Guide
## Embedding the Student Attendance Tracker into `cruzmusicstudio.com`

Squarespace makes it straightforward to add interactive tools and portals. Here are the two best ways to embed your attendance tracker onto **cruzmusicstudio.com**.

---

### Option 1: Direct Squarespace Page Embed via Code Block (Recommended)

This method embeds the portal seamlessly into a dedicated page on your existing site (e.g. `cruzmusicstudio.com/tracker` or `cruzmusicstudio.com/attendance`).

#### Step 1: Create a New Page on Squarespace
1. Log into your Squarespace account for **cruzmusicstudio.com**.
2. Go to **Pages** in the left sidebar.
3. Under **Main Navigation** or **Not Linked** (if you only want it accessible via direct link or button), click the **+** icon.
4. Select **Blank Page**.
5. Title the page: `Student & Teacher Portal` (URL slug: `/tracker` or `/attendance`).

#### Step 2: Add a Code Block
1. Click **Edit** on your new page.
2. Click **Add Block** (or the blue `+` button in an empty section).
3. Select the **Code** block (`</>`).
4. Set the mode to **HTML** and ensure **Display Source** is turned **OFF**.
5. Paste the following iframe snippet:

```html
<div style="position: relative; width: 100%; min-height: 850px; overflow: hidden; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
  <iframe 
    src="https://iamdustins.github.io/Cruz-Music-Studio-Student-Tracker/frontend/index.html" 
    style="width: 100%; height: 900px; border: none; display: block;" 
    allow="clipboard-write"
    loading="lazy"
    title="Cruz Music Studio Attendance Tracker">
  </iframe>
</div>
```

*(Replace `https://YOUR-PORTAL-URL.pages.dev` with your hosted URL or Google Web App URL)*.

#### Step 3: Expand the Block Width
- In the Squarespace fluid engine grid, drag the edges of the Code Block so it spans the full width of the page.
- Save and publish your changes.

---

### Option 2: Deploying the Frontend for Free (Cloudflare Pages or GitHub Pages)

Hosting the static frontend (`frontend/index.html`, `styles.css`, `app.js`, `mockData.js`) on Cloudflare Pages, Netlify, or Vercel is **100% free forever** and gives you blazing fast load times under 0.2s with automatic SSL.

1. Drop the `frontend/` folder into Cloudflare Pages or Netlify.
2. It gives you a clean live URL (e.g. `cruz-music-tracker.pages.dev` or `tracker.cruzmusicstudio.com`).
3. You can either use that URL directly or embed it via the Squarespace Code Block above.

---

### Mobile Phone Experience for Parents & Teachers

- The portal has been built **mobile-first**:
  - Big 4-digit touch buttons for parents typing on iPhones / Androids.
  - Large single-tap status buttons (Attended, Late, Missed, Rescheduled) so instructors can log a class in under 5 seconds while standing at their instrument.
- Instructors and parents can bookmark `cruzmusicstudio.com/tracker` directly to their smartphone home screen like a native app.
