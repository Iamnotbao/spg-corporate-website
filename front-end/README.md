# SPG Corporate Frontend

## Local development

```bash
cd front-end
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Backend URL

Create `front-end/.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

For the deployed backend:

```env
VITE_API_URL=https://spg-backend-gtbv.onrender.com/api
```

After changing `.env.local`, restart Vite.

## Production build

```bash
npm run build
```

## Project structure

```text
src/
├── api.js
├── services/
│   └── applicationService.js
├── Admin.jsx
├── PublicApp.jsx
├── App.jsx
└── index.css
```

The frontend currently keeps the main route composition in `Admin.jsx` and API/application concerns in separate service modules. Additional page-level extraction can be done without changing API behavior.
