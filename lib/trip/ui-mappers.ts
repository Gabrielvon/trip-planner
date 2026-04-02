import { guessCoords } from './canonical-trip';
import { DraftStop, StructuredDraftStop } from './types';

/**
 * Convert structured form rows directly into DraftStop[] without calling the parser.
 * Coordinates remain provisional until the live optimizer resolves them.
 */
export function structuredStopsToUiStops(rows: StructuredDraftStop[]): DraftStop[] {
  return [...rows]
    .sort((a, b) => a.day - b.day)
    .map((stop, index) => {
      const location = stop.location.trim() || stop.title.trim();
      const coords = guessCoords(location, stop.day, index);

      return {
        id: stop.id,
        day: stop.day,
        date: stop.date,
        title: stop.title.trim() || 'Untitled draft stop',
        location,
        lat: coords.lat,
        lng: coords.lng,
        durationMin: stop.durationMin,
        earliest: stop.earliestStart,
        fixedOrder: stop.fixedOrder ?? false,
      };
    });
}

export function uiStopsToStructuredStops(stops: DraftStop[]): StructuredDraftStop[] {
  return [...stops]
    .sort((a, b) => (a.day === b.day ? a.id.localeCompare(b.id) : a.day - b.day))
    .map((stop) => ({
      id: stop.id,
      day: stop.day,
      date: stop.date,
      title: stop.title,
      location: stop.location,
      earliestStart: stop.earliest,
      durationMin: stop.durationMin,
      category: 'custom',
      fixedOrder: stop.fixedOrder,
    }));
}
