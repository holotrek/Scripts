import { Border, Button, Card, GameObject, HorizontalBox, ImageWidget, LayoutBox, ObjectType, Player, Rotator, Text, UIPresentationStyle, Vector, VerticalBox, world } from '@tabletop-playground/api';
import { Colors, SWASH_PACKAGE_ID } from '../constants';
import { ImageTextStatRow, TextStatRow } from '../ui/statRow';
import { IUpgradeable } from '../interfaces/upgradeable';
import { MulticastDelegate } from '../multicastDelegate';
import { Resource, Resources } from '../resources';
import { ShipSizes, ShipSpec } from '../specs/ship';
import { ShipUpgrade } from '../shipUpgrade';
import { UIRenderer } from '../ui/renderer';
import { Upgrade } from '../upgrade';

export class ShipBehavior implements IUpgradeable {
  private _uiRenderer: UIRenderer;
  private _buttonRenderer: UIRenderer;
  private _isOwned = false;
  private _crewOnDefense: Array<string> = [];
  private _crewOnAttack: { [key: number]: Array<string> } = {};
  private _damageCubes: { [key: number]: Array<string> } = {};
  private _upgrades: ShipUpgrade[] = [];
  private _isInClaimChoiceMode = false;

  get combatValue(): number {
    return (
      this.initialCombatValue +
      Object.values(this._upgrades)
        .map(x => x?.combatValue ?? 0)
        .reduce((pv, cv) => pv + cv, 0)
    );
  }

  get defense(): number {
    return (
      this.initialDefense +
      Object.values(this._upgrades)
        .map(x => x?.defense ?? 0)
        .reduce((pv, cv) => pv + cv, 0) +
      this._crewOnDefense.length
    );
  }

  get cargo(): number {
    return (
      this.initialCargo +
      Object.values(this._upgrades)
        .map(x => x?.cargo ?? 0)
        .reduce((pv, cv) => pv + cv, 0)
    );
  }

  get damageTaken(): number {
    let damage = 0;
    for (const arr of Object.values(this._damageCubes)) {
      damage += arr.length;
    }
    for (const arr of Object.values(this._crewOnAttack)) {
      damage += arr.length;
    }
    return damage;
  }

  get damageLeader(): number {
    return this._getPlayerWithMostTokens(this._damageCubes);
  }

  get attackLeader(): number {
    const leader = this._getPlayerWithMostTokens(this._crewOnAttack);
    return leader > -1 ? leader : this.damageLeader;
  }

  get attackLeaderName(): string | undefined {
    if (this.attackLeader > -1) {
      return world.getPlayerBySlot(this.attackLeader)?.getName();
    }
    return undefined;
  }

  get isOwned(): boolean {
    return this._isOwned;
  }
  set isOwned(owned: boolean) {
    this._isOwned = owned;
    this._renderStatsUi();
  }

  name: string;
  size: ShipSizes;
  health: number;
  initialCombatValue: number;
  initialDefense: number;
  initialCargo: number;
  overkill: number;
  dice: number;
  scrap: Array<Resources>;

  onUseShipSelected: MulticastDelegate<(ship: ShipBehavior) => void>;
  onShipScrapSelected: MulticastDelegate<(ship: ShipBehavior) => void>;

  /**
   * A ship in the Swash game
   * @param card The actual game card that this behavior is related to
   * @param spec Contains the specification of this ship's stats
   */
  constructor(public card: Card, spec: ShipSpec) {
    this.name = spec.name;
    this.size = spec.size;
    this.health = spec.health;
    this.initialCombatValue = spec.combatValue;
    this.initialDefense = spec.defense;
    this.initialCargo = spec.cargo;
    this.overkill = spec.overkill;
    this.dice = spec.dice;
    this.scrap = spec.scrap;

    this.onUseShipSelected = new MulticastDelegate<(ship: ShipBehavior) => void>();
    this.onShipScrapSelected = new MulticastDelegate<(ship: ShipBehavior) => void>();
    this._uiRenderer = new UIRenderer(card);
    this._buttonRenderer = new UIRenderer(card);
    card.onMovementStopped.add(_ => this._renderUis());
    this.isOwned = !!world.getAllZones().find(z => !!z.getOverlappingObjects().find(o => o.getId() === card.getId()));
  }

  getUpgrades(): Array<Upgrade> {
    return this._upgrades;
  }

  addUpgrade(upgrade: ShipUpgrade): boolean {
    if (this._upgrades.map(x => x.name).includes(upgrade.name)) {
      return false;
    }

    this._upgrades.push(upgrade);
    this._renderUis();
    return true;
  }

  removeUpgrade(upgrade: ShipUpgrade) {
    const idx = this._upgrades.findIndex(x => x.name === upgrade.name);
    if (idx > -1) {
      this._upgrades = [...this._upgrades.slice(0, idx), ...this._upgrades.slice(idx + 1)];
      this._renderUis();
      return true;
    }

    return false;
  }

  removeAllUpgrades() {
    this._upgrades = [];
    this._renderUis();
  }

  triggerCrewMoved(player: Player, crewObj: GameObject, isOnShip: boolean, disableMessages = false) {
    const crewId = crewObj.getId();
    if (this.isOwned) {
      if (isOnShip && !this._crewOnDefense.includes(crewId)) {
        this._crewOnDefense.push(crewId);
        this._renderUis();

        if (!disableMessages) {
          world.broadcastChatMessage(
            `${player.getName()} added a crewmember to Ship defense.`,
            player.getPlayerColor()
          );
        }
      } else if (!isOnShip) {
        const idx = this._crewOnDefense.findIndex(c => c === crewId);
        if (idx > -1) {
          this._crewOnDefense.splice(idx, 1);
          this._renderUis();
        }

        if (!disableMessages) {
          world.broadcastChatMessage(
            `${player.getName()} removed a crewmember from Ship defense.`,
            player.getPlayerColor()
          );
        }
      }
    } else {
      const added = this._addPlayerRelatedObject(this._crewOnAttack, player, crewObj);
      if (added) {
        if (!disableMessages) {
          world.broadcastChatMessage(`${player.getName()} boarded a ${this.name}.`, player.getPlayerColor());
        }
        this._renderUis();
      }
    }
  }

  triggerCubePlacedHere(player: Player, cubeObj: GameObject, disableMessages = false) {
    const added = this._addPlayerRelatedObject(this._damageCubes, player, cubeObj);
    if (added) {
      if (!disableMessages) {
        world.broadcastChatMessage(`${player.getName()} added 1 damage to ${this.name}.`, player.getPlayerColor());
      }
      this._renderUis();
    }
  }

  private _addPlayerRelatedObject(collection: { [key: number]: string[] }, player: Player, obj: GameObject) {
    const id = obj.getId();
    const existing = collection[player.getSlot()] ?? [];
    if (existing.includes(id)) {
      return false;
    }

    existing.push(id);
    collection[player.getSlot()] = existing;

    const isCardUnder = (obj: GameObject) => {
      const objsUnder = world.sphereOverlap(obj.getPosition(), 1);
      return objsUnder.find(o => o.getId() === this.card.getId());
    };
    const removeFunc = () => {
      const existing = collection[player.getSlot()] ?? [];
      const idx = existing.indexOf(id);
      existing.splice(idx, 1);
      collection[player.getSlot()] = existing;
      this._renderUis();
    };

    obj.onMovementStopped.add(obj => {
      if (!isCardUnder(obj)) {
        removeFunc();
      }
    });
    obj.onDestroyed.add(removeFunc);

    return true;
  }

  private _getPlayerWithMostTokens(tokenSet: { [key: number]: string[] }): number {
    let curLeader = -1;
    let leaderAmount = 0;
    for (const slot in tokenSet) {
      if (tokenSet[+slot].length > leaderAmount) {
        curLeader = +slot;
        leaderAmount = tokenSet[+slot].length;
      }
    }

    return curLeader;
  }

  private _renderUis() {
    this._renderStatsUi();
    this._renderButtonUi();
  }

  private _renderStatsUi() {
    const container = new LayoutBox();
    container.setVisible(
      (this.card.isFaceUp() || this.card.getObjectType() === ObjectType.Ground) && this.card.getStackSize() === 1
    );

    const backdrop = new Border().setColor(Colors.black);
    container.setChild(backdrop);

    const column = new VerticalBox();
    backdrop.setChild(column);

    column.addChild(new Text().setText(`${this.name} Stats:`).setFontSize(16));
    if (!this.isOwned) {
      const overallHealth = `${this.health - this.damageTaken} / ${this.health}`;
      column.addChild(new ImageTextStatRow('Health:', 'Health.png', overallHealth, Colors.green, Colors.black));
    }
    if (this.attackLeaderName) {
      column.addChild(new Text().setText('Attack Leader:'));
      column.addChild(new Text().setText(this.attackLeaderName).setFontSize(16));
    }
    column.addChild(new ImageTextStatRow('CV:', 'CV.png', this.combatValue.toString(), Colors.red));
    if (this.isOwned) {
      column.addChild(new ImageTextStatRow('Defense:', 'Defense.png', this.defense.toString(), Colors.blue));
    }
    column.addChild(new ImageTextStatRow('Cargo:', 'Cargo.png', this.cargo.toString(), Colors.gold, Colors.black));
    column.addChild(new TextStatRow('Sink DMG:', (this.health - this.overkill).toString(), Colors.black));
    column.addChild(new TextStatRow('FATE Dice:', this.dice.toString(), Colors.black));

    if (!this.isOwned) {
      column.addChild(new Text().setText('Scrap Rewards:'));
      const resources = new HorizontalBox();
      for (const r of this.scrap) {
        const img = Resource.getImage(r);
        resources.addChild(new ImageWidget().setImageSize(0, 64).setImage(img, SWASH_PACKAGE_ID));
      }
      column.addChild(resources);
    }

    this._uiRenderer.renderUI(container, ui => {
      ui.anchorY = 1.0;
      ui.position = new Vector(7.5, 0, 0);
      ui.presentationStyle = UIPresentationStyle.ViewAligned;
      ui.scale = 0.3;
    });
  }

  private _renderButtonUi() {
    const container = new LayoutBox();
    container.setVisible(
      (this.card.isFaceUp() || this.card.getObjectType() === ObjectType.Ground) &&
        this.card.getStackSize() === 1 &&
        this.attackLeader > -1
    );

    const box = new VerticalBox();
    container.setChild(box);

    if (this._isInClaimChoiceMode) {
      const useBackdrop = new Border().setColor(Colors.green);
      box.addChild(useBackdrop, 1);
      const useButton = new Button().setText('Use Ship');
      useButton.onClicked.add(() => {
        this.onUseShipSelected.trigger(this);
        this._isInClaimChoiceMode = false;
        this._renderButtonUi();
      });
      useBackdrop.setChild(useButton);

      const scrapBackdrop = new Border().setColor(Colors.gold);
      box.addChild(scrapBackdrop, 1);
      const scrapButton = new Button().setText('Scrap Ship');
      scrapButton.onClicked.add(() => {
        this.onShipScrapSelected.trigger(this);
        this._isInClaimChoiceMode = false;
        this._renderButtonUi();
      });
      scrapBackdrop.setChild(scrapButton);

      const cancelBackdrop = new Border().setColor(Colors.red);
      box.addChild(cancelBackdrop, 1);
      const cancelButton = new Button().setText('Cancel');
      cancelButton.onClicked.add(() => {
        this._isInClaimChoiceMode = false;
        this._renderButtonUi();
      });
      cancelBackdrop.setChild(cancelButton);
    } else {
      const backdrop = new Border().setColor(Colors.black);
      box.addChild(backdrop, 1);
      const button = new Button().setText('Claim Ship');
      button.onClicked.add(() => {
        this._isInClaimChoiceMode = true;
        this._renderButtonUi();
      });
      backdrop.setChild(button);
    }

    this._buttonRenderer.renderUI(container, ui => {
      ui.position = new Vector(2, 0, -0.1);
      ui.rotation = new Rotator(180, 180, 0);
      ui.scale = 0.75;
      ui.players.setPlayerSlots([this.attackLeader]);
    });
  }
}
