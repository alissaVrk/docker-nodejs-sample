const TABLE_NAME = process.env.SESSIONS_NAME;
const { DynamoDBClient, PutItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

function getDB(){
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

module.exports = {
    connect: async (req, res) => {
        console.log('connect', req.headers.sessionid);
        const command = new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
                sessionid: { S: req.headers.sessionid },
            },
        });
        try {
            await client.send(command);
        } catch (err) {
            console.log(err);
            res.sendStatus(500);
            return false;
        }
        res.sendStatus(200);
    },
    disconnect: async (req, res) => {
        console.log('disconnect', req.headers.sessionid);
        const command = new DeleteItemCommand({
            TableName: TABLE_NAME,
            Key: {
                sessionid: { S: req.headers.sessionid },
            },
        });
        try {
            await client.send(command);
        } catch (err) {
            console.log(err);
            res.sendStatus(500);
            return false;
        }
        res.sendStatus(200);
    },
}