var bodyParser = require('body-parser');
var assert = require('assert');
var express = require('express');
var router = new express();

var mongo = require('./bin/mongo');

router.use(bodyParser.json());

router.post('/sessions', function(req, res) {
    try {
        assert(req.body.time != null);
        assert(req.body.source != null);
        assert(req.body.duration != null);
        assert(req.body.collection != null);

        mongo.startNewSession(req.body.collection, req.body.source, req.body.time, req.body.duration, function(err, response) {
            if (err) {
                console.log(err);
                res.send(null);
            } else {
                res.send(response);
            }
        });
    } catch(e) {
        console.log("Error: " + e);
        // TODO
        // better error response
        res.send(null);
    }
    // Failed to start session
});

var analytics = function(req, res) {
    try {
        assert(req.body.events != null);
        assert(req.body.session != null);
        assert(req.body.collection != null);

        mongo.appendEventsToSession(req.body.session, req.body.collection, req.body.events, function(err) {
            if (err) {
                console.log(err);
                res.send(null);
            } else {
                res.send("SUCCESS");
            }
        });
    } catch(e) {
        console.log("Analytics Error: " + e);
        // TODO
        // better error response
        res.send(null);
    }
};

router.post('/analytics', analytics);
// duplicate route for analytics posts
router.post('/a', analytics);

router.post('/script', function(req, res) {
    try {
        console.log(req.body);
        assert(req.body.collection != null);

        mongo.getScript(req.body.collection, function(err, response) {
            if (err) {
                console.log(err);
                res.send(null);
            } else {
                res.send(response);
            }
        });
    } catch(e) {
        console.log("Script Error: " + e)
    }
});

module.exports = router;
