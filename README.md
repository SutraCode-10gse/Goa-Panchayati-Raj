# Goa Panchayati Raj Act Tracker - Interactive Web Application

This project is a premium, interactive legislative history tracker for the **Goa Panchayat Raj Act, 1994** and its subsequent amendments up to the latest 2025/2026 updates.

It enables users to browse chapters, search for provisions, compare legislative texts across different years with an aligned side-by-side or inline diff engine, and read the entire consolidated Act.

## Project Structure
- `index.html` - The application interface, structuring the dashboard, reader, explorer, timeline, and compare engine.
- `styles.css` - Custom CSS styling featuring a premium glassmorphic layout supporting both Light and Dark themes.
- `data.js` - Structured database containing the Act's chapters, sections, multi-version texts, and the timeline of amendments.
- `app.js` - Core controller managing application state, navigation, global search, and the line-level LCS (Longest Common Subsequence) diffing engine.

## Key Features

1. **Dashboard & Analytics**:
   - High-level counters (Chapters, Sections, Amendments, Latest Year).
   - Diagram illustrating the two-tier structure of local self-governance in Goa (Zilla Panchayats, Village Panchayats, Gram Sabhas).
   - Brief timeline highlights of recent amendments (2023, 2025, 2026).
   - Quick-access buttons to jump directly to highly-contested sections (Section 3, Section 47, Section 66, Section 72-A).

2. **Full Act Reader**:
   - A book-like continuous reading interface presenting the consolidated Act in its current form.
   - Quick toolbar to filter sections or search for terms (with automatic text highlights).
   - Inline badges indicating amended sections (e.g. `Amended (2025) - View History`). Clicking these badges immediately takes you to the comparison workspace.

3. **Act Explorer**:
   - Dual-panel layout with Chapter Table of Contents (collapsible tree menu) on the left and Section Details on the right.
   - Version toggle selector to read text as it existed in specific amendment periods.
   - Difference tracking toggle which dynamically highlights text additions (green) and deletions (red).
   - Dedicated notification history cards indicating what changed during each legislative update.

4. **Amendment Timeline**:
   - A vertical interactive timeline that maps major legislative milestones (1994, 1999, 2001, 2013, 2021, 2023, 2025, 2026).
   - Displays descriptions and summaries of key changes introduced by each amendment.
   - Lists sections affected during that year with direct links to view the diffs.

5. **Compare Engine**:
   - A dedicated sandbox to compare any two historical text versions of an amended section.
   - Support for **Inline (Track Changes)** view (additions/deletions inline).
   - Support for **Side-by-Side** layout aligning changes across two columns with synchronized scroll bars.

## How to Run the Application

Since this application is written in clean, vanilla web technologies (HTML5, CSS3, ES6+ JavaScript) with **zero external package dependencies**, you can run it instantly without compiling any code:

1. **Option A: Direct Browser Execution (Easiest)**
   - Simply double-click `index.html` (or drag and drop it into any web browser such as Chrome, Firefox, Safari, or Edge) to open it.

2. **Option B: Local Dev Server**
   - If you prefer running it via a local server (to avoid `file://` scheme restrictions or check performance):
     - Using VS Code: Right-click `index.html` and select **Open with Live Server**.
     - Using Python: Run `python -m http.server 8000` in the directory, then navigate to `http://localhost:8000`.
     - Using Node.js: Run `npx serve .` in the directory, then navigate to the local URL provided.

## How to Customize or Add Data
You can easily expand the Act's database by editing `data.js`:
- To add a new chapter, append to the `CHAPTERS` array.
- To add or update sections, find or append to the `SECTIONS` array. Include multiple version strings under the `versions` object matching amendment years to automatically enable diff tracking.
- To document a new amendment act, append to the `AMENDMENTS_TIMELINE` array.
