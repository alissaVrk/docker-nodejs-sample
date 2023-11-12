const db = require('../persistence');
const { v4: uuid } = require('uuid');
const { getAllSessions } = require('../aws-api/sessions-db');
const { sendToClient } = require('../aws-api/sockets');

async function sendItemsToAll() {
    const sessions = await getAllSessions();
    console.log('sessions', sessions);
    const items = await db.getItems();
    console.log('items', items);
    sessions.forEach((sessionid) => {
        sendToClient(sessionid, {
            type: 'getItems',
            data: items,
        });
    });
}

module.exports = async (req, res) => {
    const item = {
        id: uuid(),
        name: req.body.name,
        completed: false,
    };

    await db.storeItem(item);
    //we are not waiting here, it should be in the background
    sendItemsToAll();
    res.send(item);
};
