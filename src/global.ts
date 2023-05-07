import { Button, Container, globalEvents, LayoutBox, Player, Rotator, UIElement, Vector, world } from '@tabletop-playground/api';
import { CardHelper } from './cardHelper';
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

const tableHeight = world.getTableHeight();

function createLabel(text: string, position: Vector, rotation?: Rotator, scale = 0.5) {
  const label = world.createLabel(position);
  label.setText(text);
  label.setRotation(rotation ?? new Rotator(0, 0, 0));
  label.setScale(scale);
}

function renderWorldUI() {
  const container = new LayoutBox();

  const button = new Button().setText('Discard and Redraw');
  button.onClicked.add(CardHelper.discardAndRedrawShips);
  container.setChild(button);

  const ui = new UIElement();
  ui.widget = container;
  ui.position = new Vector(0, 26, tableHeight + 0.1);
  ui.rotation = new Rotator(0, 90, 0);
  world.addUI(ui);
}

createLabel('Ship Draw', new Vector(-15, 36, tableHeight), new Rotator(-90, 180, 0));
createLabel('Ship Draw', new Vector(15, 36, tableHeight), new Rotator(-90, 0, 0));
createLabel('Ship Discard', new Vector(-15, -50, tableHeight), new Rotator(-90, 180, 0));
createLabel('Ship Discard', new Vector(15, -50, tableHeight), new Rotator(-90, 0, 0));
renderWorldUI();

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
