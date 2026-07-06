# GYMOS React Project

This is the React + HeroUI v3 migration of the GYMOS gym management app.

## Tech Stack
- Vite + React 19 + TypeScript
- HeroUI v3 (@heroui/react + @heroui/styles)
- Tailwind CSS v4
- React Router v6
- Supabase for backend
- Bootstrap Icons for icons

## Conventions
- Import components from `@heroui/react`
- HeroUI v3 has NO Provider - no wrapper needed
- Button uses `onPress` not `onClick`, variant not color
- Card uses compound: Card.Header, Card.Title, Card.Description, Card.Content, Card.Footer
- Icons use Bootstrap Icons: `<i className="bi bi-*" />`
- Translation: useI18n() hook gives `t('key')` function
- Theme: useTheme() hook gives `theme` and `toggleTheme()`
- Routes in App.tsx with ProtectedRoute wrapper
- Supabase client in src/lib/supabase.ts
- Types in src/types/index.ts

## Dev Commands
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npx tsc --noEmit` - Type check
