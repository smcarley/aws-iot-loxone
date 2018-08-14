'use strict';

const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

const AWS = require('aws-sdk');
AWS.config.loadFromPath('./credentials-aws.json');
var iot = new AWS.Iot({ endpoint: config.aws.endpoint });

function listTargetsForPolicy() {
    iot.listTargetsForPolicy({ policyName: config.aws.policy }, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(JSON.stringify(data));           // successful response
    });
}

async function main() {
    try {
        const iotLoader = require('./iot-loader');
        iotLoader.run();
        console.log('*** Done');
    } catch (error) {
        console.error(error)
    }
}

main();