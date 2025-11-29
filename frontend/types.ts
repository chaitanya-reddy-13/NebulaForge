export enum GenerationMode {
  TEXT_TO_3D = 'TEXT_TO_3D',
  IMAGE_TO_3D = 'IMAGE_TO_3D'
}

export enum ModelQuality {
  DRAFT = 'Draft',
  STANDARD = 'Standard',
  HIGH = 'High Poly'
}

export type Vec3 = [number, number, number];

export type GeometryKind =
  | 'sphere'
  | 'box'
  | 'torus'
  | 'cylinder'
  | 'cone'
  | 'icosahedron';

export type GeometrySpec =
  | {
      type: 'sphere';
      radius: number;
      widthSegments: number;
      heightSegments: number;
    }
  | {
      type: 'box';
      width: number;
      height: number;
      depth: number;
    }
  | {
      type: 'torus';
      radius: number;
      tube: number;
      radialSegments: number;
      tubularSegments: number;
      arc: number;
    }
  | {
      type: 'cylinder';
      radiusTop: number;
      radiusBottom: number;
      height: number;
      radialSegments: number;
      heightSegments: number;
      openEnded: boolean;
    }
  | {
      type: 'cone';
      radius: number;
      height: number;
      radialSegments: number;
      heightSegments: number;
    }
  | {
      type: 'icosahedron';
      radius: number;
      detail: number;
    };

export interface MaterialSpec {
  color: string;
  metalness: number;
  roughness: number;
  emissive?: string;
  wireframe?: boolean;
  useTexture?: boolean;
}

export interface MeshModifiers {
  noiseAmplitude?: number;
  noiseFrequency?: number;
  noiseOffset?: number;
  twistStrength?: number;
  taperStrength?: number;
  squash?: number;
}

export interface MeshDescriptor {
  id: string;
  name: string;
  geometry: GeometrySpec;
  material: MaterialSpec;
  transform: {
    position: Vec3;
    rotation: Vec3;
    scale: Vec3;
  };
  modifiers?: MeshModifiers;
}

export interface ProceduralModelSpec {
  prompt: string;
  seed: number;
  environment: 'studio' | 'city' | 'sunset' | 'nebula';
  accentColor: string;
  meshes: MeshDescriptor[];
}

export interface GenerationConfig {
  prompt: string;
  negativePrompt?: string;
  mode: GenerationMode;
  quality: ModelQuality;
  referenceImage?: string; // base64
}

export interface GenerationResult {
  id: string;
  previewUrl: string; // URL of the generated image (concept)
  textureUrl?: string; // URL of the generated texture
  timestamp: number;
  config: GenerationConfig;
}

export interface NavItem {
  label: string;
  id: string;
  icon: React.ReactNode;
}