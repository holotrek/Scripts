import { Container, globalEvents, Player, world } from '@tabletop-playground/api';
import { PlayerManager } from './managers/playerManager';
import { ResourceManager } from './managers/resourceManager';
import { Resources } from './resources';

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

ResourceManager.resourceContainers[Resources.Lumber] = world.getObjectById('g4q') as Container;
ResourceManager.resourceContainers[Resources.Leather] = world.getObjectById('sm1') as Container;
ResourceManager.resourceContainers[Resources.Iron] = world.getObjectById('khx') as Container;
ResourceManager.resourceContainers[Resources.Coffee] = world.getObjectById('cdg') as Container;
ResourceManager.resourceContainers[Resources.Rum] = world.getObjectById('3jd') as Container;
ResourceManager.resourceContainers[Resources.Spices] = world.getObjectById('prs') as Container;
ResourceManager.resourceContainers[Resources.Sugar] = world.getObjectById('6ki') as Container;
ResourceManager.resourceContainers[Resources.Gold] = world.getObjectById('ltg') as Container;
