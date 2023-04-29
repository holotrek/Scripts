import { GameWorld, SnapPoint, Vector, world } from '@tabletop-playground/api';

export enum SnapPoints {
  ShipDeck,
  ShipDiscard,
  NpcShip1,
  NpcShip2,
  NpcShip3,
  NpcShip4,
}

export class SnapPointManager {
  ////TODO: Change to SnapPoints when table scripting available
  //static snapPoints: { [key: string]: SnapPoint } = {};

  static snapPoints: { [key: string]: Vector } = {
    [SnapPoints.ShipDeck]: new Vector(0, 36, 0),
    [SnapPoints.ShipDiscard]: new Vector(0, -50, 0),
    [SnapPoints.NpcShip1]: new Vector(10, -16, 0),
    [SnapPoints.NpcShip2]: new Vector(10, 12, 0),
    [SnapPoints.NpcShip3]: new Vector(-10, -16, 0),
    [SnapPoints.NpcShip4]: new Vector(-10, 12, 0),
  };

  //static loadPoints() {}

  static getPointVector(sp: SnapPoints) {
    const tableHeight = world.getTableHeight();
    return this.snapPoints[sp].add([0, 0, tableHeight]);
  }
}
