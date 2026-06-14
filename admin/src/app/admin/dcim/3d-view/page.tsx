"use client";

import dynamic from 'next/dynamic';

const Dcim3dView = dynamic(() => import('./Dcim3dView'), {
  ssr: false,
});

export default function Page() {
  return <Dcim3dView />;
}
