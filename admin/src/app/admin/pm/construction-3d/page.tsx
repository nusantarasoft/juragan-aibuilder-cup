"use client";

import dynamic from 'next/dynamic';

const Construction3D = dynamic(() => import('./Construction3D'), {
  ssr: false,
});

import { Suspense } from 'react';
import { Spin } from 'antd';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 120, textAlign: 'center' }}><Spin size="large" /></div>}>
      <Construction3D />
    </Suspense>
  );
}
