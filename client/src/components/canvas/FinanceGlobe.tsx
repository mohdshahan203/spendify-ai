import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const FinanceGlobe: React.FC = () => {
  const globeRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (globeRef.current) {
      globeRef.current.rotation.y = time * 0.1;
      globeRef.current.rotation.x = Math.sin(time * 0.05) * 0.2;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y = -time * 0.07;
      ringRef.current.rotation.x = time * 0.03;
    }
  });

  return (
    <group position={[-2.5, 0, -2]}>
      {/* Wireframe sphere */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[1.8, 24, 24]} />
        <meshBasicMaterial
          color="#4CAF50"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
      
      {/* Outer orbits/rings */}
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.5, 0.015, 8, 100]} />
        <meshBasicMaterial
          color="#2E7D32"
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* Core glowing light */}
      <pointLight color="#4CAF50" intensity={1.5} distance={10} />
    </group>
  );
};
export default FinanceGlobe;
