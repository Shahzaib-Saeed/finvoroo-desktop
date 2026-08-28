# ERP Dashboard

A clean, standalone ERP Dashboard frontend built with React, Vite, and Tailwind CSS using Metronic's Layout 1 design.

## Features

- **Layout 1**: Sidebar + Header layout with collapsible sidebar
- **ERP Dashboard Page**: Pre-built dashboard with stats cards, charts area, and recent activity
- **Dark Mode Support**: Toggle between light and dark themes
- **Responsive Design**: Mobile-friendly with collapsible mobile menu
- **Clean Structure**: Ready to integrate with your Laravel API backend

## Project Structure

```
erp-dashboard/
├── src/
│   ├── components/
│   │   ├── layouts/layout-1/    # Main layout components
│   │   └── ui/                  # Reusable UI components (shadcn/ui)
│   ├── config/
│   │   └── layout-1.config.jsx # Menu configuration
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility functions
│   ├── pages/
│   │   └── dashboard/           # Dashboard page
│   ├── routing/                 # React Router setup
│   └── styles/                  # Global CSS and Tailwind config
├── public/
│   └── media/                   # Static assets (logos, avatars)
└── index.html
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd erp-dashboard
npm install --legacy-peer-deps
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Integration with Laravel API

This frontend is designed to work with a Laravel API backend. To connect:

1. Set your API base URL in environment variables (`.env` file):
   ```
   VITE_API_URL=http://your-laravel-api.test/api
   ```

2. Create API service files in `src/services/` to handle API calls

3. Update the dashboard page (`src/pages/dashboard/page.jsx`) to fetch real data from your API

## Customization

### Menu Items

Edit `src/config/layout-1.config.jsx` to customize sidebar and mega menu items:

```jsx
export const MENU_SIDEBAR = [
  {
    title: 'Dashboards',
    icon: LayoutGrid,
    children: [
      { title: 'Light Sidebar', path: '/' },
      { title: 'Dark Sidebar', path: '/dashboard/dark-sidebar' },
    ],
  },
  // Add your menu items here
];
```

### Theme Colors

The project uses CSS variables for theming. Edit `src/styles/globals.css` to customize colors.

## Technologies Used

- React 19
- Vite 7
- Tailwind CSS 4
- shadcn/ui components
- React Router 7
- date-fns
- lucide-react

## License

This project is built on top of Metronic by Keenthemes. Please refer to Metronic's license for usage terms.
