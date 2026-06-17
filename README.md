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
        │   ├── AdminStudentsPage.tsx     # Student Directory (Quick stats, filter & search, table view)
        │   ├── AdminStudentProfilePage.tsx # Student Demographic Profile (passport layout, performance aggregates)
        │   ├── AdminStudentPerformancePage.tsx # Student Detailed Exam stats list (gauges, rankings, durations)
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

#### 📦 Install Backend Dependencies
To install the backend dependencies manually, run these commands:
* **From the root directory (using Workspaces):**
  ```bash
  npm install mongoose ws imagekit @imagekit/nodejs --workspace backend
  npm install --save-dev typescript @types/node @types/ws --workspace backend
  ```
* **Or from the `backend/` folder:**
  ```bash
  cd backend
  npm install mongoose ws imagekit @imagekit/nodejs
  npm install --save-dev typescript @types/node @types/ws
  ```

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

#### 📦 Install Frontend Dependencies
To install the frontend dependencies manually, run these commands:
* **From the root directory (using Workspaces):**
  ```bash
  npm install @hookform/resolvers @tanstack/react-query axios lucide-react react react-dom react-hook-form react-router-dom zod zustand --workspace frontend
  npm install --save-dev @types/node @types/react @types/react-dom @vitejs/plugin-react autoprefixer postcss tailwindcss typescript vite --workspace frontend
  ```
* **Or from the `frontend/` folder:**
  ```bash
  cd frontend
  npm install @hookform/resolvers @tanstack/react-query axios lucide-react react react-dom react-hook-form react-router-dom zod zustand
  npm install --save-dev @types/node @types/react @types/react-dom @vitejs/plugin-react autoprefixer postcss tailwindcss typescript vite
  ```

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

You can run the frontend and backend services either together (using NPM workspaces) or as separate processes. 

### Prerequisite Checklist
1. Make sure Node.js (v18 or higher) is installed on your local computer.
2. Confirm your MongoDB database service is up and running.

---

### 📦 Install Dependencies
Because the project is configured as an NPM workspaces monorepo, you only need to run the install command once at the **root directory**. This installs all dependencies for both the frontend and backend:
```bash
npm install
```

---

### Option A: Unified Execution (Concurrently)
This starts both the backend (port 4000) and frontend (port 5173) dev servers concurrently using root-level scripts:
```bash
npm run dev
```
* **Production Build & Run:**
  ```bash
  npm run build
  npm start
  ```

---

### Option B: Targeted Workspace Execution
If you prefer running or debugging backend or frontend separately, you can trigger their dev environments individually:
* **Run Backend Only:**
  ```bash
  npm run dev:backend
  ```
* **Run Frontend Only:**
  ```bash
  npm run dev:frontend
  ```

---

## 👥 Authors

* **Kunal Raj**
