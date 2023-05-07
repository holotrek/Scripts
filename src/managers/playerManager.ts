import { CaptainBehavior } from '../behaviors/captain';
import { PLAYER_AREA_CENTER_X, PLAYER_AREA_WIDTH, SwashPlayer } from '../swashPlayer';
import { PLAYER_SLOTS } from '../constants';
import { Vector, world } from '@tabletop-playground/api';

const tableHeight = world.getTableHeight();
const players = [
  new SwashPlayer(0, new Vector(PLAYER_AREA_CENTER_X, -PLAYER_AREA_WIDTH, tableHeight), true),
  new SwashPlayer(1, new Vector(PLAYER_AREA_CENTER_X, 0, tableHeight), true),
  new SwashPlayer(2, new Vector(PLAYER_AREA_CENTER_X, PLAYER_AREA_WIDTH, tableHeight), true),
  new SwashPlayer(3, new Vector(-PLAYER_AREA_CENTER_X, -PLAYER_AREA_WIDTH, tableHeight), false),
  new SwashPlayer(4, new Vector(-PLAYER_AREA_CENTER_X, 0, tableHeight), false),
  new SwashPlayer(5, new Vector(-PLAYER_AREA_CENTER_X, PLAYER_AREA_WIDTH, tableHeight), false),
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
