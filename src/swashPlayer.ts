import { Border, Button, Card, DrawingLine, GameObject, HorizontalAlignment, HorizontalBox, ImageWidget, LayoutBox, Player, Rotator, ScreenUIElement, SnapPoint, Text, Vector, VerticalAlignment, VerticalBox, world, Zone } from '@tabletop-playground/api';
import { CaptainBehavior } from './behaviors/captain';
import { CaptainManager } from './managers/captainManager';
import { CardHelper } from './cardHelper';
import { Colors, SWASH_PACKAGE_ID, Tags } from './constants';
import { ImageStatRow } from './ui/statRow';
import { IUpgradeable } from './interfaces/upgradeable';
import { Resource, Resources } from './resources';
import { ResourceManager } from './managers/resourceManager';
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

const RESOURCE_DELTA_X = 24;
const RESOURCE_DELTA_Y = -22;

export class SwashPlayer {
  private _screenUI?: ScreenUIElement;
  private _optimisticResources: { [key: string]: number } = {};

  captain?: CaptainBehavior;
  player?: Player;
  zones: SwashZone[] = [];
  playerZone?: SwashZone;
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
    this.zones.push(zone);
    this.playerZone = zone;
    zone.setOnCardEnter(card => this._processShipPlacedInZone(card));
    this._assignZoneObjects(zone.zone);
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
  private _updateResources(zone?: SwashZone, disableMessages = false) {
    if (this._resourceTimeout) {
      return;
    }
    if (!zone) {
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
        console.log(diff);
        if (diff !== 0) {
          changes.push(`${r}: ${diff > 0 ? '+' : ''}${diff.toString()}`);
        }
      }

      if (changes.length) {
        this.resources = { ...allResources };
        this._optimisticResources = { ...allResources };
        if (!disableMessages) {
          world.broadcastChatMessage(
            `${this.player?.getName()}'s resources changed: ${changes.join(', ')}.`,
            this.color
          );
        }
        this._renderScreenUi();
      }

      this._resourceTimeout = undefined;
    }, 1000);
  }

  private _removeResource(resource: Resources) {
    const name = Resource.getName(resource);
    const existing = (this.playerZone?.zone?.getOverlappingObjects() || [])
      .filter(c => c instanceof Card)
      .map(c => c as Card)
      .filter(c => c.getTemplateName() === name);
    if (existing.length) {
      const firstCard = existing[0];
      if (firstCard.getStackSize() > 1) {
        firstCard.takeCards(1)?.destroy();
      } else {
        firstCard.destroy();
      }
      this._optimisticResources[name] = Math.max((this._optimisticResources[name] || 0) - 1, 0);
      this._renderScreenUi();
      this._updateResources(this.playerZone);
    }
  }

  private _addResource(resource: Resources) {
    const deltaX = (this.isRotated ? -1 : 1) * (RESOURCE_DELTA_X - 5 * Math.floor((resource - 1) / 4));
    const deltaY = (this.isRotated ? -1 : 1) * (RESOURCE_DELTA_Y + 5 * Math.floor((resource - 1) % 4));
    const pos = this.centerPoint.add(new Vector(deltaX, deltaY, 20));
    const token = ResourceManager.resourceContainers[resource].takeAt(0, pos, false, true);
    if (this.isRotated && token) {
      token.setRotation([0, 180, 0]);
    }

    const name = Resource.getName(resource);
    this._optimisticResources[name] = (this._optimisticResources[name] || 0) + 1;
    this._renderScreenUi();
    this._updateResources(this.playerZone);
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

    const header = new HorizontalBox();
    column.addChild(header);
    header.addChild(new Text().setText('Resources:').setFontSize(22));

    const resourceContainer = new HorizontalBox();
    column.addChild(resourceContainer, 1);

    const conversionContainer = new HorizontalBox()
      .setHorizontalAlignment(HorizontalAlignment.Fill)
      .setVerticalAlignment(VerticalAlignment.Fill);
    column.addChild(conversionContainer, 1);

    const conversionBorder = new Border().setColor(Colors.blue);
    conversionContainer.addChild(conversionBorder, 1);

    const conversionBox = new HorizontalBox()
      .setHorizontalAlignment(HorizontalAlignment.Center)
      .setVerticalAlignment(VerticalAlignment.Center);
    conversionBorder.setChild(conversionBox);

    conversionBox.addChild(new Text().setText('Resource Conversion TBD').setFontSize(24), 1);

    for (const r in Resources) {
      if (isNaN(+r) && r !== Resource.getName(Resources.None)) {
        const resource = Resource.fromName(r);
        const resourceBox = new VerticalBox();
        resourceContainer.addChild(resourceBox, 1);

        const imageBorder = new Border().setColor(Resource.getColor(resource));
        resourceBox.addChild(imageBorder, 1);

        const imageContainer = new HorizontalBox()
          .setHorizontalAlignment(HorizontalAlignment.Center)
          .setVerticalAlignment(VerticalAlignment.Center);
        imageBorder.setChild(imageContainer);

        const val = this._optimisticResources[r] || 0;
        const image = new ImageWidget().setImage(Resource.getImage(resource), SWASH_PACKAGE_ID).setImageSize(0, 72);
        const subBtn = new Button().setText('-');
        const addBtn = new Button().setText('+');
        subBtn.onClicked.add(() => this._removeResource(resource));
        addBtn.onClicked.add(() => this._addResource(resource));

        imageContainer.addChild(subBtn, 0.25);
        imageContainer.addChild(image, 0.5);
        imageContainer.addChild(addBtn, 0.25);

        const statBorder = new Border().setColor(Resource.getColor(resource));
        resourceBox.addChild(statBorder);

        const statBox = new HorizontalBox()
          .setHorizontalAlignment(HorizontalAlignment.Center)
          .setVerticalAlignment(VerticalAlignment.Center);
        statBorder.setChild(statBox);

        const text = new Text().setText(`${r}: ${val}`).setTextColor(Resource.getBgColor(resource)).setFontSize(16);
        statBox.addChild(text, 1);
      }
    }

    if (this._screenUI) {
      world.removeScreenUIElement(this._screenUI);
    }

    this._screenUI = new ScreenUIElement();
    this._screenUI.relativePositionX = true;
    this._screenUI.relativePositionY = true;
    this._screenUI.relativeWidth = true;
    this._screenUI.relativeHeight = true;
    this._screenUI.anchorX = 0.5;
    this._screenUI.anchorY = 1;
    this._screenUI.positionX = 0.5;
    this._screenUI.positionY = 1;
    this._screenUI.width = 0.5;
    this._screenUI.height = 0.2;
    this._screenUI.widget = container;
    this._screenUI.players.setPlayerSlots([this.playerIndex]);
    world.addScreenUI(this._screenUI);
  }
}
