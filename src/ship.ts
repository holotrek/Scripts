import { Border, Card, GameObject, LayoutBox, Text, UIElement, UIPresentationStyle, Vector, VerticalBox } from '@tabletop-playground/api';
import { Colors } from './constants';
import { ShipUpgrade } from './shipUpgrade';
import { TextStatRow } from './ui/statRow';

export enum ShipSizes {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

export class Ship {
  private _sheet?: GameObject;

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

  /**
   * A ship in the Swash game that defines the stats
   * @param name The name of the ship
   * @param size The ship size
   * @param health The ship health
   * @param initialCombatValue The starting Combat Value
   * @param initialDefense The starting Defense
   * @param initialCargo The starting Cargo
   */
  constructor(
    public name: string,
    public size: ShipSizes,
    public health: number,
    public initialCombatValue: number,
    public initialDefense: number,
    public initialCargo: number
  ) {}

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

  setSheet(obj: GameObject) {
    this._sheet = obj;
    this._renderStatsUi();
  }

  _renderStatsUi() {
    if (this._sheet) {
      if ((this._sheet as Card).isFaceUp()) {
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
        if (this._sheet.getUIs().length) {
          this._sheet.setUI(0, ui);
        } else {
          this._sheet.addUI(ui);
        }
      } else {
        this._sheet.removeUI(0);
      }
    }
  }
}
