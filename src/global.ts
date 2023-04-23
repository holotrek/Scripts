import { globalEvents, Player, refPackageId, world } from '@tabletop-playground/api';
import { PlayerManager } from './managers/playerManager';

for (const dl of world.getDrawingLines()) {
  world.removeDrawingLineObject(dl);
}

for (const z of world.getAllZones()) {
  z.destroy();
}

for (const l of world.getAllLabels()) {
  l.destroy();
}

/**
 * Event that will trigger when a player joins or switches seats, in order
 * to setup drawing lines, counters, etc.
 * @param {Player} player
 * @param {number} oldIndex
 */
function initiatePlayer(player: Player, oldIndex?: number) {
  if (oldIndex !== undefined) {
    const oldPlayer = PlayerManager.getPlayer(oldIndex);
    oldPlayer?.cleanupPlayerArea();
  }
  const swashPlayer = PlayerManager.getPlayer(player.getSlot());
  if (swashPlayer) {
    swashPlayer.player = player;
    swashPlayer.setupPlayerArea();
  }
}

globalEvents.onPlayerJoined.add(initiatePlayer);
globalEvents.onPlayerSwitchedSlots.add(initiatePlayer);

for (let i = 0; i < 6; i++) {
  const p = world.getPlayerBySlot(i);
  if (p) {
    initiatePlayer(p, -1);
  }
}
