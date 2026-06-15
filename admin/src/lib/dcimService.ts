import { graphql } from './graphqlClient';


export const dcimService = {
    async getRacks(tenantId: string) {
        const query = `
            query GetRacks($tenantId: String!) {
                getRacks(tenantId: $tenantId) {
                    id
                    name
                    roomId
                    rowId
                    positionX
                    positionY
                    totalU
                    maxWeight
                    status
                }
            }
        `;
        return graphql(query, { variables: { tenantId } });
    },
    
    async getDevicesByRack(rackId: string) {
        const query = `
            query GetDevicesByRack($rackId: String!) {
                getDevices(filters: { rackId: $rackId }) {
                    id
                    name
                    uPosition
                    uHeight
                    status
                    deviceType {
                        name
                        manufacturer
                    }
                }
            }
        `;
        return graphql(query, { variables: { rackId } });
    },

    async getThermalMap(roomId: string) {
        const query = `
            query GetThermalMap($roomId: String!) {
                getThermalMap(roomId: $roomId) {
                    sensorId
                    x
                    y
                    z
                    temperature
                    humidity
                }
            }
        `;
        return graphql(query, { variables: { roomId } });
    }
};
