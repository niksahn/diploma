# Admin Frontend (Vite + React + TS)

Админ‑панель корпоративного мессенджера, работает **только через API Gateway** (`http://localhost:8080`), все вызовы идут на префикс `/api/v1` (например, `/api/v1/auth/admin/login`).

## Требования
- Node.js ≥ 20.19 (Vite предупреждает на 20.15, но сборка проходит).
- npm.

## Установка
```bash
cd admin
npm install
```

## Запуск разработки
```bash
# по умолчанию Vite на :5173
npm run dev
# при необходимости указать хост/порт
npm run dev -- --host 0.0.0.0 --port 5173
```
Открыть в браузере: `http://localhost:5173`.

## Сборка
```bash
npm run build
```
Готовый билд: `admin/dist`.

## Переменные окружения
- `VITE_API_BASE_URL` — база для API Gateway (по умолчанию `http://localhost:8080`).

## Основные страницы и маршруты
- `/login` — вход администратора (`/api/v1/auth/admin/login`).
- `/` — Dashboard (health `/health`, быстрые метрики workspaces/complaints, последние 5 жалоб).
- `/workspaces` — список РП.
- `/workspaces/new` — создание РП (name, leader_id, tariff_id).
- `/workspaces/:id` — детали РП: изменение названия/тарифа, смена лидера, управление участниками.
- `/complaints` — жалобы: фильтр по статусу, детали, смена статуса, удаление.
- `/settings` — заглушка health/настроек.

## Быстрый чек лист для проверки
1) `npm run dev` → зайти на `http://localhost:5173`.
2) Login админа → редирект на `/`.
3) `/workspaces` — виден список, работают Refresh/Create/Open.
4) `/workspaces/new` — подтягиваются тарифы, создаётся РП, редирект на детали.
5) `/workspaces/:id` — меняются тариф/имя, лидер; добавление/удаление/смена ролей участников.
6) `/complaints` — фильтрация, просмотр детали, смена статуса, удаление.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
