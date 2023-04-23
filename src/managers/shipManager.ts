import { Ship, ShipSizes } from '../ship';

const ships = [
  new Ship('Sloop', ShipSizes.Small, 13, 1, 4, 0),
  new Ship('Clipper', ShipSizes.Small, 15, 2, 5, 1),
  new Ship('Schooner', ShipSizes.Small, 16, 3, 6, 3),
  new Ship('Brig', ShipSizes.Medium, 21, 5, 7, 2),
  new Ship('Frigate', ShipSizes.Medium, 22, 6, 8, 4),
  new Ship('Galleon', ShipSizes.Large, 27, 8, 9, 6),
  new Ship('Man-o-War', ShipSizes.Large, 34, 11, 11, 10),
];

export class ShipManager {
  static getShip(name: string) {
    return ships.find(x => x.name === name);
  }
}
