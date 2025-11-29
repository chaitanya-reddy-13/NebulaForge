import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { generateModelSpec } from './proceduralGenerator';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configuration values sourced from environment variables
const HF_API_KEY = process.env.HF_API_KEY || '';
const HF_TEXT_MODEL = process.env.HF_TEXT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-dev';

// Hugging Face API base URL (new router endpoint)
const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models';

console.log('[NebulaForge Backend] Configuration loaded successfully');

const buildLocalPromptEnhancement = (prompt: string): string => {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return 'High fidelity 3D asset. Emphasize accurate proportions, realistic PBR materials, and cinematic lighting.';
  }

  const base = cleaned.endsWith('.') ? cleaned : `${cleaned}.`;
  return `${base} Ensure accurate proportions, purposeful detailing, physically based materials, and dramatic but believable lighting.`;
};

async function callHuggingFaceText(prompt: string): Promise<string> {
  if (!HF_API_KEY) {
    throw new Error('HF_API_KEY is missing');
  }

  console.log(`[HF Text] Calling model: ${HF_TEXT_MODEL}`);

  try {
    const response = await axios.post(
      `${HF_API_BASE}/${HF_TEXT_MODEL}`,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 128,
          temperature: 0.7
        }
      },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        timeout: 60000
      }
    );

    const data = response.data;
    console.log(`[HF Text] Response received`);
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text as string;
    }
    if (typeof data === 'string') return data;
    return prompt;
  } catch (error: any) {
    console.error(`[HF Text] API Error:`, error.response?.data || error.message);
    throw error;
  }
}

async function callHuggingFaceImage(
  prompt: string,
  _referenceImageBase64?: string
): Promise<string> {
  if (!HF_API_KEY) {
    throw new Error('HF_API_KEY is missing');
  }

  console.log(`[HF Image] Calling model: ${HF_IMAGE_MODEL}`);
  console.log(`[HF Image] Prompt: ${prompt.substring(0, 100)}...`);

  try {
    const response = await axios.post<ArrayBuffer>(
      `${HF_API_BASE}/${HF_IMAGE_MODEL}`,
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Accept': 'image/png',
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 120000
      }
    );

    console.log(`[HF Image] Response received, size: ${response.data.byteLength} bytes`);
    const base64 = Buffer.from(response.data).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error: any) {
    // Try to parse error message from arraybuffer response
    if (error.response?.data) {
      try {
        const errorText = Buffer.from(error.response.data).toString('utf-8');
        console.error(`[HF Image] API Error (${error.response.status}):`, errorText);
        throw new Error(`Hugging Face API error: ${errorText}`);
      } catch {
        console.error(`[HF Image] API Error (${error.response?.status}):`, error.message);
      }
    }
    throw error;
  }
}

app.post('/api/refine-prompt', async (req, res) => {
  try {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemInstruction =
      'You are an expert 3D artist. Rewrite the following prompt to be a highly detailed description suitable for generating a 3D model. Include details about geometry, texture, lighting, and style. Keep it under 50 words.';

    const fullPrompt = `${systemInstruction}\n\nUser Prompt: "${prompt}"\n\nRefined Prompt:`;

    let refinedText: string | null = null;
    let source: 'huggingface' | 'local' = 'local';

    try {
      const aiResponse = await callHuggingFaceText(fullPrompt);
      const trimmed = aiResponse?.trim();
      if (trimmed) {
        refinedText = trimmed;
        source = 'huggingface';
      }
    } catch (hfError) {
      console.warn('Hugging Face refine call failed, using local enhancer.', hfError);
    }

    if (!refinedText) {
      refinedText = buildLocalPromptEnhancement(prompt);
      source = 'local';
    }

    res.json({ refinedPrompt: refinedText, source });
  } catch (err) {
    console.error('Unexpected refine error:', err);
    res.status(500).json({ error: 'Failed to refine prompt' });
  }
});

app.post('/api/generate-model', async (req, res) => {
  try {
    const {
      prompt,
      referenceImageBase64
    }: { prompt?: string; referenceImageBase64?: string } = req.body;

    if (!prompt && !referenceImageBase64) {
      return res
        .status(400)
        .json({ error: 'Prompt or reference image is required' });
    }

    const modelSpec = generateModelSpec(prompt);

    const combinedPrompt = referenceImageBase64
      ? `Use the provided reference image to craft a rich, detailed texture map for ${prompt}. Preserve distinctive colors, highlights, and shadows so it looks dynamic once wrapped on 3D geometry.`
      : `Create a photorealistic, front-facing render of ${prompt} with bold lighting, visible highlights and shadows, and lots of surface detail. Avoid plain backgrounds—make sure the subject fills the frame so the texture looks interesting when wrapped around a 3D mesh.`;

    let textureDataUrl: string | null = null;
    try {
      textureDataUrl = await callHuggingFaceImage(
        combinedPrompt,
        referenceImageBase64
      );
    } catch (textureErr) {
      console.error('Texture generation failed, returning procedural model only.', textureErr);
    }

    res.json({ textureDataUrl, modelSpec });
  } catch (err) {
    console.error('Error generating model via Hugging Face:', err);
    res
      .status(500)
      .json({ error: 'Failed to generate 3D assets using Hugging Face model' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'NebulaForge Backend' });
});

app.listen(PORT, () => {
  console.log(`[NebulaForge Backend] Server running on http://localhost:${PORT}`);
});



