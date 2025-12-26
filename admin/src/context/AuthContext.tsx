"use client";

/**
 * Auth Context - Authentication via GraphQL Middleware
 * NO direct Supabase access
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { graphql, queries, mutations } from "@/lib/graphqlClient";
import type { User, AuthResponse, SignOutResponse } from "@/lib/graphqlTypes";

// Token storage keys
const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

// User profile type for backward compatibility
interface UserProfile {
    id: string;
    email: string;
    full_name?: string;
    role: string;
    two_factor_enabled: boolean;
    two_factor_secret?: string;
    created_at: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error?: string; requiresTwoFactor?: boolean }>;
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    verifyTwoFactor: (code: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get stored token
const getStoredToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
};

// Helper to store tokens
const storeTokens = (accessToken: string, refreshToken: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

// Helper to clear tokens
const clearTokens = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [pendingTwoFactor, setPendingTwoFactor] = useState(false);

    useEffect(() => {
        // Check for existing session on mount
        checkSession();
    }, []);

    const checkSession = async () => {
        const token = getStoredToken();
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const data = await graphql<{ me: User }>(queries.me, { token: token || undefined });
            if (data.me) {
                setUser(data.me);
                setProfile({
                    id: data.me.id,
                    email: data.me.email,
                    full_name: data.me.fullName,
                    role: data.me.role,
                    two_factor_enabled: false,
                    created_at: data.me.createdAt || new Date().toISOString(),
                });
            }
        } catch (error) {
            console.error("Session check failed:", error);
            clearTokens();
        }

        setLoading(false);
    };

    const signIn = async (email: string, password: string) => {
        try {
            const data = await graphql<{ signIn: AuthResponse }>(mutations.signIn, {
                variables: { email, password },
            });

            if (data.signIn) {
                storeTokens(data.signIn.accessToken, data.signIn.refreshToken);
                setUser(data.signIn.user);
                setProfile({
                    id: data.signIn.user.id,
                    email: data.signIn.user.email,
                    full_name: data.signIn.user.fullName,
                    role: data.signIn.user.role,
                    two_factor_enabled: false,
                    created_at: new Date().toISOString(),
                });
                return {};
            }

            return { error: "Sign in failed" };
        } catch (error) {
            return { error: error instanceof Error ? error.message : "Sign in failed" };
        }
    };

    const signUp = async (email: string, password: string, fullName?: string) => {
        try {
            const data = await graphql<{ signUp: AuthResponse }>(mutations.signUp, {
                variables: { email, password, fullName },
            });

            if (data.signUp) {
                storeTokens(data.signUp.accessToken, data.signUp.refreshToken);
                setUser(data.signUp.user);
                setProfile({
                    id: data.signUp.user.id,
                    email: data.signUp.user.email,
                    full_name: data.signUp.user.fullName,
                    role: data.signUp.user.role,
                    two_factor_enabled: false,
                    created_at: new Date().toISOString(),
                });
                return {};
            }

            return { error: "Sign up failed" };
        } catch (error) {
            return { error: error instanceof Error ? error.message : "Sign up failed" };
        }
    };

    const verifyTwoFactor = async (code: string) => {
        // TODO: Implement 2FA verification via GraphQL
        if (code.length !== 6 || !/^\d+$/.test(code)) {
            return { error: "Invalid verification code" };
        }

        setPendingTwoFactor(false);
        return {};
    };

    const signOut = async () => {
        try {
            const token = getStoredToken();
            await graphql<{ signOut: SignOutResponse }>(mutations.signOut, { token: token || undefined });
        } catch (error) {
            console.error("Sign out error:", error);
        }

        clearTokens();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            signIn,
            signUp,
            signOut,
            verifyTwoFactor,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
