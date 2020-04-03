var express = require('express');
var path = require('path');
var app = new express();
var PORT = process.env.PORT || 8080;

var mongo = require('./bin/mongo');


// May want to tighten security up a bit
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});

app.use(express.static(__dirname + '/static'));
app.use('/api', require('./api'));

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, "/views/index.html"));
});

mongo.client.connect(function(err) {
    if (err) {
      console.log(err);
    } else {
        console.log("Mongo ready");
        app.listen(PORT, () => console.log(`Listening on ${ PORT }`));
    }
});
