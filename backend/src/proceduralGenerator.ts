import crypto from 'crypto';

type Vec3 = [number, number, number];

export type GeometryKind =
  | 'sphere'
  | 'box'
  | 'torus'
  | 'cylinder'
  | 'cone'
  | 'icosahedron';

interface BaseGeometrySpec {
  type: GeometryKind;
}

type SphereGeometrySpec = BaseGeometrySpec & {
  type: 'sphere';
  radius: number;
  widthSegments: number;
  heightSegments: number;
};

type BoxGeometrySpec = BaseGeometrySpec & {
  type: 'box';
  width: number;
  height: number;
  depth: number;
};

type TorusGeometrySpec = BaseGeometrySpec & {
  type: 'torus';
  radius: number;
  tube: number;
  radialSegments: number;
  tubularSegments: number;
  arc: number;
};

type CylinderGeometrySpec = BaseGeometrySpec & {
  type: 'cylinder';
  radiusTop: number;
  radiusBottom: number;
  height: number;
  radialSegments: number;
  heightSegments: number;
  openEnded: boolean;
};

type ConeGeometrySpec = BaseGeometrySpec & {
  type: 'cone';
  radius: number;
  height: number;
  radialSegments: number;
  heightSegments: number;
};

type IcosahedronGeometrySpec = BaseGeometrySpec & {
  type: 'icosahedron';
  radius: number;
  detail: number;
};

export type GeometrySpec =
  | SphereGeometrySpec
  | BoxGeometrySpec
  | TorusGeometrySpec
  | CylinderGeometrySpec
  | ConeGeometrySpec
  | IcosahedronGeometrySpec;

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

export interface MeshTransform {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface MeshDescriptor {
  id: string;
  name: string;
  geometry: GeometrySpec;
  material: MaterialSpec;
  transform: MeshTransform;
  modifiers?: MeshModifiers;
}

export interface ProceduralModelSpec {
  prompt: string;
  seed: number;
  environment: 'studio' | 'city' | 'sunset' | 'nebula';
  accentColor: string;
  meshes: MeshDescriptor[];
}

interface ThemePreset {
  id: string;
  keywords: string[];
  primaryGeometry: GeometryKind;
  secondaryGeometries: GeometryKind[];
  palette: string[];
  baseMaterial: Pick<MaterialSpec, 'metalness' | 'roughness'>;
  environment: ProceduralModelSpec['environment'];
  accentColor: string;
  modifiers: Required<Pick<MeshModifiers, 'noiseAmplitude' | 'noiseFrequency' | 'twistStrength' | 'taperStrength'>> & {
    squash: number;
  };
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'mechanical',
    keywords: ['robot', 'mech', 'machine', 'engine', 'industrial', 'drone', 'armor', 'cyber', 'android', 'gear', 'factory'],
    primaryGeometry: 'box',
    secondaryGeometries: ['cylinder', 'box', 'torus'],
    palette: ['#94a3b8', '#facc15', '#0f172a', '#cbd5f5'],
    baseMaterial: { metalness: 0.85, roughness: 0.25 },
    environment: 'city',
    accentColor: '#facc15',
    modifiers: {
      noiseAmplitude: 0.08,
      noiseFrequency: 2.4,
      twistStrength: 0.15,
      taperStrength: 0.05,
      squash: 0.12
    }
  },
  {
    id: 'organic',
    keywords: ['creature', 'biologic', 'organic', 'flora', 'nature', 'plant', 'beast', 'animal', 'character', 'dragon', 'fauna', 'alien'],
    primaryGeometry: 'sphere',
    secondaryGeometries: ['cone', 'sphere', 'icosahedron'],
    palette: ['#34d399', '#0f766e', '#bef264', '#ecfccb'],
    baseMaterial: { metalness: 0.2, roughness: 0.7 },
    environment: 'sunset',
    accentColor: '#bef264',
    modifiers: {
      noiseAmplitude: 0.35,
      noiseFrequency: 1.3,
      twistStrength: 0.45,
      taperStrength: 0.35,
      squash: 0.25
    }
  },
  {
    id: 'aero',
    keywords: ['spaceship', 'jet', 'rocket', 'craft', 'vehicle', 'car', 'fighter', 'aircraft', 'shuttle', 'hover', 'ship', 'drone'],
    primaryGeometry: 'cylinder',
    secondaryGeometries: ['cone', 'box', 'torus'],
    palette: ['#60a5fa', '#f8fafc', '#0369a1', '#e0f2fe'],
    baseMaterial: { metalness: 0.65, roughness: 0.35 },
    environment: 'studio',
    accentColor: '#60a5fa',
    modifiers: {
      noiseAmplitude: 0.12,
      noiseFrequency: 3.1,
      twistStrength: 0.25,
      taperStrength: 0.15,
      squash: 0.2
    }
  },
  {
    id: 'abstract',
    keywords: ['abstract', 'symbol', 'glyph', 'portal', 'totem', 'sculpture', 'sigil', 'icon', 'logo'],
    primaryGeometry: 'icosahedron',
    secondaryGeometries: ['torus', 'sphere', 'cone'],
    palette: ['#c084fc', '#a855f7', '#f472b6', '#fdf2f8'],
    baseMaterial: { metalness: 0.35, roughness: 0.45 },
    environment: 'nebula',
    accentColor: '#c084fc',
    modifiers: {
      noiseAmplitude: 0.28,
      noiseFrequency: 2.1,
      twistStrength: 0.35,
      taperStrength: 0.2,
      squash: 0.3
    }
  }
];

const vectorNameSeeds = ['Nebula', 'Axiom', 'Vertex', 'Pulse', 'Aurora', 'Helix', 'Solace'];

const geometryTitles: Record<GeometryKind, string> = {
  sphere: 'Core',
  box: 'Hull',
  torus: 'Ring',
  cylinder: 'Column',
  cone: 'Spire',
  icosahedron: 'Shard'
};

type DetailBias = 'neutral' | 'organic' | 'mechanical';

interface PromptHints {
  geometryPreference?: GeometryKind;
  paletteOverride?: string[];
  accentColor?: string;
  environmentHint?: ProceduralModelSpec['environment'];
  preferredThemeId?: ThemePreset['id'];
  detailBias: DetailBias;
  meshTarget?: number;
}

interface DescriptorContext {
  palette: string[];
  accentColor: string;
  primaryGeometry?: GeometryKind;
  detailBias: DetailBias;
}

interface TemplateBuildContext {
  palette: string[];
  accentColor: string;
  rand: () => number;
}

interface ShapeTemplate {
  id: string;
  keywords: string[];
  environment?: ProceduralModelSpec['environment'];
  buildMeshes: (ctx: TemplateBuildContext) => MeshDescriptor[];
}

const includesAny = (text: string, terms: string[]): boolean =>
  terms.some((term) => text.includes(term));

const GEOMETRY_KEYWORDS: Record<GeometryKind, string[]> = {
  sphere: ['orb', 'sphere', 'globe', 'planet', 'eye', 'bubble', 'core'],
  box: ['cube', 'block', 'fortress', 'monolith', 'crate', 'terminal'],
  torus: ['ring', 'halo', 'loop', 'portal', 'gateway', 'donut'],
  cylinder: ['tower', 'pillar', 'rocket', 'barrel', 'staff', 'sword', 'blade', 'engine', 'cannon'],
  cone: ['spike', 'spire', 'pyramid', 'mountain', 'fang', 'icicle'],
  icosahedron: ['crystal', 'shard', 'polyhedron', 'geode', 'gem', 'diamond']
};

const COLOR_KEYWORDS: Record<string, string[]> = {
  '#ef4444': ['red', 'scarlet', 'crimson', 'ruby'],
  '#f59e0b': ['gold', 'amber', 'sunset', 'bronze', 'copper'],
  '#3b82f6': ['blue', 'azure', 'sapphire', 'cyan'],
  '#22c55e': ['green', 'emerald', 'jade', 'lime'],
  '#a855f7': ['purple', 'violet', 'magenta', 'neon'],
  '#f472b6': ['pink', 'rose', 'fuchsia'],
  '#e5e7eb': ['white', 'silver', 'pearl'],
  '#1f2937': ['black', 'obsidian', 'onyx', 'shadow'],
  '#f97316': ['orange', 'sunrise', 'ember'],
  '#94a3b8': ['steel', 'gray', 'gunmetal']
};

const ENVIRONMENT_KEYWORDS: Record<ProceduralModelSpec['environment'], string[]> = {
  studio: ['studio', 'product', 'turntable', 'showroom'],
  city: ['city', 'urban', 'neon', 'street', 'industrial'],
  sunset: ['sunset', 'dusk', 'golden hour', 'desert', 'forest'],
  nebula: ['space', 'nebula', 'galaxy', 'cosmic', 'void']
};

const MULTI_OBJECT_KEYWORDS = ['fleet', 'swarm', 'array', 'cluster', 'forest', 'army', 'collection', 'pack', 'hive'];
const SINGLE_OBJECT_KEYWORDS = ['statue', 'bust', 'monolith', 'idol', 'single', 'solo', 'portrait'];

const DETAIL_BIAS_KEYWORDS: Record<Exclude<DetailBias, 'neutral'>, string[]> = {
  organic: ['creature', 'organic', 'flora', 'fauna', 'dragon', 'beast', 'character', 'alien', 'mythic'],
  mechanical: ['robot', 'mech', 'engine', 'industrial', 'armor', 'cyber', 'drone', 'vehicle', 'turret']
};

const TEMPLATE_DEFAULT_PALETTE = ['#d4b48c', '#1f1f1f', '#f5f5f5'];

const createTemplateId = (prefix: string, rand: () => number) =>
  `${prefix}-${Math.round(rand() * 1_000_000)}`;

const SHAPE_TEMPLATES: ShapeTemplate[] = [
  {
    id: 'cricket-bat',
    keywords: ['cricket bat', 'bat'],
    environment: 'studio',
    buildMeshes: ({ palette, accentColor, rand }) => {
      const colors = palette.length ? palette : TEMPLATE_DEFAULT_PALETTE;
      const wood = colors[0] ?? '#d4b48c';
      const grip = colors[1] ?? '#171717';
      const sticker = accentColor ?? colors[2] ?? '#f97316';

      return [
        {
          id: createTemplateId('bat-blade', rand),
          name: 'Cricket-Blade',
          geometry: {
            type: 'box',
            width: 0.45,
            height: 2.2,
            depth: 0.32
          },
          transform: {
            position: [0, 0.4, 0],
            rotation: [-Math.PI * 0.02, 0, Math.PI * 0.05],
            scale: [1, 1, 1]
          },
          material: {
            color: wood,
            metalness: 0.08,
            roughness: 0.72,
            emissive: undefined,
            wireframe: false,
            useTexture: true
          },
          modifiers: {
            taperStrength: 0.3,
            squash: 0.12,
            noiseAmplitude: 0.015
          }
        },
        {
          id: createTemplateId('bat-handle', rand),
          name: 'Cricket-Handle',
          geometry: {
            type: 'cylinder',
            radiusTop: 0.12,
            radiusBottom: 0.15,
            height: 1.5,
            radialSegments: 48,
            heightSegments: 1,
            openEnded: false
          },
          transform: {
            position: [0, 1.35, -0.05],
            rotation: [Math.PI / 2, 0, 0],
            scale: [1, 1, 1]
          },
          material: {
            color: grip,
            metalness: 0.05,
            roughness: 0.45,
            emissive: undefined,
            wireframe: false,
            useTexture: false
          },
          modifiers: {
            twistStrength: 0.25,
            noiseAmplitude: 0.03
          }
        },
        {
          id: createTemplateId('bat-cap', rand),
          name: 'Bat-Logo-Panel',
          geometry: {
            type: 'box',
            width: 0.4,
            height: 0.9,
            depth: 0.05
          },
          transform: {
            position: [0, 0.2, 0.18],
            rotation: [0, 0, Math.PI * 0.05],
            scale: [1, 1, 1]
          },
          material: {
            color: sticker,
            metalness: 0.2,
            roughness: 0.4,
            emissive: accentColor,
            wireframe: false,
            useTexture: false
          },
          modifiers: {
            noiseAmplitude: 0.01
          }
        }
      ];
    }
  }
];

const analyzePromptHints = (prompt: string): PromptHints => {
  const normalized = prompt.toLowerCase();

  const geometryPreference = (Object.entries(GEOMETRY_KEYWORDS).find(([_, terms]) =>
    includesAny(normalized, terms)
  )?.[0] ?? undefined) as GeometryKind | undefined;

  const paletteOverride = Object.entries(COLOR_KEYWORDS).reduce<string[]>((acc, [hex, terms]) => {
    if (includesAny(normalized, terms)) {
      acc.push(hex);
    }
    return acc;
  }, []);

  const environmentHint = (Object.entries(ENVIRONMENT_KEYWORDS).find(([_, terms]) =>
    includesAny(normalized, terms)
  )?.[0] ?? undefined) as ProceduralModelSpec['environment'] | undefined;

  const preferredThemeId = THEME_PRESETS.find((preset) =>
    preset.keywords.some((keyword) => normalized.includes(keyword))
  )?.id;

  let detailBias: DetailBias = 'neutral';
  if (includesAny(normalized, DETAIL_BIAS_KEYWORDS.organic)) {
    detailBias = 'organic';
  } else if (includesAny(normalized, DETAIL_BIAS_KEYWORDS.mechanical)) {
    detailBias = 'mechanical';
  }

  let meshTarget: number | undefined;
  if (includesAny(normalized, SINGLE_OBJECT_KEYWORDS)) {
    meshTarget = 1;
  } else if (includesAny(normalized, MULTI_OBJECT_KEYWORDS)) {
    meshTarget = 4;
  }

  return {
    geometryPreference,
    paletteOverride: paletteOverride.length ? Array.from(new Set(paletteOverride)) : undefined,
    accentColor: paletteOverride[0],
    environmentHint,
    preferredThemeId,
    detailBias,
    meshTarget
  };
};

const resolvePalette = (
  theme: ThemePreset,
  hints: PromptHints
): { palette: string[]; accentColor: string } => {
  if (!hints.paletteOverride || !hints.paletteOverride.length) {
    return {
      palette: [...theme.palette],
      accentColor: hints.accentColor ?? theme.accentColor
    };
  }

  const merged = Array.from(new Set([...hints.paletteOverride, ...theme.palette]));
  const palette = merged.slice(0, Math.max(theme.palette.length, merged.length));

  return {
    palette,
    accentColor: hints.accentColor ?? palette[0] ?? theme.accentColor
  };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const randomRange = (rand: () => number, min: number, max: number) =>
  min + (max - min) * rand();

const createSeed = (prompt: string): number => {
  const hash = crypto.createHash('sha256').update(prompt).digest('hex');
  return parseInt(hash.slice(0, 8), 16);
};

const createGenerator = (seed: number): (() => number) => {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const pickTheme = (prompt: string, rand: () => number, hints?: PromptHints): ThemePreset => {
  if (hints?.preferredThemeId) {
    const explicit = THEME_PRESETS.find((preset) => preset.id === hints.preferredThemeId);
    if (explicit) return explicit;
  }

  const normalized = prompt.toLowerCase();
  const matched = THEME_PRESETS.find((preset) =>
    preset.keywords.some((keyword) => normalized.includes(keyword))
  );
  if (matched) return matched;
  return THEME_PRESETS[Math.floor(rand() * THEME_PRESETS.length)];
};

const tryTemplateSpec = (
  prompt: string,
  hints: PromptHints,
  seed: number
): ProceduralModelSpec | null => {
  const normalized = prompt.toLowerCase();
  const template = SHAPE_TEMPLATES.find((shape) => includesAny(normalized, shape.keywords));
  if (!template) return null;

  const rand = createGenerator(seed);
  const palette =
    hints.paletteOverride && hints.paletteOverride.length ? hints.paletteOverride : TEMPLATE_DEFAULT_PALETTE;
  const accentColor = hints.accentColor ?? palette[0];
  const meshes = template.buildMeshes({ palette, accentColor, rand });

  return {
    prompt,
    seed,
    environment: template.environment ?? hints.environmentHint ?? 'studio',
    accentColor,
    meshes
  };
};

const createGeometry = (kind: GeometryKind, rand: () => number): GeometrySpec => {
  switch (kind) {
    case 'sphere':
      return {
        type: 'sphere',
        radius: randomRange(rand, 1.1, 1.8),
        widthSegments: 32 + Math.floor(rand() * 16),
        heightSegments: 32 + Math.floor(rand() * 16)
      };
    case 'box':
      return {
        type: 'box',
        width: randomRange(rand, 1, 2.2),
        height: randomRange(rand, 1, 1.6),
        depth: randomRange(rand, 1, 2)
      };
    case 'torus':
      return {
        type: 'torus',
        radius: randomRange(rand, 1.2, 1.9),
        tube: randomRange(rand, 0.2, 0.5),
        radialSegments: 16 + Math.floor(rand() * 16),
        tubularSegments: 48 + Math.floor(rand() * 32),
        arc: Math.PI * 2
      };
    case 'cylinder':
      return {
        type: 'cylinder',
        radiusTop: randomRange(rand, 0.5, 1.2),
        radiusBottom: randomRange(rand, 0.8, 1.5),
        height: randomRange(rand, 2, 3.2),
        radialSegments: 32 + Math.floor(rand() * 16),
        heightSegments: 1 + Math.floor(rand() * 3),
        openEnded: false
      };
    case 'cone':
      return {
        type: 'cone',
        radius: randomRange(rand, 0.7, 1.4),
        height: randomRange(rand, 1.4, 2.4),
        radialSegments: 32 + Math.floor(rand() * 16),
        heightSegments: 1 + Math.floor(rand() * 2)
      };
    case 'icosahedron':
    default:
      return {
        type: 'icosahedron',
        radius: randomRange(rand, 1.2, 1.7),
        detail: Math.floor(rand() * 2)
      };
  }
};

const createTransform = (rand: () => number, index: number): MeshTransform => {
  if (index === 0) {
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    };
  }

  return {
    position: [
      randomRange(rand, -1.2, 1.2),
      randomRange(rand, -0.2, 1.2),
      randomRange(rand, -1.1, 1.1)
    ],
    rotation: [
      randomRange(rand, -0.4, 0.4),
      randomRange(rand, 0, Math.PI * 2),
      randomRange(rand, -0.4, 0.4)
    ],
    scale: [
      randomRange(rand, 0.45, 0.9),
      randomRange(rand, 0.45, 0.9),
      randomRange(rand, 0.45, 0.9)
    ]
  };
};

const createMeshName = (
  prompt: string,
  geometry: GeometryKind,
  rand: () => number,
  index: number
): string => {
  const primaryDescriptor = prompt.split(' ').find(Boolean) ?? 'Artifact';
  const base = geometryTitles[geometry] ?? 'Element';
  const prefix = vectorNameSeeds[Math.floor(rand() * vectorNameSeeds.length)];
  return `${prefix}-${base}-${index === 0 ? 'Prime' : primaryDescriptor}`;
};

const createMeshDescriptor = (
  theme: ThemePreset,
  prompt: string,
  rand: () => number,
  index: number,
  context: DescriptorContext
): MeshDescriptor => {
  const palette = context.palette.length ? context.palette : theme.palette;
  const primaryCandidates = [
    context.primaryGeometry ?? theme.primaryGeometry,
    theme.primaryGeometry
  ].filter(Boolean) as GeometryKind[];

  const secondaryCandidates = [
    ...(context.primaryGeometry ? [context.primaryGeometry] : []),
    ...theme.secondaryGeometries
  ];

  const geometryPool = index === 0 ? primaryCandidates : secondaryCandidates;
  const geometryKind =
    geometryPool[Math.floor(rand() * geometryPool.length)] ??
    theme.secondaryGeometries[Math.floor(rand() * theme.secondaryGeometries.length)];

  const geometry = createGeometry(geometryKind, rand);
  const transform = createTransform(rand, index);

  const paletteIndex = clamp(
    index === 0 || palette.length === 1
      ? 0
      : 1 + Math.floor(rand() * Math.max(1, palette.length - 1)),
    0,
    Math.max(0, palette.length - 1)
  );

  const detailMultiplier =
    context.detailBias === 'organic' ? 1.25 : context.detailBias === 'mechanical' ? 0.65 : 1;

  const modifiers: MeshModifiers = {
    noiseAmplitude: theme.modifiers.noiseAmplitude * randomRange(rand, 0.9, 1.4) * detailMultiplier,
    noiseFrequency: theme.modifiers.noiseFrequency * randomRange(rand, 0.8, 1.2),
    noiseOffset: rand() * Math.PI * 2,
    twistStrength: theme.modifiers.twistStrength * randomRange(rand, 0.7, 1.3) * detailMultiplier,
    taperStrength: theme.modifiers.taperStrength * randomRange(rand, 0.5, 1.2) * detailMultiplier,
    squash: theme.modifiers.squash * randomRange(rand, 0.8, 1.2)
  };

  if (context.detailBias === 'mechanical') {
    modifiers.noiseAmplitude = (modifiers.noiseAmplitude ?? 0) * 0.8;
    modifiers.taperStrength = (modifiers.taperStrength ?? 0) * 0.7;
    modifiers.squash = (modifiers.squash ?? 0) * 0.6;
  }

  const metalnessBias =
    context.detailBias === 'organic' ? -0.2 : context.detailBias === 'mechanical' ? 0.15 : 0;
  const roughnessBias =
    context.detailBias === 'organic' ? 0.2 : context.detailBias === 'mechanical' ? -0.1 : 0;

  const material: MaterialSpec = {
    color: palette[paletteIndex] ?? theme.palette[0],
    metalness: clamp(theme.baseMaterial.metalness + metalnessBias, 0, 1),
    roughness: clamp(theme.baseMaterial.roughness + roughnessBias, 0, 1),
    emissive: index === 0 ? context.accentColor : undefined,
    wireframe: index > 0 && rand() > 0.85,
    useTexture: index === 0
  };

  return {
    id: `${geometryKind}-${index}-${Math.round(rand() * 1_000_000)}`,
    name: createMeshName(prompt, geometryKind, rand, index),
    geometry,
    transform,
    material,
    modifiers
  };
};

export const generateModelSpec = (prompt?: string): ProceduralModelSpec => {
  const fallbackPrompt = prompt?.trim().length ? prompt : 'abstract artifact';
  const seed = createSeed(fallbackPrompt);
  const rand = createGenerator(seed);
  const hints = analyzePromptHints(fallbackPrompt);

  const templateSpec = tryTemplateSpec(fallbackPrompt, hints, seed);
  if (templateSpec) {
    return templateSpec;
  }

  const theme = pickTheme(fallbackPrompt, rand, hints);
  const { palette, accentColor } = resolvePalette(theme, hints);
  const environment = hints.environmentHint ?? theme.environment;
  const meshCount = hints.meshTarget ?? (2 + Math.floor(rand() * 3));
  const clampedMeshCount = clamp(meshCount, 1, 4);
  const meshes: MeshDescriptor[] = [];

  const context: DescriptorContext = {
    palette,
    accentColor,
    primaryGeometry: hints.geometryPreference,
    detailBias: hints.detailBias
  };

  for (let i = 0; i < clampedMeshCount; i++) {
    meshes.push(createMeshDescriptor(theme, fallbackPrompt, rand, i, context));
  }

  return {
    prompt: fallbackPrompt,
    seed,
    environment,
    accentColor,
    meshes
  };
};

