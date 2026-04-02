import test from 'node:test';
import assert from 'node:assert/strict';

const { parseCSV, parseICSEvents, icsEventsToStops } = await import('../.test-dist/parse-file.js');

test('parseCSV skips header row and parses basic csv', () => {
  const text = [
    '天,名称,地址,到达时间,时长(分),类型,备注',
    '1,浅草寺,东京浅草,09:00,90,观光,',
  ].join('\n');

  const stops = parseCSV(text);
  assert.equal(stops.length, 1);
  assert.equal(stops[0].day, 1);
  assert.equal(stops[0].title, '浅草寺');
  assert.equal(stops[0].earliestStart, '09:00');
});

test('parseCSV parses tsv-delimited rows', () => {
  const text = [
    '天\t名称\t地址\t到达时间\t时长(分)\t类型\t备注',
    '2\t上野公园\t东京\t10:30\t60\tsightseeing\t',
  ].join('\n');

  const stops = parseCSV(text);
  assert.equal(stops.length, 1);
  assert.equal(stops[0].day, 2);
  assert.equal(stops[0].title, '上野公园');
});

test('parseCSV handles quoted commas in csv fields', () => {
  const text = [
    '天,名称,地址,到达时间,时长(分),类型,备注',
    '1,"Tokyo, Station","Chiyoda, Tokyo",09:00,45,sightseeing,"arrive early"',
  ].join('\n');

  const stops = parseCSV(text);
  assert.equal(stops.length, 1);
  assert.equal(stops[0].title, 'Tokyo, Station');
  assert.equal(stops[0].location, 'Chiyoda, Tokyo');
});

test('icsEventsToStops remaps day numbers after date filtering', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'DTSTART:20260501T090000',
    'DTEND:20260501T100000',
    'SUMMARY:Event A',
    'LOCATION:Tokyo',
    'DESCRIPTION:meeting',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'DTSTART:20260502T130000',
    'DURATION:PT30M',
    'SUMMARY:Event B',
    'LOCATION:Osaka',
    'DESCRIPTION:meal',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  const events = parseICSEvents(ics);
  const filtered = icsEventsToStops(events, '20260502', '20260502');

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].day, 1);
  assert.equal(filtered[0].durationMin, 30);
  assert.equal(filtered[0].title, 'Event B');
});

test('icsEventsToStops falls back to default duration', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'DTSTART:20260503T080000',
    'SUMMARY:No Duration Event',
    'LOCATION:Kyoto',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  const events = parseICSEvents(ics);
  const stops = icsEventsToStops(events);

  assert.equal(stops.length, 1);
  assert.equal(stops[0].durationMin, 90);
});
