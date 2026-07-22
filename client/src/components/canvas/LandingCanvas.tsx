import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Particles from './Particles';
import FinanceGlobe from './FinanceGlobe';
import CreditCard3D from './CreditCard3D';
import BlockchainNetwork from './BlockchainNetwork';
import AIBrain from './AIBrain';
import RupeeCoin3D from './RupeeCoin3D';

export const LandingCanvas: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full min-h-screen canvas-container bg-transparent">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        className="canvas-interactive"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 2]} intensity={2.0} castShadow />
        <pointLight position={[-5, -5, -2]} intensity={0.5} />
        
        <Suspense fallback={null}>
          <Particles />
          <FinanceGlobe />
          <CreditCard3D />
          <BlockchainNetwork />
          <AIBrain />
          <RupeeCoin3D position={[-1.8, -0.6, 1.2]} scale={0.75} />
          <RupeeCoin3D position={[1.5, 1.2, 0.8]} scale={0.5} rotationSpeed={1.2} />
        </Suspense>
        
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.8} minPolarAngle={Math.PI / 2.2} />
      </Canvas>
    </div>
  );
};
export default LandingCanvas;
