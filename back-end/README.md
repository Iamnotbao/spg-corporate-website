# SPG Corporate Backend

## Local development

```bash
cd back-end
npm install
npm run dev
```

`npm run dev` starts the API with Nodemon and automatically restarts it when files in `src/` change.

For a normal production-style start:

```bash
npm start
```

## Environment variables

Copy the example file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Fill in the MongoDB, JWT, frontend URL, and Cloudinary values in `.env`. Never commit `.env`.

## Frontend

Run the frontend in another terminal:

```bash
cd front-end
npm install
npm run dev
```
