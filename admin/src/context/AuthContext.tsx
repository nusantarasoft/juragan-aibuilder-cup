"use client";

/**
 * Auth Context - Authentication via GraphQL Middleware
 * NO direct Supabase access
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import {
    graphql,
    queries,
    mutations,
    getStoredToken,
    getStoredRefreshToken,
    storeAuthTokens,
    clearAuthTokens,
    isAuthGraphQLError,
    ACCESS_TOKEN_KEY,
} from "@/lib/graphqlClient";
import { clearAuthPresenceCookie, setAuthPresenceCookie } from "@/lib/authCookie";
import type { User, AuthResponse } from "@/lib/graphqlTypes";
import { useAuthStore } from "@/store/useAuthStore";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "unreachable";

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
    sessionStatus: SessionStatus;
    refreshSession: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<{ error?: string; requiresTwoFactor?: boolean }>;
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    verifyTwoFactor: (code: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function applyUserSession(me: User) {
    const profile: UserProfile = {
        id: me.id,
        email: me.email,
        full_name: me.fullName,
        role: me.role,
        two_factor_enabled: false,
        created_at: me.createdAt || new Date().toISOString(),
    };
    useAuthStore.getState().syncFromAuth({
        id: me.id,
        email: me.email,
        fullName: me.fullName,
        role: me.role,
        tenantId: (me as { tenantId?: string | null }).tenantId,
    });
    return { user: me, profile };
}

async function fetchMe(accessToken: string): Promise<User | null> {
    const data = await graphql<{ me: User | null }>(queries.me, { token: accessToken });
    return data.me ?? null;
}

async function tryRefreshTokens(): Promise<string | null> {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;

    try {
        const data = await graphql<{ refreshToken: { accessToken: string; refreshToken: string } }>(
            mutations.refreshToken,
            { variables: { refreshToken } },
        );
        if (!data.refreshToken?.accessToken) return null;
        storeAuthTokens(data.refreshToken.accessToken, data.refreshToken.refreshToken);
        return data.refreshToken.accessToken;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [sessionStatus, setSessionStatus] = useState<SessionStatus>("loading");

    const markUnauthenticated = useCallback(() => {
        setUser(null);
        setProfile(null);
        setSessionStatus("unauthenticated");
        useAuthStore.getState().clearUser();
    }, []);

    const checkSession = useCallback(async () => {
        setSessionStatus("loading");
        const token = getStoredToken();
        if (!token) {
            clearAuthPresenceCookie();
            markUnauthenticated();
            return;
        }

        const fetchMeOrNull = async (accessToken: string): Promise<User | null> => {
            try {
                return await fetchMe(accessToken);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (isAuthGraphQLError(message)) return null;
                throw error;
            }
        };

        try {
            let me = await fetchMeOrNull(token);

            if (!me) {
                const refreshed = await tryRefreshTokens();
                if (refreshed) {
                    me = await fetchMeOrNull(refreshed);
                }
            }

            if (me) {
                const session = applyUserSession(me);
                setUser(session.user);
                setProfile(session.profile);
                setAuthPresenceCookie();
                setSessionStatus("authenticated");
            } else {
                clearAuthTokens();
                markUnauthenticated();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn("[auth-gate] session check unreachable:", message);
            // Keep tokens — network / middleware down must not feel like logout
            setSessionStatus("unreachable");
        }
    }, [markUnauthenticated]);

    useEffect(() => {
        void checkSession();
    }, [checkSession]);

    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key !== ACCESS_TOKEN_KEY) return;
            if (event.newValue) return;
            console.warn("[auth-gate] access token cleared in another tab");
            clearAuthPresenceCookie();
            markUnauthenticated();
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [markUnauthenticated]);

    const signIn = async (email: string, password: string) => {
        try {
            const data = await graphql<{ signIn: AuthResponse }>(mutations.signIn, {
                variables: { email, password },
            });

            if (data.signIn) {
                storeAuthTokens(data.signIn.accessToken, data.signIn.refreshToken);
                const session = applyUserSession(data.signIn.user);
                setUser(session.user);
                setProfile(session.profile);
                setSessionStatus("authenticated");
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
                variables: { email, password, name: fullName },
            });

            if (data.signUp) {
                storeAuthTokens(data.signUp.accessToken, data.signUp.refreshToken);
                const session = applyUserSession(data.signUp.user);
                setUser(session.user);
                setProfile(session.profile);
                setSessionStatus("authenticated");
                return {};
            }

            return { error: "Sign up failed" };
        } catch (error) {
            return { error: error instanceof Error ? error.message : "Sign up failed" };
        }
    };

    const verifyTwoFactor = async (code: string) => {
        if (code.length !== 6 || !/^\d+$/.test(code)) {
            return { error: "Invalid verification code" };
        }

        return {};
    };

    const signOut = async () => {
        try {
            const token = getStoredToken();
            await graphql<{ signOut: boolean }>(mutations.signOut, { token: token || undefined });
        } catch (error) {
            console.error("Sign out error:", error);
        }

        clearAuthTokens();
        markUnauthenticated();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading: sessionStatus === "loading",
                sessionStatus,
                refreshSession: checkSession,
                signIn,
                signUp,
                signOut,
                verifyTwoFactor,
            }}
        >
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
