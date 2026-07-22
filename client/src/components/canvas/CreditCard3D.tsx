import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const CreditCard3D: React.FC = () => {
  const cardRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    // Parallax effect following mouse coordinates
    const x = (state.pointer.x * Math.PI) / 10;
    const y = (state.pointer.y * Math.PI) / 10;

    if (cardRef.current) {
      cardRef.current.rotation.x = THREE.MathUtils.lerp(cardRef.current.rotation.x, -y, 0.1);
      cardRef.current.rotation.y = THREE.MathUtils.lerp(cardRef.current.rotation.y, x, 0.1);
      
      // Floating animation
      const elapsed = state.clock.getElapsedTime();
      cardRef.current.position.y = THREE.MathUtils.lerp(cardRef.current.position.y, Math.sin(elapsed * 1.5) * 0.15, 0.1);
    }
  });

  return (
    <group ref={cardRef} position={[2, 0.2, 1]}>
      {/* Outer Card Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.2, 2.0, 0.08]} />
        <meshPhysicalMaterial
          color="#2E7D32"
          roughness={0.15}
          metalness={0.8}
          transmission={0.4} // Glassmorphism translucent look
          thickness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Credit Card Chip */}
      <mesh position={[-1.0, 0.3, 0.05]}>
        <boxGeometry args={[0.45, 0.35, 0.01]} />
        <meshStandardMaterial
          color="#f59e0b"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Futuristic glowing accents */}
      <mesh position={[1.1, -0.6, 0.051]}>
        <planeGeometry args={[0.6, 0.1]} />
        <meshBasicMaterial color="#4CAF50" />
      </mesh>
      
      <mesh position={[0.7, -0.6, 0.051]}>
        <planeGeometry args={[0.1, 0.1]} />
        <meshBasicMaterial color="#E8F5E9" />
      </mesh>
    </group>
  );
};
export default CreditCard3D;
