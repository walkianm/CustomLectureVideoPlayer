var config = {};

if(!process.env.MONGOUSER) {
    require('dotenv').config(); // Load env config if MONGOUSER missing
    console.log("Running in " + process.env.NODE_ENV + " mode.");
}

config.mongo_user = process.env.MONGOUSER;
config.mongo_pass = process.env.MONGOPASS;

module.exports = config;
