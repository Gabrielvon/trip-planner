import test from 'node:test';
import assert from 'node:assert/strict';

const { parseCSV, parseFileText, parseICSEvents, icsEventsToStops } = await import(
  '../.test-dist/parse-file.js'
);

function expectOk(result) {
  assert.equal(result.ok, true);
  return result;
}

test('parseCSV skips header row and parses basic csv', () => {
  const text = [
    'day,title,location,time,duration,category,notes',
    '1,Senso-ji,Asakusa,09:00,90,sightseeing,',
  ].join('\n');

  const stops = parseCSV(text);
  assert.equal(stops.length, 1);
  assert.equal(stops[0].day, 1);
  assert.equal(stops[0].title, 'Senso-ji');
  assert.equal(stops[0].earliestStart, '09:00');
});

test('parseFileText parses tsv-delimited rows', () => {
  const text = [
    'day\ttitle\tlocation\ttime\tduration\tcategory\tnotes',
    '2\tUeno Park\tTokyo\t10:30\t60\tsightseeing\t',
  ].join('\n');

  const result = expectOk(parseFileText('stops.tsv', text));
  assert.equal(result.format, 'TSV (.tsv)');
  assert.equal(result.stops.length, 1);
  assert.equal(result.stops[0].day, 2);
  assert.equal(result.stops[0].title, 'Ueno Park');
});

test('parseCSV handles quoted commas in csv fields', () => {
  const text = [
    'day,title,location,time,duration,category,notes',
    '1,"Tokyo, Station","Chiyoda, Tokyo",09:00,45,sightseeing,"arrive early"',
  ].join('\n');

  const stops = parseCSV(text);
  assert.equal(stops.length, 1);
  assert.equal(stops[0].title, 'Tokyo, Station');
  assert.equal(stops[0].location, 'Chiyoda, Tokyo');
});

test('parseFileText preserves literal quotes in tsv fields', () => {
  const text = ['day\ttitle', '1\tCafe "A"'].join('\n');

  const result = expectOk(parseFileText('quoted.tsv', text));
  assert.equal(result.stops.length, 1);
  assert.equal(result.stops[0].title, 'Cafe "A"');
});

test('parseFileText preserves literal quotes in txt fields', () => {
  const text = ['day,title', '1,Cafe "A"'].join('\n');

  const result = expectOk(parseFileText('quoted.txt', text));
  assert.equal(result.format, 'Text (.txt, auto-detect delimiter)');
  assert.equal(result.stops.length, 1);
  assert.equal(result.stops[0].title, 'Cafe "A"');
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
