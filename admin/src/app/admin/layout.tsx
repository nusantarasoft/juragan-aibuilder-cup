import { Suspense } from "react";
import AuthGate from "@/components/auth/AuthGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={null}>
            <AuthGate>{children}</AuthGate>
        </Suspense>
    );
}
