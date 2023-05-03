import { Border, Card, GameObject, LayoutBox, ObjectType, Player, Text, UIElement, UIPresentationStyle, Vector, VerticalBox, world } from '@tabletop-playground/api';
import { Colors } from '../constants';
import { ImageTextStatRow, TextStatRow } from '../ui/statRow';
import { IUpgradeable } from '../interfaces/upgradeable';
import { ShipSizes, ShipSpec } from '../specs/ship';
import { ShipUpgrade } from '../shipUpgrade';
import { Upgrade } from '../upgrade';

export class ShipBehavior implements IUpgradeable {
  private _isOwned = false;
  private _crewOnDefense: Array<string> = [];
  private _crewOnAttack: { [key: number]: Array<string> } = {};
  private _damageCubes: { [key: number]: Array<string> } = {};
  private _upgrades: ShipUpgrade[] = [];

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
    return damage;
  }

  get damageLeader(): number {
    let curLeader = -1;
    let leaderAmount = 0;
    for (const slot in this._damageCubes) {
      if (this._damageCubes[+slot].length > leaderAmount) {
        curLeader = +slot;
        leaderAmount = this._damageCubes[+slot].length;
      }
    }
    return curLeader;
  }

  get attackLeader(): number {
    let curLeader = -1;
    let leaderAmount = 0;
    for (const slot in this._crewOnAttack) {
      if (this._crewOnAttack[+slot].length > leaderAmount) {
        curLeader = +slot;
        leaderAmount = this._crewOnAttack[+slot].length;
      }
    }

    return curLeader > -1 ? curLeader : this.damageLeader;
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
    this._renderStatsUi();
    card.onMovementStopped.add(_ => this._renderStatsUi());
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
    this._renderStatsUi();
    return true;
  }

  removeUpgrade(upgrade: ShipUpgrade) {
    const idx = this._upgrades.findIndex(x => x.name === upgrade.name);
    if (idx > -1) {
      this._upgrades = [...this._upgrades.slice(0, idx), ...this._upgrades.slice(idx + 1)];
      this._renderStatsUi();
      return true;
    }

    return false;
  }

  triggerCrewMoved(player: Player, crewObj: GameObject, isOnShip: boolean, disableMessages = false) {
    const crewId = crewObj.getId();
    if (this.isOwned) {
      if (isOnShip && !this._crewOnDefense.includes(crewId)) {
        this._crewOnDefense.push(crewId);
        this._renderStatsUi();

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
          this._renderStatsUi();
        }
      }
    } else {
      this._addPlayerRelatedObject(this._crewOnAttack, player, crewObj);
      if (!disableMessages) {
        world.broadcastChatMessage(`${player.getName()} boarded a ${this.name}.`, player.getPlayerColor());
      }
      this._renderStatsUi();
    }
  }

  triggerCubePlacedHere(player: Player, cubeObj: GameObject, disableMessages = false) {
    this._addPlayerRelatedObject(this._damageCubes, player, cubeObj);
    if (!disableMessages) {
      world.broadcastChatMessage(`${player.getName()} added 1 damage to ${this.name}.`, player.getPlayerColor());
    }
    this._renderStatsUi();
  }

  private _addPlayerRelatedObject(collection: { [key: number]: string[] }, player: Player, obj: GameObject) {
    const id = obj.getId();
    const existing = collection[player.getSlot()] ?? [];
    existing.push(id);
    collection[player.getSlot()] = existing;
    const removeFunc = () => {
      const objsUnder = world.sphereOverlap(obj.getPosition(), 1);
      if (!objsUnder.find(o => o.getId() === this.card.getId())) {
        const existing = collection[player.getSlot()] ?? [];
        const idx = existing.indexOf(id);
        existing.splice(idx, 1);
        collection[player.getSlot()] = existing;
        this._renderStatsUi();
      }
    };
    obj.onMovementStopped.add(removeFunc);
    obj.onDestroyed.add(removeFunc);
  }

  private _renderStatsUi() {
    if ((this.card.isFaceUp() || this.card.getObjectType() === ObjectType.Ground) && this.card.getStackSize() === 1) {
      const container = new LayoutBox();

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
        column.addChild(new TextStatRow('Attack Leader:', this.attackLeaderName, Colors.black));
      }
      column.addChild(new ImageTextStatRow('CV:', 'CV.png', this.combatValue.toString(), Colors.red));
      if (this.isOwned) {
        column.addChild(new ImageTextStatRow('Defense:', 'Defense.png', this.defense.toString(), Colors.blue));
      }
      column.addChild(new ImageTextStatRow('Cargo:', 'Cargo.png', this.cargo.toString(), Colors.gold, Colors.black));
      column.addChild(new TextStatRow('Sink DMG:', (this.health - this.overkill).toString(), Colors.black));
      column.addChild(new TextStatRow('FATE Dice:', this.dice.toString(), Colors.black));

      const ui = new UIElement();
      ui.anchorY = 1.0;
      ui.position = new Vector(7.5, 0, 0);
      ui.presentationStyle = UIPresentationStyle.ViewAligned;
      ui.scale = 0.3;
      ui.widget = container;
      if (this.card.getUIs().length) {
        this.card.setUI(0, ui);
      } else {
        this.card.addUI(ui);
      }
    } else {
      this.card.removeUI(0);
    }
  }
}
