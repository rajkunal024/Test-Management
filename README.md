# Parikshya Test Management System

A high-performance, workspace-driven web application featuring a native **Node.js HTTP backend** (built completely from scratch with zero external framework dependencies like Express) and a modern, glassmorphic **React SPA frontend**. Designed for real-time exam administration, multi-role workspace management, automated proctoring with live teacher monitoring, and automatic result sharing.

---

## 🏗️ Folder Structure

The project is structured as an NPM workspaces monorepo containing distinct frontend and backend directories. Below is the directory tree:

```text
Test-Management/
├── package.json              # Monorepo configuration & workspace run scripts
├── package-lock.json         # Lockfile for overall workspace dependencies
├── README.md                 # Project documentation
├── backend/
│   ├── package.json          # Backend package specifications
│   ├── tsconfig.json         # TypeScript compiler configurations
│   └── src/
│       ├── server.ts         # Bootstraps database and native HTTP server
│       ├── app.ts            # Native HTTP request parser and router handler
│       ├── db/
│       │   └── index.ts      # Mongoose MongoDB connection client setup
│       ├── models/
│       │   └── index.ts      # Central Mongoose schemas (User, Test, Result, Notification, etc.)
│       ├── controllers/
│       │   ├── authController.ts         # Handlers for Register, Login, Logout, and Token Verification
│       │   ├── testController.ts         # Handlers for Test planning, updates, list, and manual sharing
│       │   ├── attemptController.ts      # Handlers for Test starts, submits, and proctoring streams
│       │   ├── questionController.ts     # Handlers for Question creation, updates, and CSV imports
│       │   ├── subjectController.ts      # Handlers for Subject, Topic, and Subtopic catalogs
│       │   ├── notificationController.ts  # Handlers for user notifications (alerts, read/clear states)
│       │   └── userController.ts         # Handlers for Admin user lists and CRUD
│       ├── routes/
│       │   ├── index.ts                  # Root router forwarding matching path handlers
│       │   ├── authRoutes.ts             # Auth routes mappings
│       │   ├── testRoutes.ts             # Test management routes mappings
│       │   ├── attemptRoutes.ts          # Exam attempts and streaming routes mappings
│       │   ├── questionRoutes.ts         # Question and CSV imports routes mappings
│       │   ├── subjectRoutes.ts          # Syllabus subjects routes mappings
│       │   ├── notificationRoutes.ts     # User notification management routes mappings
│       │   └── userRoutes.ts             # Users management routes mappings
│       ├── middlewares/
│       │   ├── auth.ts                   # JWT token parser and Role authorization checks
│       │   └── utils.ts                  # CORS headers and Request payload handlers
│       ├── services/
│       │   ├── seedService.ts            # Database seeder and startup plaintext-to-hash migrations
│       │   ├── shareService.ts           # Result score-calculators and email notification triggers
│       │   └── autoShareService.ts       # Auto-share polling daemon (30s checker interval)
│       └── utils/
│           └── crypto.ts                 # PBKDF2 cryptography helpers for passwords
└── frontend/
    ├── package.json          # Frontend package specifications
    ├── vite.config.ts        # Vite configuration script
    ├── tailwind.config.js    # TailwindCSS styling configuration
    ├── postcss.config.js     # PostCSS configurations
    ├── tsconfig.json         # TypeScript compiler configurations
    └── src/
        ├── main.tsx          # React application mounting file
        ├── App.tsx           # React Router and query client configuration
        ├── index.css         # Global Tailwind CSS imports & custom styles
        ├── assets/           # Dynamic icons and image assets
        ├── components/
        │   ├── layout/
        │   │   ├── AppShell.tsx          # Navigation wrapper, header, and notification drawer
        │   │   ├── Logo.tsx              # Brand visual identity logo image
        │   │   ├── PageWrapper.tsx       # Standard page layout spacing block
        │   │   └── ProtectedRoute.tsx    # Role-based route guard component
        │   └── ui/
        │       ├── Badge.tsx             # Interactive UI status badges
        │       ├── Button.tsx            # Styled utility button components
        │       ├── Input.tsx             # Accessible inputs wrapper
        │       ├── Modal.tsx             # Overlay dialog boxes
        │       ├── Select.tsx            # Dropdown options selectors
        │       ├── Spinner.tsx           # Asynchronous loading animations
        │       └── Toast.tsx             # Dismissible alert banner notifications
        ├── pages/
        │   ├── LandingPage.tsx           # Premium portal gateway selector
        │   ├── LoginPage.tsx             # Customized login portals for each role
        │   ├── DashboardPage.tsx         # Universal redirect page based on user role
        │   ├── StudentDashboard.tsx      # Student profile view, notifications, and scheduled exams
        │   ├── TeacherDashboard.tsx      # Teacher workspace (Question bank, live monitoring panel)
        │   ├── CreateEditTestPage.tsx    # Test compiler (Subjects, Checkboxes, scoring grid)
        │   ├── AddQuestionsPage.tsx      # Manual forms & CSV batch imports
        │   ├── PreviewPublishPage.tsx    # Final checklist review and publication control
        │   ├── AttemptTestPage.tsx       # Strict exam workspace with proctoring stream & tab monitoring
        │   ├── MonitorTestPage.tsx       # Real-time administrator panel for tab violations and status
        │   └── TestResultPage.tsx        # Personalized feedback view displaying correct and selected choices
        ├── hooks/
        │   ├── useAuth.ts                # Client Authentication lifecycle hook
        │   └── useTests.ts               # Test cache and retrieval hooks
        ├── services/
        │   └── api.ts                    # Customized Axios client instance with CORS credentials
        ├── store/
        │   ├── authStore.ts              # Zustand login-session storage
        │   └── testStore.ts              # Zustand question and test planner storage
        ├── types/
        │   └── index.ts                  # Type definitions for schemas and payloads
        └── utils/
            └── validators.ts             # Client input form schema validations (Zod definitions)
```

---

## 🛠️ Tech Stack & Dependencies

### Backend
* **Runtime Platform:** Node.js (Native HTTP server via `node:http`, **no Express** or other framework dependencies).
* **Database Client:** Mongoose / MongoDB.
* **Programming Language:** TypeScript.

#### Backend Dependency List
| Package Name | Version | Type | Purpose |
| :--- | :---: | :---: | :--- |
| **`mongoose`** | `^8.24.0` | Production | MongoDB object modeling and schema structure. |
| **`typescript`** | `^5.7.2` | Development | Static compilation and typing checks. |
| **`@types/node`** | `^25.9.1` | Development | Native Type declarations for Node.js modules. |

---

### Frontend
* **UI Library:** React 18 (Single Page App).
* **Bundler & Dev Server:** Vite.
* **Styling Framework:** TailwindCSS + PostCSS + Autoprefixer.
* **State Management:** Zustand.
* **Server State Management:** React Query (TanStack Query v5).
* **Network Requests:** Axios.
* **Forms & Validation:** React Hook Form + Zod Resolvers.
* **Icons:** Lucide React.

#### Frontend Dependency List
| Package Name | Version | Type | Purpose |
| :--- | :---: | :---: | :--- |
| **`react`** | `^18.3.1` | Production | Core view rendering engine. |
| **`react-dom`** | `^18.3.1` | Production | React framework entry points for DOM targets. |
| **`react-router-dom`** | `^6.28.2` | Production | Client-side routing management. |
| **`@tanstack/react-query`** | `^5.66.0` | Production | Data-fetching, queries caching, and mutation state management. |
| **`axios`** | `^1.7.9` | Production | HTTP requests client with global interceptors. |
| **`zustand`** | `^5.0.3` | Production | Local authentication state manager. |
| **`react-hook-form`** | `^7.54.2` | Production | React form control management. |
| **`@hookform/resolvers`** | `^5.0.1` | Production | React Hook Form wrapper adapters for third-party validation engines. |
| **`zod`** | `^3.24.1` | Production | Dynamic schema validator for form inputs. |
| **`lucide-react`** | `^0.468.0` | Production | Premium SVG vector icons pack. |
| **`vite`** | `^6.0.7` | Development | Project compiler and Hot-Module-Replacement server. |
| **`@vitejs/plugin-react`** | `^4.3.4` | Development | React framework integration support inside Vite compiler. |
| **`typescript`** | `^5.7.2` | Development | TypeScript scripting compiler environment. |
| **`tailwindcss`** | `^3.4.17` | Development | Tailwind CSS styling builder tool. |
| **`postcss`** | `^8.4.49` | Development | Styles processing engine. |
| **`autoprefixer`** | `^10.4.20` | Development | Browser prefixes utility provider. |
| **`@types/react`** | `^18.3.18` | Development | Type specifications for React. |
| **`@types/react-dom`** | `^18.3.5` | Development | Type specifications for React DOM. |
| **`@types/node`** | `^25.9.1` | Development | Node type mappings helper. |

---

## ⚙️ Environment Configuration

You must define separate `.env` files for both frontend and backend directories. Create them under their respective folders (both files are ignored by git).

### 1. Frontend Configuration
Create a file at `frontend/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:4000/api
```

### 2. Backend Configuration
Create a file at `backend/.env`:
```env
PORT=4000
FRONTEND_ORIGIN=http://127.0.0.1:5173
MONGODB_URI=your_mongodb_uri
ADMIN_SIGNUP_KEY=your_secret_admin_registration_passkey
JWT_SECRET=your_jwt_signing_key_secret_string
```

---

## 🚀 How to Run the Project

You can run the frontend and backend services either together (using NPM workspaces) or as separate runtime processes.

### Prerequisite Checklist
1. Make sure Node.js (v18 or higher) is installed on your local computer.
2. Confirm your MongoDB database service is up and running.

---

### Option A: Unified Execution (Recommended)
This starts both the backend and frontend servers concurrently using root-level scripts.

1. **Install workspace dependencies:**
   ```bash
   npm install
   ```
2. **Launch both servers in Development Mode:**
   ```bash
   npm run dev
   ```
   * *Backend Server URI:* `http://127.0.0.1:4000`
   * *Frontend Application URI:* `http://127.0.0.1:5173`

---

### Option B: Separate Process Execution
If you prefer running or debugging them in separate terminal tabs.

#### 1. Running the Backend Server
```bash
cd backend
npm install
npm run dev
```
* **Production Build & Run:**
  ```bash
  npm run build
  npm start
  ```

#### 2. Running the Frontend Server
```bash
cd frontend
npm install
npm run dev
```
* **Production Build & Preview:**
  ```bash
  npm run build
  npm start
  ```

---

## 🔍 Feature Walkthrough

### 🔑 1. Landing Page & Role-Specific Authentication
* **Unified Portal Selector:** The root route `/` features a modern glassmorphic Landing Page with three interactive selection cards tailored to User Roles (**Admin**, **Teacher**, and **Student**).
* **Role-Based Logins:** Selecting a role routes users to `/login/:role` (e.g., `/login/student`). The login page dynamically customizes its text and visual theme depending on the role.
* **Token Cookie Security:** Utilizes Secure `HttpOnly; SameSite=Lax` cookies with signature encryption (`JWT_SECRET`) to maintain sessions safely without risking client-side exposure.
* **Startup Legacy Migration:** Upon database boot-up, the system automatically checks for legacy plain-text user passwords and hashes them transparently using the **PBKDF2-HMAC** algorithm with unique salt keys.

### 📝 2. Test Management & Automatic Layouts (Admin Workspace)
* **Custom Scoring Specifications:** Admin specifies positive scores, negative deductions, and unattempted penalties during exam creation.
* **Topic Selection:** Subtopic selection is fully automated based on Class and Topics checkboxes, reducing layout complexity. Topics are managed via checkboxes.
* **Question Bank Management:** Allows manual creation of questions or bulk uploading via standard CSV documents.
* **Preview and Launch Checklist:** Admins can preview tests and verify accuracy before publishing.

### ⏰ 3. Real-Time Exams & Proctoring (Student Workspace)
* **Active Testing Client:** Features a dedicated screen displaying the active question, choices selection matrix, status progress indicator, and a running test-timer clock.
* **Deterministic Question Shuffling:** Questions are dynamically shuffled using a Mulberry32 and Fisher-Yates random generator seeded with a unique compound key `studentId-testId`. This ensures each student gets a unique, randomized question order while preserving their specific order when the page is refreshed.
* **Auto-Submission on Timeout:** If the timer reaches `00:00`, the exam instantly triggers an automated save request, collecting and submitting the current attempted questions to ensure progress is not lost.
* **Tab-Switch Proctoring Warning:** Includes tab blur detectors. If the student exits the browser window or opens a new tab, a dismissible alert flashes on the screen showing the current violation count. This value is recorded and saved inside the exam session schema.
* **Webcam Proctoring Stream:** The active testing client captures a webcam thumbnail snapshot every 3 seconds and streams it to the backend database to prove user presence.

### 📊 4. Interactive Performance Analytics & AI Study Coach (Student Workspace)
* **High-Tech Interactive SVG Charts**:
  * **Performance Timeline**: Custom SVG line chart illustrating chronological test scores. Features interactive hover tooltip overlays showing test name, score, and correct/incorrect breakdown, and a green glowing 80% goal reference line.
  * **Subject Benchmarking**: Custom SVG bar chart displaying average scores by subject with a faint 100% possible score background track guide, alternating color gradients, and hover lifts.
  * **Accuracy Breakdown**: Concentric circular progress ring depicting the ratio of correct, incorrect, and unattempted questions with rounded cap strokes, central text rating, and drop-shadow styling.
  * **Marks Leak Analysis**: SVG donut ring representing total marks secured vs. lost to wrong answers (penalties) or unattempted questions (skips).
  * **Multilateral Subject Radar**: Web concentric level grid tracking subject averages in a radar graph with pulsating node vertices and glowing linear gradient area fills.
* **Dynamic Analytics Filtering**: Users can filter stats and charts on-the-fly by specific Subjects (automatically restricted to subjects they have attempted) and Time Periods (All History, Last 5 Tests, Last 10 Tests).
* **AI Study Coach Diagnostic Recommendations**: Automatically diagnoses metrics and prints tailored study suggestions highlighting peak performance, focus subjects, high penalty alerts, and skip recovery suggestions.
* **Gamified Milestones & Achievements**: Unlocks virtual credentials (Bullseye Accuracy, Test Scholar, Pacing Expert, Penalty Shield) dynamically when student scores meet criteria (remaining locked and semi-transparent otherwise).

### 👁️ 5. Live Proctoring & Result Declarations (Teacher Workspace)
* **Live Surveillance Feed:** The Teacher Dashboard contains a "Live Test Monitoring" tab that displays active student attempts in real-time, showing active status markers and warning badges for tab-switches.
* **Interactive Live Grid:** Teachers can monitor active student video feeds in a responsive grid, verifying who is taking the exam in real-time.
* **Tactile Questions Inventory & Bank:** Features a redesigned 'Questions Bank' view with a glassmorphic dashboard banner, flex-centered difficulty stats cards with visual hover outlines, fully styled search filter dropdowns, and a sticky-header data table containing difficulty badges, topic tags, and sleek action buttons.
* **Automated Sharing Daemon:** A background scheduler runs every 30 seconds to check for completed exams. Once the scheduled `end_time` passes, it:
  1. Sets `results_shared = true`.
  2. Compiles student grades and injects individual scores into student profiles.
  3. Generates personalized notification feed alerts for each student.
  4. Deletes active question sets from the public registry for security.

### 🔔 6. Notification Panel
* **Live Toast Panel:** The global app header displays a notification bell polling the backend server every 15 seconds.
* **Direct Notifications:** Students receive immediate alerts when tests are scheduled/published and when final grades are shared. Teachers receive real-time notifications as soon as a student starts an exam attempt.
* **Permanent DB Cleanup:** Selecting `clear all` inside the notification drawer initiates a physical database removal (`deleteMany`) to keep database storage lightweight.

### 🌗 7. Premium Theme Customization & UI Controls
* **Integrated Dark Mode:** Includes full native Dark Mode support for the public Landing Page, Login Page, and internal dashboards, featuring dynamic CSS theme toggling and customized illustrations matching the active dark/light environment.
* **Collapsible Sidebar Layout:** Features a toggleable sidebar navigation, collapsible via a modern hamburger menu control in the global header, which saves screen estate for a cleaner testing workspace.

---

## 👥 Authors

* **Kunal Raj**
