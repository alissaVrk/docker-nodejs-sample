const {putSession, deleteSession} = require('../aws-api/sessions-db');

module.exports = {
    connect: async (req, res) => {
        console.log('connect', req.headers.sessionid);
        try {
            await putSession(req.headers.sessionid);
        } catch (err) {
            console.log(err);
            res.sendStatus(500);
            return false;
        }
        res.sendStatus(200);
    },
    disconnect: async (req, res) => {
        console.log('disconnect', req.headers.sessionid);
        try {
            await deleteSession(req.headers.sessionid);
        } catch (err) {
            console.log(err);
            res.sendStatus(500);
            return false;
        }
        res.sendStatus(200);
    },
}