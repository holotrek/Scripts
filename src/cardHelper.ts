import { Card, CardDetails, Zone } from '@tabletop-playground/api';

export class CardHelper {
  static getAllCardDetailsInZone(zone: Zone, tagFilter?: string, faceUpOnly = false) {
    const allCardDetails: Array<CardDetails> = [];

    for (const o of zone.getOverlappingObjects()) {
      if (o instanceof Card) {
        if (!faceUpOnly || o.isFaceUp()) {
          allCardDetails.push(...o.getAllCardDetails().filter(c => !tagFilter || c.tags.includes(tagFilter)));
        }
      }
    }
    return allCardDetails;
  }
}
