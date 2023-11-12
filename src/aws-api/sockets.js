const {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
} = require('@aws-sdk/client-apigatewaymanagementapi');

function getApiGatewayClient() {
    try {
        console.log('connection url', process.env.CONNECTION_URL);
        const client = new ApiGatewayManagementApiClient({
            endpoint:
                process.env.CONNECTION_URL,
        });
        return client;
    } catch (err) {
        console.log('create API Gateway client', err);
    }
}

const client = getApiGatewayClient();

async function sendToClient(connectionId, data) {
    const command = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(data),
    });
    try {
        await client.send(command);
    } catch (err) {
        console.log('sendToClient', err);
        return false;
    }
    console.log('sendToClient', connectionId);
}

module.exports = {
    sendToClient,
};