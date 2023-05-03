import { Border, Button, Card, GameObject, HorizontalAlignment, HorizontalBox, ImageButton, ImageWidget, Label, LayoutBox, Player, ScreenUIElement, SnapPoint, Text, Vector, VerticalAlignment, VerticalBox, world, Zone } from '@tabletop-playground/api';
import { CaptainBehavior } from './behaviors/captain';
import { CaptainManager } from './managers/captainManager';
import { CardHelper } from './cardHelper';
import { Colors, SWASH_PACKAGE_ID, Tags } from './constants';
import { IUpgradeable } from './interfaces/upgradeable';
import { Resource, ResourceConverter, Resources } from './resources';
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

const PLAYER_NAME_DELTA_X = -23;
const PLAYER_NAME_DELTA_Y = 0;

const DRAW_DELTA_X = -4;
const DRAW_DELTA_Y = -20;

const DISCARD_DELTA_X = -4;
const DISCARD_DELTA_Y = 20;

const RESOURCE_DELTA_X = 24;
const RESOURCE_DELTA_Y = -22;

export class SwashPlayer {
  private _screenUI?: ScreenUIElement;
  private _optimisticResources: { [key: string]: number } = {};
  private _converter: ResourceConverter;
  private _labels: Array<Label> = [];

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
    this._converter = new ResourceConverter();
    this._converter.onCalculationChanged(() => this._renderScreenUi());
    this._renderScreenUi();
  }

  setupPlayerArea() {
    this._createPlayerZones();
    this._labels.push(this._createLabel('Draw', DRAW_DELTA_X, DRAW_DELTA_Y));
    this._labels.push(this._createLabel('Discard', DISCARD_DELTA_X, DISCARD_DELTA_Y));
    this._labels.push(this._createPlayerLabel(PLAYER_NAME_DELTA_X, PLAYER_NAME_DELTA_Y, 1));
  }

  cleanupPlayerArea() {
    for (const z of this.zones) {
      z.remove();
    }
    this.playerInfo?.removeUI(0);
    for (const l of this._labels) {
      l.destroy();
    }
    if (this.captain) {
      this.captain.player = undefined;
    }
  }

  triggerCrewMoved(crewObj: GameObject, disableMessages = false) {
    if (this.player && this.captain) {
      const snapPoint = crewObj.getSnappedToPoint();
      const objsUnder = world.sphereOverlap(crewObj.getPosition(), 1);
      const onCaptain = !!objsUnder.find(o => o.getId() === this.captain?.card.getId());
      const onShip = !!objsUnder.find(o => o.getId() === this.ship?.card.getId());

      this.captain?.triggerCrewMoved(this.player, crewObj, onCaptain, snapPoint, disableMessages);
      this.ship?.triggerCrewMoved(this.player, crewObj, onShip, disableMessages);
    }
  }

  bindShipEvents(ship: ShipBehavior) {
    ship.onUseShipSelected.add(ship => {
      ////TODO:
      //// 1. Scrap ship upgrades and give equivalent resources
      //// 2. Destroy current ship (save position first)
      //// 3. Move new ship to ship position and freeze
      //// 4. Assign new ship: this._assignShip(ship.card)
    });
    ship.onShipScrapSelected.add(ship => {
      ////TODO:
      //// 1. Prereq: Assign resources to each ship and reflect on UI
      //// 2. Destroy ship card
      //// 3. Give player associated resources
    });
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
        this.captain.player = this.player;
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

  private _convertResources() {
    const owned = this.resources[this._converter.outputName] || 0;
    if (owned < this._converter.outputAmount) {
      this.player?.showMessage(
        `You don't have ${this._converter.outputAmount} ${this._converter.outputName} to spend!`
      );
      return;
    }

    this._removeResource(this._converter.output, this._converter.outputAmount);
    this._addResource(this._converter.input, this._converter.inputAmount);
  }

  private _removeResource(resource: Resources, amount = 1) {
    const name = Resource.getName(resource);
    const existing = (this.playerZone?.zone?.getOverlappingObjects() || [])
      .filter(c => c instanceof Card)
      .map(c => c as Card)
      .filter(c => c.getTemplateName() === name);

    let remaining = amount;
    for (const c of existing) {
      const size = c.getStackSize();
      const removeCount = Math.min(size, remaining);
      if (size > 1 && size < removeCount) {
        c.takeCards(removeCount)?.destroy();
      } else {
        c.destroy();
      }

      remaining -= removeCount;
      if (remaining < 1) {
        break;
      }
    }

    this._optimisticResources[name] = Math.max((this._optimisticResources[name] || 0) - amount, 0);
    this._renderScreenUi();
    this._updateResources(this.playerZone);
  }

  private _addResource(resource: Resources, amount = 1) {
    const deltaX = (this.isRotated ? -1 : 1) * (RESOURCE_DELTA_X - 5 * Math.floor((resource - 1) / 4));
    const deltaY = (this.isRotated ? -1 : 1) * (RESOURCE_DELTA_Y + 5 * Math.floor((resource - 1) % 4));
    let pos = this.centerPoint.add(new Vector(deltaX, deltaY, 20));
    const container = ResourceManager.resourceContainers[resource];
    const token = container.takeAt(0, pos);
    if (token) {
      for (let i = 0; i < amount; i++) {
        pos = pos.add(new Vector(0, 0, 1));
        const dupe = world.createObjectFromJSON(token.toJSONString(), pos);
        dupe?.onDestroyed.add(() => this._updateResources(this.playerZone));
      }
      container.addObjects([token]);
      if (this.isRotated) {
        token.setRotation([0, 180, 0]);
      }
    }

    const name = Resource.getName(resource);
    this._optimisticResources[name] = (this._optimisticResources[name] || 0) + amount;
    this._renderScreenUi();
    this._updateResources(this.playerZone);
  }

  private _createPlayerLabel(relativeX: number, relativeY: number, scale = 0.5) {
    const label = this._createLabel(this.player?.getName() || this.faction, relativeX, relativeY, scale);
    label.setColor(this.player?.getPlayerColor() || Colors.white);
    return label;
  }

  private _createLabel(text: string, relativeX: number, relativeY: number, scale = 0.5) {
    const position = this.centerPoint.add(
      new Vector((this.isRotated ? -1 : 1) * relativeX, (this.isRotated ? -1 : 1) * relativeY, 0)
    );
    const label = world.createLabel(position);
    label.setText(text);
    label.setRotation([-90, this.isRotated ? 180 : 0, 0]);
    label.setScale(scale);
    return label;
  }

  private _createResourceControl(name: string) {
    const resource = Resource.fromName(name);
    const textColor = Resource.getBgColor(resource);
    const boxColor = Resource.getColor(resource);

    const border = new Border().setColor(boxColor);

    const resourceBox = new VerticalBox();
    border.setChild(resourceBox);

    const statBox = new HorizontalBox()
      .setHorizontalAlignment(HorizontalAlignment.Center)
      .setVerticalAlignment(VerticalAlignment.Center);
    resourceBox.addChild(statBox, 0.33);

    const text = new Text().setText(name).setTextColor(textColor).setFontSize(16);
    statBox.addChild(text, 1);

    const image = new ImageWidget().setImage(Resource.getImage(resource), SWASH_PACKAGE_ID).setImageSize(24, 0);
    statBox.addChild(image, 0.25);

    const controlContainer = new HorizontalBox()
      .setHorizontalAlignment(HorizontalAlignment.Center)
      .setVerticalAlignment(VerticalAlignment.Center);
    resourceBox.addChild(controlContainer, 0.66);

    const val = this._optimisticResources[name] || 0;
    const subBtn = new Button().setText('-').setBold(true);
    const addBtn = new Button().setText('+').setBold(true);
    subBtn.onClicked.add(() => this._removeResource(resource));
    addBtn.onClicked.add(() => this._addResource(resource));

    const valAndImage = new VerticalBox()
      .setHorizontalAlignment(HorizontalAlignment.Center)
      .setVerticalAlignment(VerticalAlignment.Center);
    const valText = new Text().setText(val.toString()).setTextColor(textColor).setFontSize(24).setBold(true);
    valAndImage.addChild(valText, 0.66);

    controlContainer.addChild(subBtn, 0.25);
    controlContainer.addChild(valAndImage, 0.5);
    controlContainer.addChild(addBtn, 0.25);

    return border;
  }

  private _createConversionControl(name: string, isInput: boolean) {
    const resource = Resource.fromName(name);
    const resButton = new ImageButton().setImage(Resource.getImage(resource), SWASH_PACKAGE_ID);
    if ((isInput && this._converter.input === resource) || (!isInput && this._converter.output === resource)) {
      resButton.setEnabled(false);
      resButton.setTintColor(Colors.red);
    }

    resButton.onClicked.add(() => {
      if (isInput) {
        this._converter.input = resource;
      } else {
        this._converter.output = resource;
      }
    });

    return resButton;
  }

  private _renderScreenUi() {
    const container = new LayoutBox();

    // Overall backdrop
    const backdrop = new Border().setColor(Colors.black);
    container.setChild(backdrop);

    // Overall Rows
    const column = new VerticalBox();
    backdrop.setChild(column);

    // Overall Header
    const header = new Text().setText('Resources:').setFontSize(18);
    column.addChild(header);

    // Columns for resources
    const resourceContainer = new HorizontalBox();
    column.addChild(resourceContainer, 0.33);

    // Resources
    for (const r in Resources) {
      if (isNaN(+r) && r !== Resource.getName(Resources.None)) {
        resourceContainer.addChild(this._createResourceControl(r), 1);
      }
    }

    // Columns for conversion tool
    const conversionContainer = new HorizontalBox();
    column.addChild(conversionContainer, 0.66);

    // Backdrop for conversion tool
    const conversionBorder = new Border().setColor(Colors.blue);
    conversionContainer.addChild(conversionBorder, 1);

    // Rows for conversion tool
    const conversionBox = new VerticalBox();
    conversionBorder.setChild(conversionBox);

    // Conversion tool header
    const conversionToolHeader = new Text().setText('Trading:').setFontSize(16);
    conversionBox.addChild(conversionToolHeader);

    // Columns for conversion tool controls
    const conversionControls = new HorizontalBox().setChildDistance(15);
    conversionBox.addChild(conversionControls, 0.75);

    // Two columns for output controls
    const outputControls = new HorizontalBox()
      .setChildDistance(5)
      .setHorizontalAlignment(HorizontalAlignment.Center)
      .setVerticalAlignment(VerticalAlignment.Center);
    conversionControls.addChild(outputControls, 0.4);

    // Output clear button
    const outputClear = new Button().setText('X').setFontSize(24);
    outputClear.onClicked.add(() => (this._converter.output = Resources.None));
    outputControls.addChild(outputClear);

    // Rows for conversion output
    const outputResourceControls = new VerticalBox().setChildDistance(5);
    outputControls.addChild(outputResourceControls, 1);

    // Output buttons rows
    const outputRow1 = new HorizontalBox().setChildDistance(15);
    outputResourceControls.addChild(outputRow1, 1);
    const outputRow2 = new HorizontalBox().setChildDistance(15);
    outputResourceControls.addChild(outputRow2, 1);

    // Output buttons
    var i = 0;
    for (const r in Resources) {
      if (isNaN(+r) && r !== Resource.getName(Resources.None)) {
        const btn = this._createConversionControl(r, false);
        if (i < 4) {
          outputRow1.addChild(btn, 1);
        } else {
          outputRow2.addChild(btn, 1);
        }
        i++;
      }
    }

    // Amount backdrop
    const amountBackdrop = new VerticalBox();
    conversionControls.addChild(amountBackdrop, 0.2);

    // Amount Wrapper
    const amountWrapper = new VerticalBox()
      .setHorizontalAlignment(HorizontalAlignment.Center)
      .setVerticalAlignment(VerticalAlignment.Top);
    amountBackdrop.addChild(amountWrapper, 1);

    // Amount container
    const amountControls = new HorizontalBox().setChildDistance(20).setVerticalAlignment(VerticalAlignment.Center);
    amountWrapper.addChild(amountControls);
    amountWrapper.addChild(new Text().setText('Transaction Amount'), 1);

    const amountSub = new Button().setText('-').setFontSize(24);
    amountSub.onClicked.add(() => this._converter.numTransactions--);
    amountControls.addChild(amountSub, 1);

    const amount = new Text().setText(this._converter.numTransactions.toString()).setFontSize(32);
    amountControls.addChild(amount, 1);

    const amountAdd = new Button().setText('+').setFontSize(24);
    amountAdd.onClicked.add(() => this._converter.numTransactions++);
    amountControls.addChild(amountAdd, 1);

    // Two columns for output controls
    const inputControls = new HorizontalBox()
      .setChildDistance(5)
      .setHorizontalAlignment(HorizontalAlignment.Center)
      .setVerticalAlignment(VerticalAlignment.Center);
    conversionControls.addChild(inputControls, 0.4);

    // Rows for conversion input
    const inputResourceControls = new VerticalBox().setChildDistance(5);
    inputControls.addChild(inputResourceControls, 1);

    // Input buttons rows
    const inputRow1 = new HorizontalBox().setChildDistance(15);
    inputResourceControls.addChild(inputRow1, 1);
    const inputRow2 = new HorizontalBox().setChildDistance(15);
    inputResourceControls.addChild(inputRow2, 1);

    // Input buttons
    var i = 0;
    for (const r in Resources) {
      if (isNaN(+r) && r !== Resource.getName(Resources.None)) {
        const btn = this._createConversionControl(r, true);
        if (i < 4) {
          inputRow1.addChild(btn, 1);
        } else {
          inputRow2.addChild(btn, 1);
        }
        i++;
      }
    }

    // Input clear button
    const inputClear = new Button().setText('X').setFontSize(24);
    inputClear.onClicked.add(() => (this._converter.input = Resources.None));
    inputControls.addChild(inputClear);

    // Convert Button Row
    const convertButtonRow = new HorizontalBox()
      .setHorizontalAlignment(HorizontalAlignment.Center)
      .setVerticalAlignment(VerticalAlignment.Center);
    conversionBox.addChild(convertButtonRow, 0.5);

    // Convert Button
    const btnText = `Convert ${this._converter.outputAmount} ${this._converter.outputName} to ${this._converter.inputAmount} ${this._converter.inputName}`;
    const convertButton = new Button().setText(btnText).setFontSize(16);
    convertButton.onClicked.add(() => this._convertResources());
    convertButton.setVisible(this._converter.isValid);

    convertButtonRow.addChild(convertButton, 1);

    // Error
    if (!this._converter.isValid) {
      const errorBorder = new Border().setColor(Colors.red);
      convertButtonRow.addChild(errorBorder, 0.25);
      const error = new Text()
        .setText(`Transaction is invalid. If both resources are selected, try increasing amount.`)
        .setTextColor(Colors.black)
        .setFontSize(14);
      errorBorder.setChild(error);
    }

    if (this._screenUI) {
      world.removeScreenUIElement(this._screenUI);
    }

    this._screenUI = new ScreenUIElement();
    this._screenUI.relativePositionX = true;
    this._screenUI.relativePositionY = true;
    this._screenUI.relativeWidth = true;
    this._screenUI.relativeHeight = true;
    this._screenUI.anchorX = 1;
    this._screenUI.anchorY = 1;
    this._screenUI.positionX = 1;
    this._screenUI.positionY = 1;
    this._screenUI.width = 0.45;
    this._screenUI.height = 0.275;
    this._screenUI.widget = container;
    this._screenUI.players.setPlayerSlots([this.playerIndex]);
    world.addScreenUI(this._screenUI);
  }
}
