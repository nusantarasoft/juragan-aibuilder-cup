import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NS_AUTH_COOKIE } from "@/lib/authCookie";

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (!pathname.startsWith("/admin")) {
        return NextResponse.next();
    }

    const present = request.cookies.get(NS_AUTH_COOKIE)?.value === "1";
    if (present) {
        return NextResponse.next();
    }

    console.warn("[auth-gate] middleware deny", pathname);
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ["/admin/:path*"],
};
