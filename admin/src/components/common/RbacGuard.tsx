"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore, type RoleRequirement } from "@/store/useAuthStore";
import { usePermissionCache } from "@/store/usePermissionCache";

interface RbacGuardProps {
    /** Minimum role required to render children */
    requiredRole: RoleRequirement;
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
 * CMS login roles: super_admin → admin.
 * Legacy requirement aliases (manager/viewer/guest) map to admin.
 */
export default function RbacGuard({ requiredRole, permissionKey, children, fallback = null }: RbacGuardProps) {
    const hasRole = useAuthStore((s) => s.hasRole);
    const user = useAuthStore((s) => s.user);
    const hasPermission = usePermissionCache((s) => s.hasPermission);
    const fetchPermission = usePermissionCache((s) => s.fetchPermission);
    const [permGranted, setPermGranted] = useState(true);

    if (!hasRole(requiredRole)) {
        return <>{fallback}</>;
    }

    useEffect(() => {
        if (!permissionKey || !user?.id) return;

        const cached = hasPermission(permissionKey);
        setPermGranted(cached);

        fetchPermission(user.id, permissionKey).then(setPermGranted);
    }, [permissionKey, user?.id, hasPermission, fetchPermission]);

    if (permissionKey && !permGranted) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
