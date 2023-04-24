import { Card } from '@tabletop-playground/api';
import { ShipBehavior } from '../behaviors/ship';
import { ShipSizes, ShipSpec } from '../specs/ship';

const ships = [
  new ShipSpec('Sloop', ShipSizes.Small, 13, 1, 4, 0),
  new ShipSpec('Clipper', ShipSizes.Small, 15, 2, 5, 1),
  new ShipSpec('Schooner', ShipSizes.Small, 16, 3, 6, 3),
  new ShipSpec('Brig', ShipSizes.Medium, 21, 5, 7, 2),
  new ShipSpec('Frigate', ShipSizes.Medium, 22, 6, 8, 4),
  new ShipSpec('Galleon', ShipSizes.Large, 27, 8, 9, 6),
  new ShipSpec('Man-o-War', ShipSizes.Large, 34, 11, 11, 10),
];

export class ShipManager {
  static behaviors: { [guid: string]: ShipBehavior } = {};

  static registerCard(card: Card): ShipBehavior | undefined {
    const spec = ShipManager.getShipSpec(card.getCardDetails().name);
    if (spec) {
      const behavior = new ShipBehavior(card, spec);
      ShipManager.behaviors[card.getId()] = behavior;
      return behavior;
    }
  }

  static getShip(id: string): ShipBehavior | undefined {
    return this.behaviors[id];
  }

  static getShipSpec(name: string): ShipSpec | undefined {
    return ships.find(x => x.name === name);
  }
}
