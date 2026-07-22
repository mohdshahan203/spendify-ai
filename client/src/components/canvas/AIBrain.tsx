import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const AIBrain: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const count = 120;

  // Mathematically distribute points to look like a double-lobed brain structure
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Define a dual lobe structure using parametric trigonometry
      const hemisphere = i % 2 === 0 ? 1 : -1;
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      
      const r = 1.0 + 0.3 * Math.sin(theta * 3) * Math.cos(phi * 4);
      
      const x = r * Math.sin(phi) * Math.cos(theta) + (0.35 * hemisphere);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      
      arr[idx] = x;
      arr[idx + 1] = y;
      arr[idx + 2] = z;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.12;
      groupRef.current.rotation.z = Math.sin(elapsed * 0.4) * 0.1;
      
      // Pulse scale (breathing animation)
      const scale = 1.0 + Math.sin(elapsed * 2) * 0.05;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.8, -3.5]}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#4CAF50"
          size={0.08}
          sizeAttenuation
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Visual core light */}
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#2E7D32" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};
export default AIBrain;
