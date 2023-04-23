import { Border, GameObject, LayoutBox, Player, SnapPoint, Text, UIElement, UIPresentationStyle, Vector, VerticalBox, world } from '@tabletop-playground/api';
import { CaptainUpgrade, CaptainUpgradeLocation } from './captainUpgrade';
import { Colors, Tags } from './constants';
import { ImageStatRow, TextStatRow } from './ui/statRow';
import { Resource, Resources } from './resources';

export class Captain {
  private _sheet?: GameObject;

  upgrades: CaptainUpgrade[] = [];
  initialCombatValue = 2;
  initialDefense = 1;
  initialPrecision = 2;
  crew = 5;
  guardDetail = 0;
  upgradeSlotTokens: { [key: string]: GameObject | undefined } = {};
  crewUpkeep: { resource: Resources; snapPoint?: SnapPoint }[] = [
    { resource: Resources.None },
    { resource: Resources.Leather },
    { resource: Resources.Coffee },
    { resource: Resources.Rum },
    { resource: Resources.Spices },
  ];
  abilityEyesPoint?: SnapPoint;
  abilityHandsPoint?: SnapPoint;
  abilityLegsPoint?: SnapPoint;

  get combatValue(): number {
    return this.initialCombatValue + this.upgrades.map(x => x?.combatValue ?? 0).reduce((pv, cv) => pv + cv, 0);
  }

  get defense(): number {
    return this.initialDefense + this.upgrades.map(x => x?.defense ?? 0).reduce((pv, cv) => pv + cv, 0);
  }

  get precision(): number {
    return this.initialPrecision + this.upgrades.map(x => x?.precision ?? 0).reduce((pv, cv) => pv + cv, 0);
  }

  setSheet(obj: GameObject) {
    this._sheet = obj;
    for (let i = 0; i < 5; i++) {
      const sp = obj.getSnapPoint(i);
      this.crewUpkeep[i].snapPoint = sp;
    }
    this.abilityEyesPoint = obj.getSnapPoint(6);
    this.abilityHandsPoint = obj.getSnapPoint(7);
    this.abilityLegsPoint = obj.getSnapPoint(8);
    this._renderStatsUi();
  }

  isUpkeepRequired(idx: number) {
    const cu = this.crewUpkeep[idx];
    return cu.resource !== Resources.None && !cu.snapPoint?.getSnappedObject()?.getTags()?.includes(Tags.Crew);
  }

  addUpgrade(upgrade: CaptainUpgrade): boolean {
    if (this.upgrades.map(x => x.name).includes(upgrade.name)) {
      return false;
    }

    let slotAvailable = false;
    if (upgrade.location === CaptainUpgradeLocation.Brain) {
      slotAvailable = true;
    } else if (upgrade.location === CaptainUpgradeLocation.OneHandWeapon) {
      const numOneHandWeapons = this.upgrades.filter(x => x.location === CaptainUpgradeLocation.OneHandWeapon).length;
      if (numOneHandWeapons < 2) {
        slotAvailable = true;
      }
    } else if (upgrade.location === CaptainUpgradeLocation.TwoHandWeapon) {
      slotAvailable = !this.upgrades.find(x => x.isWeapon);
    } else {
      slotAvailable = !this.upgrades.find(x => x.location === upgrade.location);
    }

    if (slotAvailable) {
      this.upgrades.push(upgrade);
      this._renderStatsUi();
      return true;
    }

    return false;
  }

  removeUpgrade(upgrade: CaptainUpgrade) {
    const idx = this.upgrades.findIndex(x => x.name === upgrade.name);
    if (idx > -1) {
      this.upgrades = [...this.upgrades.slice(0, idx), ...this.upgrades.slice(idx + 1)];
      this._renderStatsUi();
      return true;
    }

    return false;
  }

  triggerCrewMoved(player: Player, crewObj: GameObject, snapPoint?: SnapPoint) {
    if (snapPoint) {
      const upkeep = this.crewUpkeep[snapPoint.getIndex()];
      world.broadcastChatMessage(
        `${player.getName()} returned a crewmember to ${Resource.getName(upkeep.resource)} slot.`,
        player.getPlayerColor()
      );
    } else {
      world.broadcastChatMessage(`${player.getName()} moved a crewmember.`, player.getPlayerColor());
    }
    this._renderStatsUi();
  }

  _renderStatsUi() {
    if (this._sheet) {
      const container = new LayoutBox();

      const backdrop = new Border().setColor(Colors.black);
      container.setChild(backdrop);

      const column = new VerticalBox();
      backdrop.setChild(column);

      column.addChild(new Text().setText('Captain Stats:'));
      column.addChild(new TextStatRow('CV:', this.combatValue.toString(), Colors.red));
      column.addChild(new TextStatRow('Defense:', this.defense.toString(), Colors.blue));
      column.addChild(new TextStatRow('Precision:', this.precision.toString(), Colors.pink, Colors.black));

      column.addChild(new Border().setColor(Colors.white));
      column.addChild(new Text().setText('Equipment:'));
      for (const u of this.upgrades) {
        if (u.location !== CaptainUpgradeLocation.Brain) {
          column.addChild(new ImageStatRow(u.locationImage, u.name, u.isWeapon ? Colors.red : Colors.blue));
        }
      }

      column.addChild(new Border().setColor(Colors.white));
      column.addChild(new Text().setText('Upkeep:'));
      for (let i = 0; i < this.crewUpkeep.length; i++) {
        if (this.isUpkeepRequired(i)) {
          const r = this.crewUpkeep[i].resource;
          column.addChild(
            new ImageStatRow(Resource.getImage(r), Resource.getName(r), Resource.getBgColor(r), Resource.getColor(r))
          );
        }
      }

      const ui = new UIElement();
      ui.anchorY = 1.0;
      ui.position = new Vector(10, 0, 0);
      ui.presentationStyle = UIPresentationStyle.ViewAligned;
      ui.scale = 0.75;
      ui.widget = container;
      if (this._sheet.getUIs().length) {
        this._sheet.setUI(0, ui);
      } else {
        this._sheet.addUI(ui);
      }
    }
  }
}
