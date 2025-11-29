## NebulaForge Backend

This backend powers the NebulaForge 3D frontend by talking to Hugging Face
models for:

- Prompt refinement (LLM)
- Texture generation (image model used as a stand‑in for 3D asset generation)

### Getting Your Hugging Face API Key

1. **Create a Hugging Face account** (if you don't have one):
   - Go to [https://huggingface.co/join](https://huggingface.co/join)
   - Sign up for a free account

2. **Generate an Access Token**:
   - Log in to your Hugging Face account
   - Go to your profile settings: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   - Click **"New token"** or **"Create new token"**
   - Give it a name (e.g., "NebulaForge 3D")
   - Select **"Read"** permission (this is sufficient for inference API)
   - Click **"Generate token"**
   - **Copy the token immediately** - you won't be able to see it again!

3. **Note**: The free tier includes a limited number of API requests per month. For production use, you may need a paid plan.

### Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` file in `backend` with:

```bash
HF_API_KEY=your_hugging_face_token_here
HF_TEXT_MODEL=mistralai/Mistral-7B-Instruct-v0.2
HF_IMAGE_MODEL=black-forest-labs/FLUX.1-dev
PORT=5000
```

   Replace `your_hugging_face_token_here` with the token you copied from step 2 above.

3. Run the server in development mode:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`.



