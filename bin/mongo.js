var config = require('./config');
const MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID
const uri = "mongodb+srv://" + config.mongo_user + ":" + config.mongo_pass + "@primary-xqeyo.mongodb.net/test?retryWrites=true&w=majority";

const mongo_options = {
            useNewUrlParser: true,
            keepAlive: 1,
            connectTimeoutMS: 30000,
            reconnectTries: Number.MAX_VALUE,
            reconnectInterval: 1000,
            useUnifiedTopology: true,
        };

const client = new MongoClient(uri, mongo_options);


function startNewSession(collection_name, source, time, duration, callback) {
    var new_session = {
        time: time,
        source: source,
        duration: duration,
        events: []
    };

    var collection = client.db('videoAnalytics').collection(collection_name);

    collection.insertOne(new_session, function(err, id) {
        if (err) {
            console.log("Insertion failed!");
            callback(err, null);
        } else {
            // Return the id of the created session
            collection.findOne(
                { type: "quiz" },
                function(err, quiz) {
                    if (err) {
                        console.log("No quiz found!");
                        callback(err, { session_id: id.ops[0]._id});
                    } else {
                        callback(err, { session_id: id.ops[0]._id, quiz: quiz });
                    }
                }
            );
        }
    });
}


function appendEventsToSession(session, collection_name, events, callback) {
    var collection = client.db('videoAnalytics').collection(collection_name);

    try {
        collection.updateOne(
            {'_id': ObjectID(session)},
            {$push: {'events': {$each: events}}},
            function(err, data) {
                callback(err);
            }
        );
    } catch(e) {
        callback(e);
    }
}


function getScript(collection_name, callback) {
    var collection = client.db('videoAnalytics').collection(collection_name);

    collection.findOne(
        { type: "script" },
        function(err, script) {
            if (err) {
                console.log("No script found!");
                callback(err, {});
            } else {
                callback(err, { script: script.content });
            }
        }
    );
}

module.exports = {
  client,
  startNewSession,
  appendEventsToSession,
  getScript,
};
