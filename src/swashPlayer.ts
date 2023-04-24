import { Border, Card, DrawingLine, GameObject, LayoutBox, Player, ScreenUIElement, SnapPoint, Text, Vector, VerticalBox, world, Zone } from '@tabletop-playground/api';
import { CaptainBehavior } from './behaviors/captain';
import { CaptainManager } from './managers/captainManager';
import { CardHelper } from './cardHelper';
import { Colors, Tags } from './constants';
import { IUpgradeable } from './interfaces/upgradeable';
import { Resource, Resources } from './resources';
import { ShipBehavior } from './behaviors/ship';
import { ShipManager } from './managers/shipManager';
import { SwashZone } from './swashZone';
import { Upgrade, UpgradeType } from './upgrade';
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

export class SwashPlayer {
  private _lines: DrawingLine[] = [];
  private _screenUIidx: number | undefined;

  captain?: CaptainBehavior;
  player?: Player;
  zones: SwashZone[] = [];
  ship?: ShipBehavior;
  playerInfo?: GameObject;
  resources: { [key: string]: number } = {};

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
    if (this.player && this.captain) {
      this.captain.triggerCrewMoved(this.player, crewObj, snapPoint);
    }
  }

  private _assignShip(card: Card) {
    const ship = ShipManager.registerCard(card);
    this.ship = ship;
    if (this.ship) {
      this.ship.isOwned = true;
    }
  }

  private _createPlayerZones() {
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
          this._updateResources(zone, true);
        } else if (c.getTags().includes(Tags.SwashShip)) {
          this._processShipPlacedInZone(c, true);
        }
      }
    }
    zone.zone.onBeginOverlap.add(() => {
      this._updateResources(zone);
    });
    zone.zone.onEndOverlap.add(() => {
      this._updateResources(zone);
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
    capUpgradeZone.setOnCardEnter(_ => this._captainUgradesChanged(capUpgradeZone));
    capUpgradeZone.setOnCardLeave(_ => this._captainUgradesChanged(capUpgradeZone));
    this.zones.push(capUpgradeZone);
    this._captainUgradesChanged(capUpgradeZone, true);

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
    shipUpgradeZone.setOnCardEnter(_ => this._shipUgradesChanged(shipUpgradeZone));
    shipUpgradeZone.setOnCardLeave(_ => this._shipUgradesChanged(shipUpgradeZone));
    this.zones.push(shipUpgradeZone);
    this._shipUgradesChanged(shipUpgradeZone, true);
  }

  private _assignZoneObjects(zone: Zone) {
    const allZoneObjs = zone.getOverlappingObjects() ?? [];
    // Find captain first since it is needed for additional cards
    for (const o of allZoneObjs) {
      if (o instanceof Card && o.getTags().includes(Tags.CaptainSheet)) {
        this.captain = CaptainManager.registerCard(o);
        this.captain.isActive = true;
      }
    }

    for (const o of allZoneObjs) {
      if (o.getTags().includes(Tags.PlayerInfo)) {
        this.playerInfo = o;
      } else if (o.getTags().includes(Tags.UpgradeSlot)) {
        if (this.captain) {
          this.captain.upgradeSlotTokens[o.getName()] = o;
        }
      }
    }
  }

  private _processShipPlacedInZone(card: Card, disableMessages = false) {
    const cardDetails = card.getCardDetails();
    if (!cardDetails.tags.includes(Tags.SwashShip)) {
      return;
    }

    this._assignShip(card);
    if (this.ship && !disableMessages) {
      this.player?.showMessage(`You acquired a ${this.ship.name}!`);
      world.broadcastChatMessage(`${this.player?.getName()} acquired a ${this.ship.name}!`, this.color);
    }
  }

  private _showUpgradeSuccessMessage(upgrade: Upgrade) {
    this.player?.showMessage(`You played upgrade: ${upgrade.name}.`);
    world.broadcastChatMessage(`${this.player?.getName()} played upgrade: ${upgrade.name}.`, this.color);
  }

  private _showUpgradeRemovedMessage(upgrade: Upgrade) {
    this.player?.showMessage(`You removed upgrade: ${upgrade.name}.`);
    world.broadcastChatMessage(`${this.player?.getName()} removed upgrade: ${upgrade.name}.`, this.color);
  }

  private _captainUgradesChanged(zone: SwashZone, disableMessages = false) {
    return this._upgradesChanged(zone, this.captain, UpgradeType.Captain, disableMessages);
  }

  private _shipUgradesChanged(zone: SwashZone, disableMessages = false) {
    return this._upgradesChanged(zone, this.ship, UpgradeType.Ship, disableMessages);
  }

  private _upgradeTimeout?: number;
  private _upgradesChanged(
    zone: SwashZone,
    upgradeable: IUpgradeable | undefined,
    typeAllowed: UpgradeType,
    disableMessages = false
  ) {
    if (!upgradeable) {
      return;
    }

    if (this._upgradeTimeout) {
      return;
    }

    this._upgradeTimeout = setTimeout(() => {
      const previousUpgrades = upgradeable.getUpgrades();
      const allCardDetails = CardHelper.getAllCardDetailsInZone(zone.zone, Tags.SwashCard);
      const updatedUpgrades = allCardDetails.map(c => UpgradeManager.getUpgrade(c));

      const upgradesAdded = updatedUpgrades
        .filter(u => u?.upgradeType === typeAllowed)
        .map(u => u as Upgrade)
        .filter(u => !previousUpgrades.map(pu => pu.name).includes(u.name));

      const upgradesRemoved = previousUpgrades.filter(u => !updatedUpgrades.map(uu => uu?.name).includes(u.name));

      for (const u of upgradesRemoved) {
        const removed = upgradeable.removeUpgrade(u);
        if (removed && !disableMessages) {
          this._showUpgradeRemovedMessage(u);
        }
      }

      for (const u of upgradesAdded) {
        const added = upgradeable.addUpgrade(u);
        if (added && !disableMessages) {
          this._showUpgradeSuccessMessage(u);
        }
        if (!added) {
          this.player?.showMessage(
            `You must remove a ${u.name} (either it is duplicate or there is no available slot).`
          );
        }
      }

      this._upgradeTimeout = undefined;
    }, 500);
  }

  private _resourceTimeout?: number;
  private _updateResources(zone: SwashZone, disableMessages = false) {
    if (this._resourceTimeout) {
      return;
    }

    this._resourceTimeout = setTimeout(() => {
      const allCardDetails = CardHelper.getAllCardDetailsInZone(zone.zone, Tags.Resource, false);
      const allResources = allCardDetails
        .map(c => Resource.getFromCardDetail(c))
        .reduce((pv, cv) => {
          const idx = Resources[cv];
          pv[idx] = (pv[idx] || 0) + 1;
          return pv;
        }, {} as { [key: string]: number });

      const changes: Array<string> = [];
      for (const r in Resources) {
        const diff = (allResources[r] || 0) - (this.resources[r] || 0);
        if (diff !== 0) {
          changes.push(`${r}: ${diff > 0 ? '+' : ''}${diff.toString()}`);
        }
      }
      if (changes.length) {
        this.resources = allResources;
        world.broadcastChatMessage(`${this.player?.getName()}'s resources changed: ${changes.join(', ')}.`, this.color);
      }

      this._resourceTimeout = undefined;
    }, 1000);
  }

  private _createLabel(text: string, relativeX: number, relativeY: number) {
    const position = this.centerPoint.add(
      new Vector((this.isRotated ? -1 : 1) * relativeX, (this.isRotated ? -1 : 1) * relativeY, 0)
    );
    const label = world.createLabel(position);
    label.setText(text);
    label.setRotation([-90, this.isRotated ? 180 : 0, 0]);
    label.setScale(0.5);
    return label;
  }

  private _renderScreenUi() {
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
