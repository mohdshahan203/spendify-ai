import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const BlockchainNetwork: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const nodesCount = 15;

  // Generate random positions for nodes
  const nodePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < nodesCount; i++) {
      positions.push([
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4
      ]);
    }
    return positions;
  }, [nodesCount]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.15;
    }
  });

  // Memoize line connection geometries
  const lineGeometries = useMemo(() => {
    return nodePositions.map((pos, idx) => {
      const nextPos = nodePositions[(idx + 1) % nodesCount];
      const points = [
        new THREE.Vector3(...pos),
        new THREE.Vector3(...nextPos)
      ];
      return new THREE.BufferGeometry().setFromPoints(points);
    });
  }, [nodePositions, nodesCount]);

  return (
    <group ref={groupRef} position={[0, -1.5, -4]}>
      {nodePositions.map((pos, idx) => (
        <group key={idx} position={pos}>
          {/* Node Sphere */}
          <mesh>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#4CAF50" transparent opacity={0.6} />
          </mesh>
          
          {/* Glowing Aura */}
          <mesh>
            <sphereGeometry args={[0.22, 8, 8]} />
            <meshBasicMaterial color="#2E7D32" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}

      {/* Render line connections between random nodes */}
      {lineGeometries.map((lineGeometry, idx) => (
        <lineSegments key={`line-${idx}`} geometry={lineGeometry}>
          <lineBasicMaterial color="#A5D6A7" transparent opacity={0.25} linewidth={1} />
        </lineSegments>
      ))}
    </group>
  );
};
export default BlockchainNetwork;
