import { Border, Card, DrawingLine, GameObject, LayoutBox, Player, ScreenUIElement, SnapPoint, Text, Vector, VerticalBox, world, Zone } from '@tabletop-playground/api';
import { Captain } from './captain';
import { CaptainUpgrade } from './captainUpgrade';
import { Colors, Tags } from './constants';
import { Resource } from './resources';
import { Ship } from './ship';
import { ShipManager } from './managers/shipManager';
import { ShipUpgrade } from './shipUpgrade';
import { SwashZone } from './swashZone';
import { Upgrade } from './upgrade';
import { UpgradeManager } from './managers/upgradeManager';

export const PLAYER_AREA_CENTER_X = 56;
export const PLAYER_AREA_WIDTH = 113;
export const PLAYER_AREA_HEIGHT = 54;

const CAPTAIN_UPGRADES_DELTA_X = 0;
const CAPTAIN_UPGRADES_DELTA_Y = -40;
const CAPTAIN_UPGRADES_WIDTH = 30;
const CAPTAIN_UPGRADES_HEIGHT = 50;

const SHIP_UPGRADES_DELTA_X = 0;
const SHIP_UPGRADES_DELTA_Y = 42;
const SHIP_UPGRADES_WIDTH = 26;
const SHIP_UPGRADES_HEIGHT = 50;

const DRAW_DELTA_X = -4;
const DRAW_DELTA_Y = -20;

const DISCARD_DELTA_X = -4;
const DISCARD_DELTA_Y = 20;

// type UpgradeReturnType = {
//   [UpgradeType.Captain]: CaptainUpgrade;
//   [UpgradeType.Ship]: ShipUpgrade;
// };

export class SwashPlayer {
  private _lines: DrawingLine[] = [];
  private _screenUIidx: number | undefined;

  captain: Captain;
  player?: Player;
  zones: SwashZone[] = [];
  ship?: Ship;
  playerInfo?: GameObject;
  resources: { [key: number]: number } = {};

  get color() {
    return this.player?.getPlayerColor();
  }

  /**
   * Player details including positions for seat and objects
   * @param {number} playerIndex
   * @param {string} faction
   * @param {Vector} centerPoint
   * @param {boolean} isRotated
   */
  constructor(
    public playerIndex: number,
    public faction: string,
    public centerPoint: Vector,
    public isRotated: boolean
  ) {
    this.captain = new Captain();
    this._renderScreenUi();
  }

  setupPlayerArea() {
    this._createPlayerZones();
    this._createLabel('Draw', DRAW_DELTA_X, DRAW_DELTA_Y);
    this._createLabel('Discard', DISCARD_DELTA_X, DISCARD_DELTA_Y);
  }

  cleanupPlayerArea() {
    for (const z of this.zones) {
      z.remove();
    }
    this.playerInfo?.removeUI(0);
  }

  triggerCrewMoved(crewObj: GameObject, snapPoint?: SnapPoint) {
    if (this.player) {
      this.captain.triggerCrewMoved(this.player, crewObj, snapPoint);
    }
  }

  _assignShip(ship: Ship, sheet: GameObject) {
    this.ship = ship;
    this.ship.setSheet(sheet);
    this.ship.isOwned = true;
  }

  // _findUpgrades(upgradeType: UpgradeType): UpgradeReturnType[UpgradeType][] {
  //   const allZoneObjs = this.zone?.getOverlappingObjects() ?? [];
  //   return allZoneObjs
  //     .filter(o => o.getTags().includes('SwashCard'))
  //     .map(o => o.getTemplateMetadata())
  //     .map(mj => JSON.parse(mj))
  //     .filter(m => m.upgradeType === upgradeType)
  //     .map(m => (upgradeType === UpgradeType.Captain ? CaptainUpgrade.fromMetadata(m) : ShipUpgrade.fromMetadata(m)))
  //     .filter(u => !!u)
  //     .map(u => u as CaptainUpgrade | ShipUpgrade);
  // }

  _addResource(token: Card) {
    const res = Resource.getFromGameObject(token);
    const size = token.getStackSize();
    const newVal = (this.resources[res] ?? 0) + size;
    this.resources[res] = newVal;
    console.log(`${this.player?.getName()} gained ${size} ${Resource.getName(res)} for a total of ${newVal}.`);
  }
  _removeResource(token: Card) {
    const res = Resource.getFromGameObject(token);
    const size = token.getStackSize();
    const newVal = Math.max((this.resources[res] ?? 0) - size, 0);
    this.resources[res] = newVal;
    console.log(`${this.player?.getName()} lost ${size} ${Resource.getName(res)} for a total of ${newVal}.`);
  }

  _createPlayerZones() {
    const zone = SwashZone.createZone(
      this.color,
      this.playerIndex,
      this.centerPoint,
      PLAYER_AREA_HEIGHT,
      PLAYER_AREA_WIDTH,
      this.isRotated
    );
    zone.setOnCardEnter(card => this._processShipPlacedInZone(card));
    this._assignZoneObjects(zone.zone);
    this.zones.push(zone);
    for (const c of zone.zone.getOverlappingObjects()) {
      if (c instanceof Card) {
        if (c.getTags().includes(Tags.Resource)) {
          this._addResource(c);
        } else if (c.getTags().includes(Tags.SwashShip)) {
          this._processShipPlacedInZone(c);
        }
      }
    }
    zone.zone.onBeginOverlap.add((_, c) => {
      if (c instanceof Card) {
        if (c.getTags().includes(Tags.Resource)) {
          this._addResource(c);
        }
      }
    });
    zone.zone.onEndOverlap.add((_, c) => {
      if (c instanceof Card) {
        if (c.getTags().includes(Tags.Resource)) {
          this._removeResource(c);
        }
      }
    });

    const capUpgradeDelta = new Vector(CAPTAIN_UPGRADES_DELTA_X, CAPTAIN_UPGRADES_DELTA_Y, 0);
    const capUpgradeZoneCenter = this.centerPoint.add(capUpgradeDelta.multiply(this.isRotated ? -1 : 1));
    const capUpgradeZone = SwashZone.createZone(
      this.color,
      this.playerIndex,
      capUpgradeZoneCenter,
      CAPTAIN_UPGRADES_HEIGHT,
      CAPTAIN_UPGRADES_WIDTH,
      this.isRotated,
      0.5,
      'Captain Upgrades'
    );
    capUpgradeZone.setOnCardEnter(card => this._processCaptainUpgradePlacedInZone(card));
    capUpgradeZone.setOnCardLeave(card => this._processCaptainUpgradeRemovedFromZone(card));
    this.zones.push(capUpgradeZone);
    for (const c of capUpgradeZone.zone.getOverlappingObjects()) {
      if (c instanceof Card) {
        this._processCaptainUpgradePlacedInZone(c);
      }
    }

    const shipUpgradeDelta = new Vector(SHIP_UPGRADES_DELTA_X, SHIP_UPGRADES_DELTA_Y, 0);
    const shipUpgradeZoneCenter = this.centerPoint.add(shipUpgradeDelta.multiply(this.isRotated ? -1 : 1));
    const shipUpgradeZone = SwashZone.createZone(
      this.color,
      this.playerIndex,
      shipUpgradeZoneCenter,
      SHIP_UPGRADES_HEIGHT,
      SHIP_UPGRADES_WIDTH,
      this.isRotated,
      0.5,
      'Ship Upgrades'
    );
    shipUpgradeZone.setOnCardEnter(card => this._processShipUpgradePlacedInZone(card));
    shipUpgradeZone.setOnCardLeave(card => this._processShipUpgradeRemovedFromZone(card));
    this.zones.push(shipUpgradeZone);
    for (const c of shipUpgradeZone.zone.getOverlappingObjects()) {
      if (c instanceof Card) {
        this._processShipUpgradePlacedInZone(c);
      }
    }
  }

  _assignZoneObjects(zone: Zone) {
    const allZoneObjs = zone.getOverlappingObjects() ?? [];
    for (const o of allZoneObjs) {
      if (o.getTags().includes(Tags.PlayerInfo)) {
        this.playerInfo = o;
      } else if (o.getTags().includes(Tags.CaptainSheet)) {
        this.captain.setSheet(o);
      } else if (o.getTags().includes(Tags.UpgradeSlot)) {
        this.captain.upgradeSlotTokens[o.getName()] = o;
      }
    }
  }

  _removeLines() {
    for (const l of this._lines) {
      world.removeDrawingLineObject(l);
    }
  }

  _processShipPlacedInZone(card: Card) {
    const cardDetails = card.getCardDetails();
    if (!cardDetails.tags.includes(Tags.SwashShip)) {
      return;
    }

    const ship = ShipManager.getShip(cardDetails.name);
    if (ship) {
      this._assignShip(ship, card);
    }

    this.player?.showMessage(`You acquired a ${cardDetails.name}!`);
    world.broadcastChatMessage(`${this.player?.getName()} acquired a ${cardDetails.name}!`, this.color);
  }

  _showUpgradeSuccessMessage(upgrade?: Upgrade) {
    if (upgrade) {
      this.player?.showMessage(`You played upgrade: ${upgrade.name}.`);
      world.broadcastChatMessage(`${this.player?.getName()} played upgrade: ${upgrade.name}.`, this.color);
    }
  }

  _showUpgradeRemovedMessage(upgrade?: Upgrade) {
    if (upgrade) {
      this.player?.showMessage(`You removed upgrade: ${upgrade.name}.`);
      world.broadcastChatMessage(`${this.player?.getName()} removed upgrade: ${upgrade.name}.`, this.color);
    }
  }

  _processShipUpgradePlacedInZone(card: Card) {
    const cardDetails = card.getCardDetails();
    if (!cardDetails.tags.includes(Tags.SwashCard)) {
      return;
    }

    let success = false;
    const upgrade = UpgradeManager.getUpgradeByCard(cardDetails);
    if (upgrade && upgrade instanceof ShipUpgrade) {
      if (this.ship?.addUpgrade(upgrade)) {
        success = true;
      } else {
        this.player?.showMessage(`You cannot add another "${upgrade.name}" to your ship!`);
      }
    }

    if (success) {
      this._showUpgradeSuccessMessage(upgrade);
    }
  }

  _processShipUpgradeRemovedFromZone(card: Card) {
    const cardDetails = card.getCardDetails();
    if (!cardDetails.tags.includes(Tags.SwashCard)) {
      return;
    }
    const upgrade = UpgradeManager.getUpgradeByCard(cardDetails);
    if (upgrade && upgrade instanceof ShipUpgrade) {
      if (this.ship?.removeUpgrade(upgrade)) {
        this._showUpgradeRemovedMessage(upgrade);
      }
    }
  }

  _processCaptainUpgradePlacedInZone(card: Card) {
    const cardDetails = card.getCardDetails();
    if (!cardDetails.tags.includes(Tags.SwashCard)) {
      return;
    }

    let success = false;
    const upgrade = UpgradeManager.getUpgradeByCard(cardDetails);
    if (upgrade && upgrade instanceof CaptainUpgrade) {
      if (this.captain.addUpgrade(upgrade)) {
        success = true;
      } else {
        this.player?.showMessage(`There is no more room for a ${upgrade.locationName}.`);
      }
    }

    if (success) {
      this._showUpgradeSuccessMessage(upgrade);
    }
  }

  _processCaptainUpgradeRemovedFromZone(card: Card) {
    const cardDetails = card.getCardDetails();
    if (!cardDetails.tags.includes(Tags.SwashCard)) {
      return;
    }
    const upgrade = UpgradeManager.getUpgradeByCard(cardDetails);
    if (upgrade && upgrade instanceof CaptainUpgrade) {
      if (this.captain?.removeUpgrade(upgrade)) {
        this._showUpgradeRemovedMessage(upgrade);
      }
    }
  }

  _createLabel(text: string, relativeX: number, relativeY: number) {
    const position = this.centerPoint.add(
      new Vector((this.isRotated ? -1 : 1) * relativeX, (this.isRotated ? -1 : 1) * relativeY, 0)
    );
    const label = world.createLabel(position);
    label.setText(text);
    label.setRotation([-90, this.isRotated ? 180 : 0, 0]);
    label.setScale(0.5);
    return label;
  }

  _renderScreenUi() {
    const container = new LayoutBox();

    const backdrop = new Border().setColor(Colors.black);
    container.setChild(backdrop);

    const column = new VerticalBox();
    backdrop.setChild(column);

    column.addChild(new Text().setText('Resources:'));

    const screenUi = new ScreenUIElement();
    screenUi.relativePositionX = true;
    screenUi.relativePositionY = true;
    screenUi.relativeWidth = true;
    screenUi.relativeHeight = true;
    screenUi.anchorX = 0.5;
    screenUi.anchorY = 1;
    screenUi.positionX = 0.5;
    screenUi.positionY = 1;
    screenUi.width = 0.5;
    screenUi.height = 0.2;
    screenUi.widget = container;
    if (this._screenUIidx === undefined) {
      this._screenUIidx = world.addScreenUI(screenUi);
    } else {
      world.setScreenUI(this._screenUIidx, screenUi);
    }
  }
}
