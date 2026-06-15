"use client";

import dynamic from 'next/dynamic';

const BimViewer = dynamic(() => import('./BimViewer'), {
  ssr: false,
});

export default function Page() {
  return <BimViewer />;
}
