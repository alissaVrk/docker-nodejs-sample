const TABLE_NAME = process.env.SESSIONS_NAME;
const {
    DynamoDBClient,
    PutItemCommand,
    DeleteItemCommand,
    ScanCommand,
} = require('@aws-sdk/client-dynamodb');

function getDB() {
    try {
        console.log('AWS REGION', process.env.AWS_REGION);
        const client = new DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        return client;
    } catch (err) {
        console.log('create DB client', err);
    }
}

const client = getDB();

function putSession(sessionid){
    const command = new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
            sessionid: { S: sessionid },
        },
    });
    return client.send(command);
}

function deleteSession(sessionid){
     const command = new DeleteItemCommand({
         TableName: TABLE_NAME,
         Key: {
             sessionid: { S: sessionid },
         },
     });
    return client.send(command);
}

async function getAllSessions(){
    const command = new ScanCommand({
        TableName: TABLE_NAME,
    });
    const res = await client.send(command);
    console.log('getAllSessions', res);
    return res.Items.map((item) => item.sessionid.S);
}

module.exports = {
    putSession,
    deleteSession,
    getAllSessions,
};