"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore, type AppRole } from "@/store/useAuthStore";
import { usePermissionCache } from "@/store/usePermissionCache";

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
 * the required role level. When a permissionKey is provided, also checks
 * the system permission via the permission engine (cached).
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
    const user = useAuthStore((s) => s.user);
    const hasPermission = usePermissionCache((s) => s.hasPermission);
    const fetchPermission = usePermissionCache((s) => s.fetchPermission);
    const [permGranted, setPermGranted] = useState(true);

    // Role check is always enforced
    if (!hasRole(requiredRole)) {
        return <>{fallback}</>;
    }

    // If a permissionKey is specified, check system permission (async + cached)
    useEffect(() => {
        if (!permissionKey || !user?.id) return;

        // Check cache first
        const cached = hasPermission(permissionKey);
        setPermGranted(cached);

        // Fetch in background if not cached
        fetchPermission(user.id, permissionKey).then(setPermGranted);
    }, [permissionKey, user?.id, hasPermission, fetchPermission]);

    if (permissionKey && !permGranted) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
