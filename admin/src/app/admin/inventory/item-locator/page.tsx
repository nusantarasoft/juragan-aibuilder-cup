"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Spin } from "antd";

function ItemLocatorRedirect() {
    const router = useRouter();
    const params = useSearchParams();

    useEffect(() => {
        const q = new URLSearchParams();
        q.set('tab', 'items');
        const bin = params.get('bin');
        const zone = params.get('zone');
        if (bin) q.set('bin', bin);
        if (zone) q.set('zone', zone);
        router.replace(`/admin/inventory/warehouse-map?${q.toString()}`);
    }, [router, params]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <Spin size="large" tip="Redirecting to Warehouse Explorer..." />
        </div>
    );
}

export default function ItemLocatorPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><Spin size="large" /></div>}>
            <ItemLocatorRedirect />
        </Suspense>
    );
}
