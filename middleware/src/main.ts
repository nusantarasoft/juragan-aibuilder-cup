import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import * as express from 'express';

async function bootstrap() {
    // rawBody: true disables JSON parsing and breaks POST /graphql (login, notebooks, etc.)
    const app = await NestFactory.create(AppModule, { bodyParser: false });

    app.use(
        express.json({
            limit: '50mb',
            verify: (
                req: express.Request & { rawBody?: Buffer },
                _res: express.Response,
                buf: Buffer,
            ) => {
                if (req.originalUrl?.includes('/api/studio/whatsapp/webhook')) {
                    req.rawBody = buf;
                }
            },
        }),
    );

    // Enable CORS for frontend apps
    app.enableCors({
        origin: [
            'http://localhost:3000',      // Landing page local
            'http://localhost:3001',      // Admin local dev server
            'http://localhost:3003',      // Admin local (alternative port)
            'http://127.0.0.1:3000',      // Landing page IP
            'http://127.0.0.1:3001',      // Admin IP dev server
            'http://127.0.0.1:3003',      // Admin IP (alternative port)
            'http://landing-page:3000',   // Landing page container
            'http://admin:3003',          // Admin container
        ],
        credentials: true,
    });

    // GraphQL multipart only — must NOT be global or plain multipart (e.g. POST /studio/upload) breaks with
    // "Disordered multipart fields" (graphql-multipart-request-spec).
    app.use('/graphql', graphqlUploadExpress({ maxFileSize: 50000000, maxFiles: 10 }));

    const port = process.env.PORT || 4001;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Middleware running on http://localhost:${port}/graphql`);
}
bootstrap();
