# BigQuery Release Notes Explorer

A modern, high-performance web dashboard built with **Python Flask** and **Vanilla HTML, CSS, and JavaScript** that fetches, parses, filters, and shares Google Cloud BigQuery release notes.

The application automatically parses Google's Atom feed, splits multi-topic daily logs into individual release cards, and features an interactive X (Twitter) Composer mockup to preview and tweet updates within character limits.

---

## 🚀 Key Features

* **Granular Feed Parsing**: Splits single daily release notes containing multiple items (such as features, changes, and fixes) into individual, searchable, and shareable cards.
* **Smart Server Caching**: Saves memory-cached feed copies for 10 minutes to minimize network latency and respect external feed rate limits.
* **Forced Refresh**: A refresh button with a CSS loading spinner that forces the backend to bypass the cache and query Google directly.
* **Dynamic Search & Filtering**:
  * Client-side full-text search matching titles, categories, dates, and update text.
  * Category tag filters (**All**, **Features**, **Changes**, **Fixes**, **Deprecations**) with instant grid rendering.
* **Interactive X (Twitter) Composer**:
  * Native X-looking layout mockup complete with user avatar, name, and verified badge.
  * Auto-truncation limits to ensure the composed text fits X's 280-character boundary.
  * Real-time circular progress ring and character counter.
  * Easy insertion suggestion tags (`#BigQuery`, `#GoogleCloud`, `#BigQueryML`).
  * Direct linkage to X Web Intent (`https://twitter.com/intent/tweet`).

---

## 📁 Project Structure

* **`app.py`**: Python Flask backend. Handles XML fetching (`urllib`), HTML parsing (`xml.etree`), content cleaning (`re` and `html`), caching, and API routing.
* **`templates/index.html`**: Core HTML document. Structures the dashboard header, connection badges, stats widgets, search fields, note grids, and the modal dialog composer.
* **`static/css/styles.css`**: CSS stylesheet implementing a sleek dark mode, glowing accents based on update type, glassmorphic layouts, animations, and responsiveness.
* **`static/js/app.js`**: Frontend JavaScript logic. Directs API requests, handles search/filtering logic, updates counter badges, and controls modal transitions.
* **`.gitignore`**: Excludes Python virtual environments, compiled bytecode, editor configurations, and macOS cache logs.

---

## 🔧 Local Installation & Run Guide

### Prerequisites
* Python 3.9+ installed on your machine.
* Git.

### 1. Clone the Repository
```bash
git clone https://github.com/aajusah98/bq-releases-note-event-talks-app.git
cd bq-releases-note-event-talks-app
```

### 2. Set Up a Virtual Environment
Create and activate a virtual environment to isolate project dependencies:

**On macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**On Windows:**
```cmd
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install flask requests
```

### 4. Start the Application
Run the Flask server:
```bash
python app.py
```

The web server will boot on port `8080`. Open your browser and navigate to:
👉 **[http://127.0.0.1:8080](http://127.0.0.1:8080)**

---

## 🎨 Visual Aesthetics & Layout
The dashboard leverages modern visual standards:
* **Typography**: Outfit (headings) and Inter (body) Google Fonts.
* **Glassmorphism**: Backdrop blur (`backdrop-filter`) filters combined with semi-translucent gray-slate backgrounds.
* **Categorical Borders**: Emerald left borders for Features, Blue for Changes, Amber for Fixes, Crimson for Deprecations, and Violet for Updates.
* **Micro-Animations**: Translation effects (`translateY`) and scale transformations when interacting with cards and buttons.
