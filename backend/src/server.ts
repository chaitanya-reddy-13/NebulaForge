import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Client } from "@gradio/client";
import fetch from 'node-fetch';
import { generateModelSpec } from './proceduralGenerator.js';

// Polyfill fetch for Node.js environment
if (!global.fetch) {
  (global as any).fetch = fetch;
  (global as any).Headers = (fetch as any).Headers;
  (global as any).Request = (fetch as any).Request;
  (global as any).Response = (fetch as any).Response;
}

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());

// Add request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// JSON parsing middleware
app.use(express.json({ 
  limit: '50mb'
}));

// Configuration values sourced from environment variables
const HF_API_KEY = process.env.HF_API_KEY;
const HF_TEXT_MODEL = process.env.HF_TEXT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || 'stabilityai/TripoSR';
const HF_API_BASE = 'https://router.huggingface.co/models';

if (!HF_API_KEY) {
  throw new Error('HF_API_KEY environment variable is required; please set it in your deployment environment.');
}

// 3D Model Generation Models
const SHAPE_SPACE = 'hysts/Shap-E';

console.log('[NebulaForge Backend] Configuration loaded successfully');
console.log(`[NebulaForge Backend] HF_API_KEY length: ${HF_API_KEY.length}`);
console.log(`[NebulaForge Backend] Using Image-to-3D: ${HF_IMAGE_MODEL}`);
console.log(`[NebulaForge Backend] Using Text-to-3D: ${SHAPE_SPACE}`);

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

  try {
    const response = await fetch(`${HF_API_BASE}/${HF_TEXT_MODEL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
          top_p: 0.9,
          repetition_penalty: 1.2,
          return_full_text: false,
        }
      })
    });

    if (!response.ok) throw new Error(response.statusText);
    const data: any = await response.json();
    return data[0].generated_text;
  } catch (error: any) {
    console.error('Error calling Hugging Face Text API:', error.message);
    throw error;
  }
}

/**
 * Generate 3D model from image using TripoSR via Hugging Face Inference API
 * Returns GLB file as base64 data URL
 */
async function generate3DFromImage(imageBase64: string): Promise<string> {
  if (!HF_API_KEY) {
    throw new Error('HF_API_KEY is missing');
  }

  if (!imageBase64 || imageBase64.trim().length === 0) {
    throw new Error('Image data is empty');
  }

  console.log(`[TripoSR] Generating 3D model from image...`);
  console.log(`[TripoSR] Image data length: ${imageBase64.length} chars`);

  // Extract base64 data
  let base64Data: string;
  try {
    base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;
    
    if (!base64Data || base64Data.trim().length === 0) {
      throw new Error('Base64 data is empty after parsing');
    }
  } catch (err: any) {
    throw new Error(`Failed to parse image data: ${err.message}`);
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(base64Data, 'base64');
    if (imageBuffer.length === 0) {
      throw new Error('Decoded image buffer is empty');
    }
    console.log(`[TripoSR] Decoded image buffer size: ${imageBuffer.length} bytes`);
  } catch (err: any) {
    throw new Error(`Failed to decode base64 image: ${err.message}`);
  }

  // Try Hugging Face Inference API first (simpler and more reliable)
  try {
    console.log(`[TripoSR] Calling Hugging Face Inference API...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

    const response = await fetch(`${HF_API_BASE}/${HF_IMAGE_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Read response body once as text
      const responseText = await response.text();
      let errorText: string;
      
      // Try to parse as JSON, otherwise use as text
      try {
        const errorData = JSON.parse(responseText);
        errorText = JSON.stringify(errorData);
      } catch {
        errorText = responseText || response.statusText || 'Unknown error';
      }

      // Handle specific error cases
      if (response.status === 503) {
        throw new Error(`Model is loading. Please wait a moment and try again. (${errorText})`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Please try again later. (${errorText})`);
      } else if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication failed. Please check your HF_API_KEY. (${errorText})`);
      } else {
        throw new Error(`TripoSR API error (${response.status}): ${errorText}`);
      }
    }

    // Check if response is JSON (error) or binary (GLB file)
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Read as text first, then parse JSON
      const responseText = await response.text();
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(`TripoSR API returned error: ${JSON.stringify(errorData)}`);
      } catch (parseErr) {
        throw new Error(`TripoSR API returned JSON error: ${responseText}`);
      }
    }

    // Response should be a GLB file
    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('TripoSR API returned empty response');
    }

    const base64 = Buffer.from(arrayBuffer).toString('base64');
    console.log(`[TripoSR] Successfully generated GLB (${base64.length} bytes base64, ${arrayBuffer.byteLength} bytes binary)`);
    return `data:model/gltf-binary;base64,${base64}`;

  } catch (apiError: any) {
    if (apiError.name === 'AbortError') {
      console.error(`[TripoSR] API request timed out after 5 minutes`);
      throw new Error('Request timed out. The model generation is taking too long. Please try again or use a smaller image.');
    }
    const errorMessage = apiError?.message || 'TripoSR image generation failed';
    console.error(`[TripoSR] API Error:`, errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Generate 3D model from text prompt using Shap-E via Gradio
 * Returns GLB file as base64 data URL
 */
async function generate3DFromText(prompt: string): Promise<string> {
  if (!HF_API_KEY) {
    throw new Error('HF_API_KEY is missing');
  }

  console.log(`[Shap-E] Generating 3D model from text: "${prompt.substring(0, 100)}..."`);

  try {
    const client = await Client.connect(SHAPE_SPACE, { token: HF_API_KEY as `hf_${string}` });

    const result = await client.predict("/text-to-3d", {
      prompt: prompt,
      seed: 0,
      guidance_scale: 15,
      num_inference_steps: 64,
    });

    const data = result.data;
    if (Array.isArray(data) && data[0]) {
      const fileData = data[0];
      if (fileData.url) {
        const fileResponse = await fetch(fileData.url);
        const arrayBuffer = await fileResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return `data:model/gltf-binary;base64,${base64}`;
      }
    }
    throw new Error('Unexpected response format from Gradio');

  } catch (error: any) {
    console.error(`[Shap-E] Text-to-3D Error:`, error);
    throw error;
  }
}


app.post('/api/refine-prompt', async (req: Request, res: Response) => {
  // Simple local refinement to avoid extra dependencies/calls for now
  const { prompt } = req.body as { prompt?: string };
  const refined = buildLocalPromptEnhancement(prompt || '');
  res.json({ refinedPrompt: refined, source: 'local' });
});

app.post('/api/generate-model', async (req: Request, res: Response) => {
  try {
    console.log('[API] Request received, parsing body...');
    
    // Check if body exists
    if (!req.body) {
      console.error('[API] Request body is missing');
      return res.status(400).json({ error: 'Request body is required' });
    }

    const {
      prompt,
      referenceImageBase64
    }: { prompt?: string; referenceImageBase64?: string } = req.body;

    console.log('[API] Generate model request received', {
      hasPrompt: !!prompt,
      hasImage: !!referenceImageBase64,
      imageLength: referenceImageBase64?.length || 0,
      promptLength: prompt?.length || 0
    });

    if (!prompt && !referenceImageBase64) {
      return res
        .status(400)
        .json({ error: 'Prompt or reference image is required' });
    }

    // Validate image data if provided
    if (referenceImageBase64) {
      try {
        const base64Data = referenceImageBase64.includes(',') 
          ? referenceImageBase64.split(',')[1] 
          : referenceImageBase64;
        Buffer.from(base64Data, 'base64');
      } catch (err: any) {
        console.error('[API] Invalid base64 image data:', err.message);
        return res.status(400).json({ 
          error: 'Invalid image data. Please ensure the image is properly encoded.' 
        });
      }
    }

    let model3DUrl: string | null = null;
    let modelSpec: any = null;

    try {
      if (referenceImageBase64) {
        // Image to 3D using TripoSR
        console.log('[API] Generating 3D model from image using TripoSR...');
        model3DUrl = await generate3DFromImage(referenceImageBase64);

        modelSpec = {
          prompt: prompt || 'Generated from image',
          seed: Math.floor(Math.random() * 1000000),
          environment: 'studio' as const,
          accentColor: '#4f46e5',
          meshes: [],
          source: 'triposr-image'
        };
      } else if (prompt) {
        // Text to 3D using Shap-E (via Gradio)
        // Enhance the prompt for better quality
        const enhancedPrompt = buildLocalPromptEnhancement(prompt);
        console.log(`[API] Generating 3D model from text using Shap-E with enhanced prompt: "${enhancedPrompt.substring(0, 50)}..."`);

        model3DUrl = await generate3DFromText(enhancedPrompt);

        modelSpec = {
          prompt: prompt, // Keep original prompt for display
          seed: Math.floor(Math.random() * 1000000),
          environment: 'studio' as const,
          accentColor: '#4f46e5',
          meshes: [],
          source: 'shap-e-text'
        };
      }

      res.json({
        model3DUrl,
        modelSpec,
        textureDataUrl: null
      });

    } catch (generationErr: any) {
      console.error('[API] 3D model generation failed:', generationErr);
      console.error('[API] Error stack:', generationErr.stack);

      // Fallback to procedural generation
      console.log('[API] Falling back to procedural generation...');
      try {
        modelSpec = generateModelSpec(prompt || '');

        res.json({
          model3DUrl: null,
          modelSpec,
          textureDataUrl: null,
          error: generationErr.message || '3D generation failed, using procedural fallback'
        });
      } catch (fallbackErr: any) {
        console.error('[API] Fallback generation also failed:', fallbackErr);
        res.status(500).json({ 
          error: `Generation failed: ${generationErr.message || 'Unknown error'}` 
        });
      }
    }

  } catch (err: any) {
    console.error('[API] Unexpected error:', err);
    console.error('[API] Error name:', err.name);
    console.error('[API] Error message:', err.message);
    console.error('[API] Error stack:', err.stack);
    
    // Make sure we haven't already sent a response
    if (!res.headersSent) {
      res.status(500).json({ 
        error: err.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    } else {
      console.error('[API] Response already sent, cannot send error response');
    }
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'NebulaForge Backend' });
});

// Global error handler (must be last, after all routes)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler] Unhandled error:', err);
  console.error('[Global Error Handler] Error name:', err?.name);
  console.error('[Global Error Handler] Error message:', err?.message);
  console.error('[Global Error Handler] Error stack:', err?.stack);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: err?.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`[NebulaForge Backend] Server running on http://localhost:${PORT}`);
});
