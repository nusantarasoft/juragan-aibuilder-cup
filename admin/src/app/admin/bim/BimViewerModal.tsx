import React, { Suspense } from 'react';
import { Modal } from 'antd';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Stage } from '@react-three/drei';

function ModelRenderer({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function BimViewerModal({ 
  visible, 
  onClose, 
  modelUrl, 
  modelName 
}: { 
  visible: boolean; 
  onClose: () => void; 
  modelUrl: string | null; 
  modelName: string;
}) {
  return (
    <Modal
      title={`3D Viewer - ${modelName}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      bodyStyle={{ height: 600, padding: 0, background: '#141414' }}
      destroyOnClose
    >
      {modelUrl ? (
        <Canvas shadows dpr={[1, 2]} camera={{ position: [5, 5, 5], fov: 50 }}>
          <Suspense fallback={null}>
            <Stage environment="city" intensity={0.5}>
              <ModelRenderer url={modelUrl} />
            </Stage>
          </Suspense>
          <OrbitControls makeDefault autoRotate />
        </Canvas>
      ) : (
        <div style={{ color: '#fff', textAlign: 'center', paddingTop: 280 }}>No model loaded</div>
      )}
    </Modal>
  );
}
