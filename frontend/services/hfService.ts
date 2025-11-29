import { ProceduralModelSpec } from '../types';

export const refinePrompt = async (userPrompt: string): Promise<string> => {
  try {
    const res = await fetch('/api/refine-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: userPrompt })
    });

    if (!res.ok) {
      console.error('Refine prompt failed', await res.text());
      return userPrompt;
    }

    const data = await res.json();
    return (data.refinedPrompt as string) || userPrompt;
  } catch (err) {
    console.error('Refine prompt error', err);
    return userPrompt;
  }
};

export interface GenerateModelResponse {
  textureDataUrl?: string | null;
  modelSpec: ProceduralModelSpec;
}

export const generateModelAssets = async (
  prompt: string,
  referenceImageBase64?: string
): Promise<GenerateModelResponse> => {
  const res = await fetch('/api/generate-model', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      referenceImageBase64
    })
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  return data as GenerateModelResponse;
};
