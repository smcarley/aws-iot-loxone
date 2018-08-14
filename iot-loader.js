'use strict';

const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

var AWS = require('aws-sdk');
AWS.config.loadFromPath('./credentials-aws.json');
var iot = new AWS.Iot({ endpoint: config.aws.endpoint });

function run() {
    const fetch = require('node-fetch');
    load(fetch, `http://${config.loxoneUri}/data/LoxAPP3.json`);
}

module.exports.run = run;

async function load(fetch, url) {
    await reset();
    fetch(url)
        .then(response => response.json())
        .then(loadLoxoneStructure)
        .then(createThings)
        .then(loadThings);
}

async function reset() {
    let resp;

    console.log(`*** Getting things in group ${config.aws.thingGroup}`);
    const things = await iot.listThingsInThingGroup({ thingGroupName: config.aws.thingGroup }).promise()
        .catch((e) => { if (e.name == 'ResourceNotFoundException') { return } else { throw e } });
    if (things) { console.log(things) } else return;

    console.log(`*** Removing ${things.things.length} things from group ${config.aws.thingGroup}`);
    for (const thing of things.things) {
        console.log(`*** Removing thing ${thing}`);
        resp = await iot.deleteThing({ thingName: thing }).promise();
        console.log(`*** Thing ${thing} removed`);
    };
    console.log(`*** Removing group ${config.aws.thingGroup}`);
    await iot.deleteThingGroup({ thingGroupName: config.aws.thingGroup }).promise();
    console.log('*** Group removed');
    console.log('*** Reset complete');
}
module.exports.reset = reset;

function loadLoxoneStructure(json) {
    let structure = {
        miniServerName: json.msInfo.msName,
        controls: {},
        rooms: {}
    }

    for (let uuid in json.controls) {
        structure.controls[uuid] = json.controls[uuid];

        if (json.controls[uuid].hasOwnProperty('subControls')) {
            for (let sub_uuid in json.controls[uuid].subControls) {
                structure.controls[sub_uuid] = json.controls[uuid].subControls[sub_uuid];
                structure.controls[sub_uuid].parent = uuid;
                structure.controls[sub_uuid].room = json.controls[uuid].room;
                structure.controls[sub_uuid].cat = json.controls[uuid].cat;
            }
        }
    }

    for (var uuid in json.rooms) {
        structure.rooms[uuid] = json.rooms[uuid];
    }

    return structure;
}

module.exports.loadLoxoneStructure = loadLoxoneStructure;

function createThings(structure) {
    let lights = Object.values(structure.controls).filter(c => (
        c.type === 'Dimmer' && c.name != 'Overall Brightness') ||
        (c.type === 'Switch' && c.parent)
    );

    var things = lights.map(d => {
        const miniServerName = structure.miniServerName.toLowerCase();
        const room = structure.rooms[d.room].name.replace('Bedroom', 'Bed').replace(/\s/g, '_').toLowerCase();
        const name = d.name.replace(/\s/g, '_').toLowerCase();
        const type = d.type.toLowerCase();

        const attr = {};
        attr.miniServerName = miniServerName;
        attr.room = room;
        attr.type = type;
        attr.name = name;
        attr.loxoneControlId = d.uuidAction.replace('/', ':');
        attr.manufacturerName = 'loxone';
        attr.friendlyName = room + '_' + name;
        attr.capabilities = type == 'dimmer' ? 'brightness,powerState' : 'powerState';
        return {
            thingName: miniServerName + ':' + room + ':' + type + ':' + name,
            thingTypeName: 'Lighting',
            attributePayload: {
                attributes: attr
            }
        }
    });
    return things;
}

module.exports.createThings = createThings;

async function loadThings(things) {
    let resp;
    console.log(`*** Creating thing group ${config.aws.thingGroup}`);
    resp = await iot.createThingGroup({ thingGroupName: config.aws.thingGroup }).promise();
    console.log(JSON.stringify(resp));

    console.log(`*** Attaching policy to thing group ${config.aws.thingGroup}`);
    resp = await iot.attachPolicy({
        policyName: config.aws.policy,
        target: 'arn:' + config.aws.account + ':thinggroup/' + config.aws.thingGroup
    }).promise();
    console.log(JSON.stringify(resp));

    for (const thing of things) {
        console.log(`*** Creating thing ${thing.thingName}`);
        resp = await iot.createThing(thing).promise();
        console.log(JSON.stringify(resp));

        console.log(`*** Adding thing ${thing.thingName} to group`);
        resp = await iot.addThingToThingGroup({
            thingGroupName: config.aws.thingGroup,
            thingName: thing.thingName
        }).promise();
        console.log(JSON.stringify(resp));
    }
    console.log('*** Load complete');
}