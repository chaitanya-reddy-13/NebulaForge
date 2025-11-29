<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# NebulaForge 3D

NebulaForge 3D is a frontend for generating 3D‑ready textures and previews
from text prompts or reference images. It uses a custom backend that calls
Hugging Face LLMs and image models.

## Run Locally (Frontend)

**Prerequisites:** Node.js

1. Install dependencies:
   `cd frontend && npm install`
2. Run the app:
   `npm run dev`

The frontend runs on `http://localhost:3000`.

## Run Locally (Backend)

See the `backend/README.md` file for detailed backend setup. In short:

1. `cd backend && npm install`
2. Create a `.env` file with your Hugging Face token (`HF_API_KEY=...`)
3. `npm run dev` to start the API server on `http://localhost:5000`.
