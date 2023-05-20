import { Border, Button, Card, GameObject, HorizontalAlignment, HorizontalBox, ImageButton, ImageWidget, Label, LayoutBox, Player, Rotator, ScreenUIElement, SnapPoint, Text, Vector, VerticalAlignment, VerticalBox, world, Zone } from '@tabletop-playground/api';
import { CaptainBehavior } from './behaviors/captain';
import { CaptainManager } from './managers/captainManager';
import { CardHelper } from './cardHelper';
import { Colors, PLAYER_SLOTS, SWASH_PACKAGE_ID, Tags } from './constants';
import { IUpgradeable } from './interfaces/upgradeable';
import { IUpgradeMetadata, Upgrade, UpgradeType } from './upgrade';
import { Resource, ResourceConverter, Resources } from './resources';
import { ResourceManager } from './managers/resourceManager';
import { ShipBehavior } from './behaviors/ship';
import { ShipManager } from './managers/shipManager';
import { SnapPointManager, SnapPoints } from './managers/snapPointManager';
import { SwashZone } from './swashZone';
import { UpgradeManager } from './managers/upgradeManager';

export class SwashPlayerVectors {
  static center = new Vector(56, 0, 0);
  static rect = new Vector(54, 113, 0);
  static nameLabel = new Vector(-23, 0, 0);
  static captainUpgrades = new Vector(0, -40, 0);
  static captainUpgradesRect = new Vector(50, 30, 0);
  static shipUpgrades = new Vector(0, 42, 0);
  static shipUpgradesRect = new Vector(50, 26, 0);
  static ship = new Vector(11, 20, 0);
  static drawDeck = new Vector(-13, -20, 0);
  static discardDeck = new Vector(-13, 20, 0);
  static drawLabel = new Vector(-4, -20, 0);
  static discardLabel = new Vector(-4, 20, 0);
  static resources = new Vector(24, -22, 0);
}

export class SwashPlayer {
  private _screenUI?: ScreenUIElement;
  private _optimisticResources: { [key: string]: number } = {};
  private _converter: ResourceConverter;
  private _labels: Array<Label> = [];
  private _shipEventsBound: Array<string> = [];
  private _captainUpgradeZone?: SwashZone;
  private _shipUpgradeZone?: SwashZone;

  faction: string;
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
   * @param {Vector} centerPoint
   * @param {boolean} isRotated
   */
  constructor(public playerIndex: number, public centerPoint: Vector, public isRotated: boolean) {
    this.faction = PLAYER_SLOTS[playerIndex];
    this._converter = new ResourceConverter();
    this._converter.onCalculationChanged(() => this._renderScreenUi());
    this._renderScreenUi();
  }

  setupPlayerArea() {
    this._createStartingShip();
    this._createPlayerZones();
    this._labels.push(this._createLabel('Draw', SwashPlayerVectors.drawLabel));
    this._labels.push(this._createLabel('Discard', SwashPlayerVectors.discardLabel));
    this._labels.push(this._createPlayerLabel(SwashPlayerVectors.nameLabel, 1));
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
    if (this.ship) {
      CardHelper.discardShip(this.ship.card);
      this.ship = undefined;
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
    if (this._shipEventsBound.includes(ship.card.getId())) {
      return;
    }

    ship.onUseShipSelected.add(ship => this._claimShip(ship));
    ship.onShipScrapSelected.add(ship => this._scrapShip(ship));
    this._shipEventsBound.push(ship.card.getId());
  }

  private _claimShip(ship: ShipBehavior) {
    this._returnDamageCubesAndCrew(ship);
    if (this.ship) {
      if (this._shipUpgradeZone) {
        // Give resources for all existing ship upgrades
        const allShipUpgrades = CardHelper.getAllCardDetailsInZone(this._shipUpgradeZone.zone);
        const allMeta = allShipUpgrades.map(su => JSON.parse(su.metadata) as IUpgradeMetadata);
        const resourceAmts = allMeta.reduce((pv, cv: IUpgradeMetadata) => {
          var r = Resource.fromName(cv.resource);
          pv[r] = (pv[r] || 0) + 1;
          return pv;
        }, {} as { [key: number]: number });
        for (const r in resourceAmts) {
          if (Object.hasOwn(resourceAmts, +r)) {
            this._addResource(+r, resourceAmts[r]);
          }
        }

        // Clear upgrades from ship
        this.ship.removeAllUpgrades();

        // Discard Ship Upgrades
        const discardPoint = this._getAbsolutePoint(SwashPlayerVectors.discardDeck);
        const allUpgrades = CardHelper.getAllCardsInZone(this._shipUpgradeZone?.zone);
        CardHelper.discardCardsToPoint(discardPoint, allUpgrades);
      }

      const shipPos = this.ship.card.getPosition();
      const shipRot = this.ship.card.getRotation();
      CardHelper.discardShip(this.ship.card);
      ship.card.toggleLock();
      ship.card.setPosition(shipPos);
      ship.card.setRotation(shipRot);
      ship.card.freeze();
      this._assignShip(ship.card);
    }
  }

  private _scrapShip(ship: ShipBehavior) {
    this._returnDamageCubesAndCrew(ship);
    for (const r of ship.scrap) {
      this._addResource(r, 1);
    }
    CardHelper.discardShip(ship.card);
  }

  private _returnDamageCubesAndCrew(ship: ShipBehavior) {
    const pos = ship.card.getPosition();
    const objsOnShip = world.boxOverlap(pos, [7, 11.4, 1]);
    const cubes = objsOnShip.filter(o => o.getTags().includes(Tags.DamageCube));
    for (const c of cubes) {
      c.destroy();
    }

    const crew = objsOnShip.filter(o => o.getTags().includes(Tags.Crew));
    for (const c of crew) {
      const cpt = CaptainManager.getCaptainByPlayerTags(c.getTags());
      cpt?.returnCrew(c);
    }
  }

  private _assignShip(card: Card) {
    const ship = ShipManager.registerCard(card);
    this.ship = ship;
    if (this.ship) {
      this.ship.isOwned = true;
    }
  }

  private _getAbsolutePoint(delta: Vector) {
    return this.centerPoint.add(delta.multiply(this.isRotated ? -1 : 1));
  }

  private _createStartingShip(name = 'Sloop') {
    const shipPoint = this._getAbsolutePoint(SwashPlayerVectors.ship);
    if (CardHelper.getCardAtPoint(shipPoint)) {
      return;
    }

    const drawDeck = CardHelper.getCardAtPoint(SnapPointManager.getPointVector(SnapPoints.ShipDeck));
    let sloopIdx = -1;
    for (const d of drawDeck?.getAllCardDetails() || []) {
      if (d.name === name) {
        sloopIdx = d.stackIndex;
      }
    }
    if (sloopIdx > -1) {
      const sloop = drawDeck?.takeCards(1, true, sloopIdx);
      sloop?.setPosition(this._getAbsolutePoint(SwashPlayerVectors.ship));
      sloop?.setRotation(new Rotator(180, this.isRotated ? 0 : 180, 0));
      sloop?.freeze();
    }
  }

  private _createPlayerZones() {
    const zone = SwashZone.createZone(
      this.color,
      this.playerIndex,
      this.centerPoint,
      SwashPlayerVectors.rect,
      this.isRotated
    );
    this.zones.push(zone);
    this.playerZone = zone;
    zone.setOnCardEnter(card => this._processShipPlacedInZone(card));
    this._assignZoneObjects(zone.zone);
    for (const c of CardHelper.getAllCardsInZone(zone.zone)) {
      if (c.getTags().includes(Tags.Resource)) {
        this._updateResources(zone, true);
      } else if (c.getTags().includes(Tags.SwashShip)) {
        this._processShipPlacedInZone(c, true);
      }
    }
    zone.zone.onBeginOverlap.add(() => {
      this._updateResources(zone);
    });
    zone.zone.onEndOverlap.add(() => {
      this._updateResources(zone);
    });

    this._captainUpgradeZone = this._createUpgradeZone(
      'Captain Upgrades',
      SwashPlayerVectors.captainUpgrades,
      SwashPlayerVectors.captainUpgradesRect,
      (zone, disableMessages) => this._captainUgradesChanged(zone, disableMessages)
    );

    this._shipUpgradeZone = this._createUpgradeZone(
      'Ship Upgrades',
      SwashPlayerVectors.shipUpgrades,
      SwashPlayerVectors.shipUpgradesRect,
      (zone, disableMessages) => this._shipUgradesChanged(zone, disableMessages)
    );
  }

  private _createUpgradeZone(
    label: string,
    delta: Vector,
    rect: Vector,
    changedFn: (zone: SwashZone, disableMessages?: boolean) => void
  ) {
    const zoneCenter = this._getAbsolutePoint(delta);
    const zone = SwashZone.createZone(this.color, this.playerIndex, zoneCenter, rect, this.isRotated, 0.5, label);
    zone.setOnCardEnter(_ => changedFn(zone));
    zone.setOnCardLeave(_ => changedFn(zone));
    this.zones.push(zone);
    changedFn(zone, true);
    return zone;
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
    const existing = CardHelper.getAllCardsInZone(this.playerZone?.zone).filter(c => c.getTemplateName() === name);

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
    const resourceDelta = new Vector(-5 * Math.floor((resource - 1) / 4), 5 * Math.floor((resource - 1) % 4), 20);
    const delta = SwashPlayerVectors.resources.add(resourceDelta);
    let pos = this._getAbsolutePoint(delta);
    const container = ResourceManager.resourceContainers[resource];
    const token = container.takeAt(0, pos);
    if (token) {
      for (let i = 0; i < amount; i++) {
        pos = pos.add(new Vector(0, 0, 1));
        const dupe = world.createObjectFromJSON(token.toJSONString(), pos);
        dupe?.onDestroyed.add(() => this._updateResources(this.playerZone));
        dupe?.setRotation(new Rotator(0, this.isRotated ? 180 : 0, 0));
      }
      container.addObjects([token]);
    }

    const name = Resource.getName(resource);
    this._optimisticResources[name] = (this._optimisticResources[name] || 0) + amount;
    this._renderScreenUi();
    this._updateResources(this.playerZone);
  }

  private _createPlayerLabel(delta: Vector, scale = 0.5) {
    const label = this._createLabel(this.player?.getName() || this.faction, delta, scale);
    label.setColor(this.player?.getPlayerColor() || Colors.white);
    return label;
  }

  private _createLabel(text: string, delta: Vector, scale = 0.5) {
    const position = this._getAbsolutePoint(delta);
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
