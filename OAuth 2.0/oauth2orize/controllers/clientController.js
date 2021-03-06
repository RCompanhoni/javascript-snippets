var Client = require('../models/client');

exports.postClients = function (req, res) {
    var client = new Client();

    client.name = req.body.name;
    client.clientId = req.body.clientId;
    client.secret = req.body.secret;
    client.userId = req.user._id;

    client.save(function (err) {
        if (err)
            res.send(err);

        res.json({ message: 'OAuth 2.0 Client Added', data: client });
    });
};

exports.getClients = function (req, res) {
    Client.find({ userId: req.user._id }, function (err, clients) {
        if (err)
            res.send(err);

        res.json(clients);
    });
};