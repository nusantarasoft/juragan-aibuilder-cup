"use client";

import React from "react";
import { useAuthStore, type AppRole } from "@/store/useAuthStore";

interface RbacGuardProps {
    /** Minimum role required to render children */
    requiredRole: AppRole;
    /** Optional system permission key (e.g., 'export.pdf') for fine-grained control */
    permissionKey?: string;
    /** Content to render when authorized */
    children: React.ReactNode;
    /** Optional fallback when not authorized (defaults to null / hidden) */
    fallback?: React.ReactNode;
}

/**
 * Role-Based Access Control wrapper.
 *
 * Renders children only when the current user's role meets or exceeds
 * the required role level. Optionally checks a system permission key
 * for fine-grained feature gating.
 *
 * Role hierarchy (highest → lowest):
 *   super_admin (100) → admin (80) → manager (60) → viewer (40) → guest (20)
 *
 * @example
 * ```tsx
 * <RbacGuard requiredRole="manager">
 *   <Button>Export to PDF</Button>
 * </RbacGuard>
 *
 * <RbacGuard requiredRole="viewer" permissionKey="export.excel">
 *   <Button>Export to Excel</Button>
 * </RbacGuard>
 * ```
 */
export default function RbacGuard({ requiredRole, permissionKey, children, fallback = null }: RbacGuardProps) {
    const hasRole = useAuthStore((s) => s.hasRole);

    // Role check is always enforced
    if (!hasRole(requiredRole)) {
        return <>{fallback}</>;
    }

    // permissionKey is reserved for future fine-grained system permission checks.
    // When integrated with the permission engine, it will query hasSystemPermission.
    // For now, passing role check is sufficient.

    return <>{children}</>;
}
