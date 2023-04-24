import { Border, Card, GameObject, LayoutBox, Text, UIElement, UIPresentationStyle, Vector, VerticalBox } from '@tabletop-playground/api';
import { Colors } from '../constants';
import { IUpgradeable } from '../interfaces/upgradeable';
import { ShipSizes, ShipSpec } from '../specs/ship';
import { ShipUpgrade } from '../shipUpgrade';
import { TextStatRow } from '../ui/statRow';
import { Upgrade } from '../upgrade';

export class ShipBehavior implements IUpgradeable {
  upgrades: ShipUpgrade[] = [];
  guardDetail = 0;
  isOwned = false;

  get combatValue(): number {
    return (
      this.initialCombatValue +
      Object.values(this.upgrades)
        .map(x => x?.combatValue ?? 0)
        .reduce((pv, cv) => pv + cv, 0)
    );
  }

  get defense(): number {
    return (
      this.initialDefense +
      Object.values(this.upgrades)
        .map(x => x?.defense ?? 0)
        .reduce((pv, cv) => pv + cv, 0)
    );
  }

  get cargo(): number {
    return (
      this.initialCargo +
      Object.values(this.upgrades)
        .map(x => x?.cargo ?? 0)
        .reduce((pv, cv) => pv + cv, 0)
    );
  }

  name: string;
  size: ShipSizes;
  health: number;
  initialCombatValue: number;
  initialDefense: number;
  initialCargo: number;

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
    this._renderStatsUi();
    card.onMovementStopped.add(_ => this._renderStatsUi());
  }

  getUpgrades(): Array<Upgrade> {
    return this.upgrades;
  }

  addUpgrade(upgrade: ShipUpgrade): boolean {
    if (this.upgrades.map(x => x.name).includes(upgrade.name)) {
      return false;
    }

    this.upgrades.push(upgrade);
    this._renderStatsUi();
    return true;
  }

  removeUpgrade(upgrade: ShipUpgrade) {
    const idx = this.upgrades.findIndex(x => x.name === upgrade.name);
    if (idx > -1) {
      this.upgrades = [...this.upgrades.slice(0, idx), ...this.upgrades.slice(idx + 1)];
      this._renderStatsUi();
      return true;
    }

    return false;
  }

  private _renderStatsUi() {
    if (this.card.isFaceUp()) {
      const container = new LayoutBox();

      const backdrop = new Border().setColor(Colors.black);
      container.setChild(backdrop);

      const column = new VerticalBox();
      backdrop.setChild(column);

      column.addChild(new Text().setText(`${this.name} Stats:`));
      column.addChild(new TextStatRow('CV:', this.combatValue.toString(), Colors.red));
      column.addChild(new TextStatRow('Defense:', this.defense.toString(), Colors.blue));
      column.addChild(new TextStatRow('Cargo:', this.cargo.toString(), Colors.gold, Colors.black));

      const ui = new UIElement();
      ui.anchorY = 1.0;
      ui.position = new Vector(7.5, 0, 0);
      ui.presentationStyle = UIPresentationStyle.ViewAligned;
      ui.scale = 0.5;
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
