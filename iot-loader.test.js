'use strict';

const fs = require('fs');
const iotLoader = require('./iot-loader');

test('load', () => {
    const loxoneStructureFile = JSON.parse(fs.readFileSync('LoxAPP3-example.json', 'utf-8'));
    
    const structure = iotLoader.loadLoxoneStructure(loxoneStructureFile);
    expect(Object.values(structure.controls).length).toBe(8);
    expect(Object.values(structure.controls).filter(c => c.type === 'LightController').length).toBe(3);
    expect(Object.values(structure.controls).filter(c => c.type === 'Dimmer').length).toBe(3);
    expect(Object.values(structure.controls).filter(c => c.type === 'Switch' && c.parent).length).toBe(1);
    
    const things = iotLoader.createThings(structure);
    expect(things.length).toBe(4);
    expect(things[0].thingName).toBe('miniserver:chloe_bed:dimmer:downlights');
    expect(things[0].attributePayload.attributes.loxoneControlId).toBe('0fe3e552-0153-6032-ffff95eca2fd64fa:AI1');
    expect(things[0].attributePayload.attributes.manufacturerName).toBe('loxone');
    expect(things[0].attributePayload.attributes.friendlyName).toBe('chloe_bed_downlights');
    expect(things[0].attributePayload.attributes.name).toBe('downlights');
    expect(things[0].attributePayload.attributes.room).toBe('chloe_bed');
    expect(things[0].attributePayload.attributes.capabilities).toBe('brightness,powerState');

    expect(things[2].thingName).toBe('miniserver:master_ensuite:switch:mirror_light');
    expect(things[2].attributePayload.attributes.loxoneControlId).toBe('0ec59fd7-0288-a9e3-ffff95eca2fd64fa:AI2');
    expect(things[2].attributePayload.attributes.manufacturerName).toBe('loxone');
    expect(things[2].attributePayload.attributes.friendlyName).toBe('master_ensuite_mirror_light');
    expect(things[2].attributePayload.attributes.name).toBe('mirror_light');
    expect(things[2].attributePayload.attributes.room).toBe('master_ensuite');
    expect(things[2].attributePayload.attributes.capabilities).toBe('powerState');
});
