import { CaptainBehavior } from '../behaviors/captain';
import { SwashPlayer, SwashPlayerVectors } from '../swashPlayer';
import { Vector, world } from '@tabletop-playground/api';

const tableHeight = world.getTableHeight();
const x = SwashPlayerVectors.center.x;
const y = SwashPlayerVectors.rect.y;
const players = [
  new SwashPlayer(0, new Vector(x, -y, tableHeight), true),
  new SwashPlayer(1, new Vector(x, 0, tableHeight), true),
  new SwashPlayer(2, new Vector(x, y, tableHeight), true),
  new SwashPlayer(3, new Vector(-x, -y, tableHeight), false),
  new SwashPlayer(4, new Vector(-x, 0, tableHeight), false),
  new SwashPlayer(5, new Vector(-x, y, tableHeight), false),
];

export class PlayerManager {
  static getPlayer(index: number) {
    return players.find(x => x.playerIndex === index);
  }

  static getPlayerFromTags(tags: string[]) {
    return players.find(x => tags.includes(x.faction));
  }

  static getPlayerFromCaptain(captain: CaptainBehavior) {
    return players.find(x => x.captain?.card.getId() === captain.card.getId());
  }
}
