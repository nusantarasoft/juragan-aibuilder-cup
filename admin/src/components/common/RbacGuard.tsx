"use client";

import React from "react";
import { useAuthStore, type AppRole } from "@/store/useAuthStore";

interface RbacGuardProps {
    /** Minimum role required to render children */
    requiredRole: AppRole;
    /** Content to render when authorized */
    children: React.ReactNode;
    /** Optional fallback when not authorized (defaults to null / hidden) */
    fallback?: React.ReactNode;
}

/**
 * Role-Based Access Control wrapper.
 *
 * Renders children only when the current user's role meets or exceeds
 * the required role level.
 *
 * Role hierarchy (highest → lowest):
 *   super_admin (100) → admin (80) → manager (60) → viewer (40) → guest (20)
 *
 * @example
 * ```tsx
 * <RbacGuard requiredRole="manager">
 *   <Button>Export to PDF</Button>
 * </RbacGuard>
 * ```
 */
export default function RbacGuard({ requiredRole, children, fallback = null }: RbacGuardProps) {
    const hasRole = useAuthStore((s) => s.hasRole);

    if (!hasRole(requiredRole)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
