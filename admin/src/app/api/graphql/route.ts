import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getUpstreamGraphqlUrl(): string {
    if (process.env.GRAPHQL_API_URL) {
        return process.env.GRAPHQL_API_URL;
    }
    if (process.env.MIDDLEWARE_URL) {
        return `${process.env.MIDDLEWARE_URL.replace(/\/$/, '')}/graphql`;
    }
    if (
        process.env.NEXT_PUBLIC_GRAPHQL_URL &&
        !process.env.NEXT_PUBLIC_GRAPHQL_URL.startsWith('/')
    ) {
        return process.env.NEXT_PUBLIC_GRAPHQL_URL;
    }
    return 'http://middleware:4001/graphql';
}

export async function POST(request: NextRequest) {
    const upstreamUrl = getUpstreamGraphqlUrl();
    try {
        const body = await request.text();
        const headers: Record<string, string> = {
            'Content-Type': request.headers.get('content-type') || 'application/json',
        };
        const authorization = request.headers.get('authorization');
        if (authorization) {
            headers['Authorization'] = authorization;
        }
        const cookie = request.headers.get('cookie');
        if (cookie) {
            headers['Cookie'] = cookie;
        }

        const upstreamRes = await fetch(upstreamUrl, {
            method: 'POST',
            headers,
            body,
            cache: 'no-store',
        });

        const text = await upstreamRes.text();
        return new NextResponse(text, {
            status: upstreamRes.status,
            headers: {
                'Content-Type': upstreamRes.headers.get('content-type') || 'application/json',
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                errors: [
                    {
                        message: `GraphQL upstream unreachable (${upstreamUrl}): ${error?.message || 'Unknown error'}`,
                    },
                ],
            },
            { status: 502 },
        );
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        upstream: getUpstreamGraphqlUrl(),
    });
}
