import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*', // For demo purposes. In production, restrict this.
    },
    namespace: '/facility',
})
export class FacilityGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(FacilityGateway.name);

    handleConnection(client: Socket) {
        this.logger.log(`Client connected to Facility WS: ${client.id}`);
        client.emit('connection_established', { message: 'Connected to Facility Command Center' });
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from Facility WS: ${client.id}`);
    }

    // Mock an active stream of data for testing
    // In production, this would be driven by MQTT/Kafka listeners hitting the service
    @SubscribeMessage('subscribe_telemetry')
    handleSubscribeTelemetry(client: Socket, @MessageBody() data: any) {
        this.logger.log(`Client ${client.id} subscribed to telemetry`);
        
        // Push fake telemetry every 5 seconds
        const interval = setInterval(() => {
            const mockUpdate = {
                timestamp: new Date().toISOString(),
                pue: 1.2 + (Math.random() * 0.1),
                totalPowerKw: 2500 + (Math.random() * 100),
                activeAlarms: Math.floor(Math.random() * 5),
            };
            client.emit('telemetry_update', mockUpdate);
        }, 5000);

        // Store interval on socket to clear on disconnect
        (client as any).telemetryInterval = interval;
    }

    @SubscribeMessage('unsubscribe_telemetry')
    handleUnsubscribeTelemetry(client: Socket) {
        if ((client as any).telemetryInterval) {
            clearInterval((client as any).telemetryInterval);
        }
    }
}
