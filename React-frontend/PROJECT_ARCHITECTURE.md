# Finvoroo — React + Laravel Architecture

## Overview

Two separate projects that communicate over HTTP:

```
React Frontend (Vite)          Laravel Backend (Sanctum API)
http://localhost:5173    ◄──►  http://localhost:8000/api/v1
```

---

## 1. How They Connect

### Axios Instance — `src/lib/api.js`

Every API call goes through a single axios instance. It automatically:
- Attaches `Authorization: Bearer <token>` from `localStorage.auth_token`
- Attaches `X-Company-ID: <id>` from `localStorage.auth_company_id` (required for all workspace routes)
- Redirects to login on 401

```js
const api = axios.create({ baseURL: 'http://localhost:8000/api/v1' });
```

### Authentication Flow

```
User fills SignIn form
  → POST /api/v1/auth/login
  → Laravel returns { token, user, companies[] }
  → authService stores in localStorage:
      auth_token       ← used as Bearer token on every request
      auth_user        ← cached user object
      auth_companies   ← list of companies the user owns
      auth_company_id  ← active company (first one by default)
  → React redirects to /dashboard
```

### Laravel API Route Groups

| Group | Prefix | Auth Required | X-Company-ID Required |
|---|---|---|---|
| Auth | `/api/v1/auth/` | No (login), Yes (logout, me, profile) | No |
| Workspace | `/api/v1/workspace/` | Yes (Sanctum) | Yes |

---

## 2. React `src/` Folder Structure

```
src/
├── main.jsx                    ← Entry point, mounts <App />
├── App.jsx                     ← Wraps everything in providers (theme, settings, i18n, etc.)
│
├── routing/
│   ├── app-routing.jsx         ← Adds top loading bar on route changes
│   └── app-routing-setup.jsx   ← ALL ROUTES defined here (the source of truth)
│
├── auth/
│   ├── guards/auth-guard.jsx   ← Redirects to /auth/signin if not logged in
│   ├── layouts/branded.jsx     ← Layout wrapper for login page
│   ├── pages/signin-page.jsx   ← Login page
│   └── services/auth-service.js ← login(), logout(), getUser(), getToken(), getCompanies()
│
├── layouts/
│   └── demo1/                  ← THE ONLY LAYOUT used in this project
│       ├── layout.jsx          ← Sidebar + Header + Footer + <Outlet /> (page content)
│       └── components/
│           ├── header.jsx      ← Topbar — different for account-owner vs workspace routes
│           ├── sidebar.jsx     ← Collapsible sidebar (w-20 collapsed / w-[280px] expanded)
│           ├── sidebar-header.jsx ← Logo + collapse toggle button
│           ├── sidebar-menu.jsx   ← Renders MENU_SIDEBAR from config/menu.config.jsx
│           ├── mega-menu.jsx   ← Horizontal nav shown on non-account-owner routes
│           └── footer.jsx
│
├── pages/
│   ├── coming-soon-page.jsx    ← Generic placeholder page
│   ├── dashboards/erp/
│   │   └── erp-dashboard-page.jsx  ← Main dashboard (/ and /dashboard routes)
│   ├── companies/
│   │   ├── companies-page.jsx       ← /companies — list user's companies
│   │   └── create-company-page.jsx  ← /companies/create — create a new company
│   ├── profile/
│   │   └── profile-page.jsx         ← /profile — view & update own profile
│   └── store-client/               ← Client-facing storefront pages (future use)
│
├── config/
│   ├── menu.config.jsx         ← MENU_SIDEBAR (sidebar nav items with icons/paths)
│   ├── settings.config.js      ← Default app settings (sidebar collapse, theme, etc.)
│   ├── general.config.js       ← App name, version
│   └── layout-1.config.jsx     ← Config for the layout-1 component system (store-client)
│
├── components/
│   ├── ui/                     ← Shadcn/Radix UI primitives (Button, Card, Dialog, etc.)
│   ├── common/                 ← Shared helpers (Container, etc.)
│   └── layouts/layout-1/      ← Layout-1 components used by store-client pages
│
├── partials/
│   ├── topbar/                 ← Header dropdown components (UserDropdown, Notifications, Chat, etc.)
│   ├── cards/                  ← Reusable card components
│   ├── dialogs/                ← Modal dialogs
│   └── ...
│
├── providers/
│   ├── settings-provider.jsx   ← React Context for app settings (persisted to localStorage)
│   ├── theme-provider.jsx      ← Dark/light mode
│   ├── i18n-provider.jsx       ← Language switching
│   └── ...
│
├── hooks/                      ← Custom hooks (useMenu, useMobile, useScrollPosition, etc.)
├── lib/
│   ├── api.js                  ← Axios instance (see section 1)
│   ├── utils.js                ← cn() helper for Tailwind class merging
│   └── helpers.js              ← toAbsoluteUrl(), etc.
│
└── styles/
    ├── globals.css             ← Main CSS entry (Tailwind + layout + demo1 rules)
    ├── layout.css              ← Sidebar/header width CSS variables
    ├── demos/demo1.css         ← CSS for sidebar collapse transitions, hover expand
    └── components/             ← CSS for scrollbar, image-input, charts, etc.
```

---

## 3. Active Routes

```
/auth/signin                ← BrandedLayout (no sidebar, no header)
/                           ← Demo1Layout → ErpDashboardPage
/dashboard                  ← Demo1Layout → ErpDashboardPage
/profile                    ← Demo1Layout → ProfilePage
/companies                  ← Demo1Layout → CompaniesPage
/companies/create           ← Demo1Layout → CreateCompanyPage
/help                       ← Demo1Layout → ComingSoonPage
*                           ← Redirects to /
```

All routes except `/auth/signin` are protected by `AuthGuard` — it checks `authService.isAuthenticated()` and redirects to `/auth/signin` if no token.

---

## 4. Header Behaviour (Topbar)

The `Header` component renders differently based on route:

| Route type | Middle section | Right buttons |
|---|---|---|
| Account-owner (`/`, `/dashboard`, `/profile`, `/companies`, `/help`) | Breadcrumb only | Bell + User icon |
| Workspace / store-client | MegaMenu (Home, Network, Store…) | Search + Bell + Chat + Apps + Avatar |
| Mobile | Hamburger menu sheet | Same as above |

Account-owner routes are detected by `isAccountOwnerRoute(pathname)` in `header.jsx`.

---

## 5. Sidebar Collapse

State is stored in `settings.layouts.demo1.sidebarCollapse` (persisted to `localStorage` via `SettingsProvider`).

```
Click chevron button (sidebar-header.jsx)
  → storeOption('layouts.demo1.sidebarCollapse', true/false)
  → settings state updates
  → sidebar.jsx reads collapsed → applies w-20 or w-[280px]
  → layout.jsx reads collapsed → sets paddingInlineStart on wrapper
  → header.jsx reads sidebarWidth → sets insetInlineStart on header
  → sidebar-menu.jsx hides text labels and sub-menus when collapsed
```

---

## 6. API Call Pattern (how pages talk to Laravel)

```js
import api from '@/lib/api';

// GET request (no company needed for auth routes)
const response = await api.get('/auth/me');
const user = response.data.data;

// PUT with form data (multipart for file uploads)
const formData = new FormData();
formData.append('name', 'John');
formData.append('avatar', file);
await api.put('/auth/profile', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Workspace request (X-Company-ID auto-attached by interceptor)
const response = await api.get('/workspace/accounting/settings/profile');
```

---

## 7. Laravel Backend Key Points

- **Base URL:** `http://localhost:8000/api/v1`
- **Auth:** Laravel Sanctum — token stored in `localStorage.auth_token`
- **Company context:** Every workspace request needs `X-Company-ID` header — the axios interceptor handles this automatically from `localStorage.auth_company_id`
- **Response shape:**
  ```json
  { "success": true, "message": "...", "data": { ... } }
  { "success": false, "message": "...", "errors": { "field": ["msg"] } }
  ```
- **File storage:** Uploaded files (avatars, logos) are stored in `storage/app/public/` and served via `/storage/` URL. Run `php artisan storage:link` once.

---

## 8. localStorage Keys

| Key | Contents |
|---|---|
| `auth_token` | Sanctum bearer token |
| `auth_user` | JSON — logged-in user object |
| `auth_companies` | JSON — array of companies the user owns |
| `auth_company_id` | String — currently active company ID |
| `app_settings_*` | Dot-path settings (e.g. `app_settings_layouts.demo1.sidebarCollapse`) |

---

## 9. Adding a New Page (Checklist)

1. Create `src/pages/my-feature/my-feature-page.jsx`
2. Add route in `src/routing/app-routing-setup.jsx`:
   ```jsx
   <Route path="/my-feature" element={<MyFeaturePage />} />
   ```
3. Add menu item in `src/config/menu.config.jsx` under `MENU_SIDEBAR`
4. If it's an account-owner page, add the path to `ACCOUNT_OWNER_PATHS` in `src/layouts/demo1/components/header.jsx`
5. Make API calls using `import api from '@/lib/api'`
