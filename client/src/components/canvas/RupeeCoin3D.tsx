import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RupeeCoinProps {
  position?: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
}

export const RupeeCoin3D: React.FC<RupeeCoinProps> = ({ 
  position = [-1.5, -0.5, 1.2], 
  scale = 0.6,
  rotationSpeed = 0.8 
}) => {
  const coinRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (coinRef.current) {
      // Gentle spin
      coinRef.current.rotation.y = elapsed * rotationSpeed;
      
      // Gentle wobble / tilt relative to mouse
      coinRef.current.rotation.x = THREE.MathUtils.lerp(
        coinRef.current.rotation.x, 
        Math.PI / 6 + (state.pointer.y * Math.PI) / 8, 
        0.05
      );
      
      // Floating sinusoidal motion
      coinRef.current.position.y = position[1] + Math.sin(elapsed * 1.8) * 0.15;
    }
  });

  return (
    <group ref={coinRef} position={position} scale={[scale, scale, scale]}>
      {/* Coin Base Cylinder (thin disc) */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 0.12, 32]} />
        <meshPhysicalMaterial 
          color="#ffb300" // Golden/Warning secondary color
          metalness={0.9} 
          roughness={0.12} 
          clearcoat={0.8}
        />
      </mesh>

      {/* Raised Rim Front */}
      <mesh position={[0, 0.065, 0]}>
        <ringGeometry args={[0.85, 0.95, 32]} />
        <meshStandardMaterial 
          color="#ffa000" 
          metalness={0.9} 
          roughness={0.1} 
        />
      </mesh>

      {/* Raised Rim Back */}
      <mesh position={[0, -0.065, 0]} rotation={[Math.PI, 0, 0]}>
        <ringGeometry args={[0.85, 0.95, 32]} />
        <meshStandardMaterial 
          color="#ffa000" 
          metalness={0.9} 
          roughness={0.1} 
        />
      </mesh>

      {/* Rupee Symbol Mockup (Raised center bar design) */}
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.1]} />
        <meshStandardMaterial color="#ffe082" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.07, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.35, 0.05, 0.1]} />
        <meshStandardMaterial color="#ffe082" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.07, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.35, 0.05, 0.1]} />
        <meshStandardMaterial color="#ffe082" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

export default RupeeCoin3D;
