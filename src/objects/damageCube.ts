import { Card, GameObject, refObject, world } from '@tabletop-playground/api';
import { PlayerManager } from '../managers/playerManager';
import { ShipManager } from '../managers/shipManager';
import { Tags } from '../constants';

const identifyCubePosition = (obj: GameObject, disableMessages = false) => {
  const player = PlayerManager.getPlayerFromTags(obj.getTags());
  if (player && player.player) {
    const objsUnder = world.sphereOverlap(obj.getPosition(), 1);
    const shipOn = objsUnder.find(o => o.getTags().includes(Tags.SwashShip));
    if (shipOn) {
      let ship = ShipManager.getShip(shipOn.getId());
      if (!ship) {
        ship = ShipManager.registerCard(shipOn as Card);
      }
      if (ship && !ship.isOwned) {
        ship.triggerCubePlacedHere(player.player, obj, disableMessages);
        player.bindShipEvents(ship);
      }
    }
  }
};

refObject.onMovementStopped.add(identifyCubePosition);
identifyCubePosition(refObject, true);
