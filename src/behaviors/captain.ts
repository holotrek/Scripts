import { Border, Card, GameObject, LayoutBox, Player, SnapPoint, Text, UIElement, UIPresentationStyle, Vector, VerticalBox, world } from '@tabletop-playground/api';
import { CaptainUpgrade, CaptainUpgradeLocation } from '../captainUpgrade';
import { Colors, Tags } from '../constants';
import { ImageStatRow, ImageTextStatRow, TextStatRow } from '../ui/statRow';
import { IUpgradeable } from '../interfaces/upgradeable';
import { Resource, Resources } from '../resources';
import { Upgrade } from '../upgrade';

export class CaptainBehavior implements IUpgradeable {
  private _isActive = false;
  private _crewOnDefense: Array<string> = [];

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
    return (
      this.initialDefense +
      this.upgrades.map(x => x?.defense ?? 0).reduce((pv, cv) => pv + cv, 0) +
      this._crewOnDefense.length
    );
  }

  get precision(): number {
    return this.initialPrecision + this.upgrades.map(x => x?.precision ?? 0).reduce((pv, cv) => pv + cv, 0);
  }

  get isActive(): boolean {
    return this._isActive;
  }
  set isActive(isActive: boolean) {
    this._isActive = isActive;
    this._renderStatsUi();
  }

  /**
   * A captain in the Swash game
   * @param card The actual game card that this behavior is related to
   */
  constructor(public card: Card) {
    this._recordSnapPoints();
  }

  isUpkeepRequired(idx: number) {
    const cu = this.crewUpkeep[idx];
    return cu.resource !== Resources.None && !cu.snapPoint?.getSnappedObject()?.getTags()?.includes(Tags.Crew);
  }

  getUpgrades(): Array<Upgrade> {
    return this.upgrades;
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

  triggerCrewMoved(
    player: Player,
    crewObj: GameObject,
    isOnCaptain: boolean,
    snapPoint?: SnapPoint,
    disableMessages = false
  ) {
    const crewId = crewObj.getId();
    if (snapPoint) {
      const upkeep = this.crewUpkeep[snapPoint.getIndex()];
      const idx = this._crewOnDefense.findIndex(c => c === crewId);
      if (idx > -1) {
        this._crewOnDefense.splice(idx, 1);
      }
      this._renderStatsUi();

      if (!disableMessages) {
        world.broadcastChatMessage(
          `${player.getName()} returned a crewmember to ${Resource.getName(upkeep.resource)} slot.`,
          player.getPlayerColor()
        );
      }
    } else if (isOnCaptain && !this._crewOnDefense.includes(crewId)) {
      this._crewOnDefense.push(crewId);
      this._renderStatsUi();

      if (!disableMessages) {
        world.broadcastChatMessage(
          `${player.getName()} added a crewmember to Captain defense.`,
          player.getPlayerColor()
        );
      }
    } else if (!isOnCaptain) {
      this._renderStatsUi();
    }
  }

  private _recordSnapPoints() {
    for (let i = 0; i < 5; i++) {
      const sp = this.card.getSnapPoint(i);
      this.crewUpkeep[i].snapPoint = sp;
    }
    this.abilityEyesPoint = this.card.getSnapPoint(6);
    this.abilityHandsPoint = this.card.getSnapPoint(7);
    this.abilityLegsPoint = this.card.getSnapPoint(8);
    this._renderStatsUi();
  }

  private _renderStatsUi() {
    if (this.isActive) {
      const container = new LayoutBox();

      const backdrop = new Border().setColor(Colors.black);
      container.setChild(backdrop);

      const column = new VerticalBox();
      backdrop.setChild(column);

      column.addChild(new Text().setText('Captain Stats:').setFontSize(16));
      column.addChild(new ImageTextStatRow('CV:', 'CV.png', this.combatValue.toString(), Colors.red));
      column.addChild(new ImageTextStatRow('Defense:', 'Defense.png', this.defense.toString(), Colors.blue));
      column.addChild(
        new ImageTextStatRow('Precision:', 'Precision.png', this.precision.toString(), Colors.pink, Colors.black)
      );

      column.addChild(new Border().setColor(Colors.white));
      column.addChild(new Text().setText('Equipment:').setFontSize(16));
      for (const u of this.upgrades) {
        if (u.location !== CaptainUpgradeLocation.Brain) {
          column.addChild(new ImageStatRow(u.locationImage, u.name, u.isWeapon ? Colors.red : Colors.blue));
        }
      }

      column.addChild(new Border().setColor(Colors.white));
      column.addChild(new Text().setText('Upkeep:').setFontSize(16));
      for (let i = 0; i < this.crewUpkeep.length; i++) {
        if (this.isUpkeepRequired(i)) {
          const r = this.crewUpkeep[i].resource;
          column.addChild(
            new ImageStatRow(Resource.getImage(r), Resource.getName(r), Resource.getColor(r), Resource.getBgColor(r))
          );
        }
      }

      const ui = new UIElement();
      ui.anchorY = 1.0;
      ui.position = new Vector(10, 0, 0);
      ui.presentationStyle = UIPresentationStyle.ViewAligned;
      ui.scale = 0.5;
      ui.widget = container;
      if (this.card.getUIs().length) {
        this.card.setUI(0, ui);
      } else {
        this.card.addUI(ui);
      }
    } else {
      for (const i in this.card.getUIs()) {
        this.card.removeUI(+i);
      }
    }
  }
}
