import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera, Grid, Environment, Gltf } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshDescriptor, ProceduralModelSpec } from '../types';

interface ThreeViewerProps {
  textureUrl?: string;
  modelUrl?: string;
  modelSpec?: ProceduralModelSpec | null;
  isGenerating: boolean;
}

export interface ThreeViewerHandle {
  exportGLB: () => void;
}

const environmentPresetMap: Record<
  ProceduralModelSpec['environment'],
  'studio' | 'city' | 'sunset' | 'night'
> = {
  studio: 'studio',
  city: 'city',
  sunset: 'sunset',
  nebula: 'night'
};

const createGeometryFromDescriptor = (descriptor: MeshDescriptor): THREE.BufferGeometry => {
  const { geometry } = descriptor;
  switch (geometry.type) {
    case 'sphere':
      return new THREE.SphereGeometry(
        geometry.radius,
        geometry.widthSegments,
        geometry.heightSegments
      );
    case 'box':
      return new THREE.BoxGeometry(geometry.width, geometry.height, geometry.depth);
    case 'torus':
      return new THREE.TorusGeometry(
        geometry.radius,
        geometry.tube,
        geometry.radialSegments,
        geometry.tubularSegments,
        geometry.arc
      );
    case 'cylinder':
      return new THREE.CylinderGeometry(
        geometry.radiusTop,
        geometry.radiusBottom,
        geometry.height,
        geometry.radialSegments,
        geometry.heightSegments,
        geometry.openEnded
      );
    case 'cone':
      return new THREE.ConeGeometry(
        geometry.radius,
        geometry.height,
        geometry.radialSegments,
        geometry.heightSegments
      );
    case 'icosahedron':
    default:
      return new THREE.IcosahedronGeometry(geometry.radius, geometry.detail);
  }
};

const applyModifiers = (
  geometry: THREE.BufferGeometry,
  descriptor: MeshDescriptor
): THREE.BufferGeometry => {
  if (!descriptor.modifiers) {
    return geometry;
  }

  const { noiseAmplitude, noiseFrequency, noiseOffset, twistStrength, taperStrength, squash } =
    descriptor.modifiers;

  if (
    !noiseAmplitude &&
    !noiseFrequency &&
    !noiseOffset &&
    !twistStrength &&
    !taperStrength &&
    !squash
  ) {
    return geometry;
  }

  const position = geometry.getAttribute('position');
  const vertex = new THREE.Vector3();
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const rangeY = maxY - minY || 1;

  for (let i = 0; i < position.count; i++) {
    vertex.set(position.getX(i), position.getY(i), position.getZ(i));

    if (taperStrength) {
      const normalized = (vertex.y - minY) / rangeY;
      const taperFactor = 1 - taperStrength * (normalized - 0.5);
      vertex.x *= taperFactor;
      vertex.z *= taperFactor;
    }

    if (squash) {
      const normalized = (vertex.y - minY) / rangeY;
      const squashFactor = 1 + Math.sin(normalized * Math.PI * 2 + (noiseOffset ?? 0)) * squash;
      vertex.y *= squashFactor;
    }

    if (twistStrength) {
      const angle = vertex.y * twistStrength;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = vertex.x * cos - vertex.z * sin;
      const z = vertex.x * sin + vertex.z * cos;
      vertex.x = x;
      vertex.z = z;
    }

    if (noiseAmplitude) {
      const freq = noiseFrequency ?? 1.4;
      const offset = noiseOffset ?? 0;
      const wave = Math.sin((vertex.x + vertex.y + vertex.z) * freq + offset) * noiseAmplitude;
      const waveY = Math.cos(vertex.y * (freq * 0.5) + offset) * noiseAmplitude * 0.6;
      vertex.x += wave;
      vertex.z += wave * 0.8;
      vertex.y += waveY;
    }

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
};

const ProceduralMesh: React.FC<{
  descriptor: MeshDescriptor;
  texture?: THREE.Texture | null;
}> = ({ descriptor, texture }) => {
  const geometry = useMemo(() => {
    const base = createGeometryFromDescriptor(descriptor);
    return applyModifiers(base, descriptor);
  }, [descriptor]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh
      geometry={geometry}
      position={descriptor.transform.position}
      rotation={descriptor.transform.rotation}
      scale={descriptor.transform.scale}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        map={descriptor.material.useTexture && texture ? texture : undefined}
        color={descriptor.material.color}
        metalness={descriptor.material.metalness}
        roughness={descriptor.material.roughness}
        emissive={descriptor.material.emissive ?? '#000000'}
        wireframe={descriptor.material.wireframe}
        envMapIntensity={1.15}
      />
    </mesh>
  );
};

const ProceduralGroup: React.FC<{
  spec?: ProceduralModelSpec | null;
  texture?: THREE.Texture | null;
  groupRef: React.RefObject<THREE.Group>;
}> = ({ spec, texture, groupRef }) => {
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  if (!spec) return null;

  return (
    <group ref={groupRef} dispose={null}>
      {spec.meshes.map((mesh) => (
        <ProceduralMesh key={mesh.id} descriptor={mesh} texture={texture} />
      ))}
    </group>
  );
};

const ThreeViewer = forwardRef<ThreeViewerHandle, ThreeViewerProps>(
  ({ textureUrl, modelUrl, modelSpec, isGenerating }, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        exportGLB: () => {
          if (!groupRef.current) {
            alert('No generated geometry to export yet.');
            return;
          }
          const exporter = new GLTFExporter();
          exporter.parse(
            groupRef.current,
            (gltf) => {
              const blob =
                gltf instanceof ArrayBuffer
                  ? new Blob([gltf], { type: 'model/gltf-binary' })
                  : new Blob([JSON.stringify(gltf, null, 2)], {
                    type: 'application/json'
                  });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `nebula-forge-${Date.now()}.glb`;
              link.click();
              setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            },
            (error) => console.error('Failed to export GLB', error),
            { binary: true }
          );
        }
      }),
      []
    );

    useEffect(() => {
      if (!textureUrl) {
        setTexture(null);
        return;
      }

      let mounted = true;
      const loader = new THREE.TextureLoader();
      loader.load(
        textureUrl,
        (loaded) => {
          if (!mounted) return;
          loaded.colorSpace = THREE.SRGBColorSpace;
          setTexture(loaded);
        },
        undefined,
        (error) => console.error('Texture load failed', error)
      );

      return () => {
        mounted = false;
      };
    }, [textureUrl]);

    const environmentPreset = modelSpec ? environmentPresetMap[modelSpec.environment] : 'city';
    const accentColor = modelSpec?.accentColor ?? '#4f46e5';

    return (
      <div className="w-full h-full bg-zinc-950 rounded-lg overflow-hidden relative border border-zinc-800 shadow-2xl">
        {isGenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-indigo-400 font-mono animate-pulse">Synthesizing Geometry...</p>
          </div>
        )}

        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, ${accentColor}33, transparent 55%)`
          }}
        />

        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={50} />

          <Stage intensity={0.6} environment={environmentPreset} adjustCamera={false}>
            {modelUrl ? (
              <group ref={groupRef}>
                <Gltf src={modelUrl} castShadow receiveShadow />
              </group>
            ) : (
              <ProceduralGroup spec={modelSpec} texture={texture} groupRef={groupRef} />
            )}
          </Stage>

          <ambientLight intensity={0.4} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} castShadow />
          <directionalLight position={[-3, -2, -1]} intensity={0.4} />

          <Grid
            renderOrder={-1}
            position={[0, -2, 0]}
            infiniteGrid
            cellSize={0.6}
            sectionSize={3}
            fadeDistance={35}
            sectionColor={accentColor}
            cellColor="#27272a"
          />

          <OrbitControls autoRotate={false} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
          <Environment preset={environmentPreset} />
        </Canvas>

        <div className="absolute bottom-4 right-4 bg-zinc-900/90 backdrop-blur px-3 py-1 rounded text-xs text-zinc-500 font-mono border border-zinc-800 pointer-events-none">
          {modelSpec ? modelSpec.meshes[0]?.name ?? 'Interactive Preview' : 'Interactive Preview'}
        </div>
      </div>
    );
  }
);

ThreeViewer.displayName = 'ThreeViewer';

export default ThreeViewer;