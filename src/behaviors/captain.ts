import { AbilityBehavior } from './ability';
import { AbilityManager } from '../managers/abilityManager';
import { Border, Card, GameObject, LayoutBox, Player, SnapPoint, Text, UIPresentationStyle, Vector, VerticalBox, world } from '@tabletop-playground/api';
import { CaptainUpgrade, CaptainUpgradeLocation } from '../captainUpgrade';
import { Colors, Tags } from '../constants';
import { ImageStatRow, ImageTextStatRow } from '../ui/statRow';
import { IUpgradeable } from '../interfaces/upgradeable';
import { Resource, Resources } from '../resources';
import { UIRenderer } from '../ui/renderer';
import { Upgrade } from '../upgrade';

export class CaptainBehavior implements IUpgradeable {
  private _uiRenderer: UIRenderer;
  private _player?: Player;
  private _crewOnDefense: Array<string> = [];

  upgrades: CaptainUpgrade[] = [];
  initialCombatValue = 2;
  initialDefense = 1;
  initialPrecision = 2;
  crew = 5;
  guardDetail = 0;
  upgradeSlotTokens: { [key: string]: GameObject | undefined } = {};
  abilities: { ability?: AbilityBehavior; snapPoint?: SnapPoint; faceUp?: boolean }[] = [{}, {}, {}];
  crewUpkeep: { resource: Resources; snapPoint?: SnapPoint }[] = [
    { resource: Resources.None },
    { resource: Resources.Leather },
    { resource: Resources.Coffee },
    { resource: Resources.Rum },
    { resource: Resources.Spices },
  ];

  get combatValue(): number {
    return (
      this.initialCombatValue +
      this.upgrades.map(x => x?.combatValue ?? 0).reduce((pv, cv) => pv + cv, 0) +
      this.abilities.map(a => a.ability?.combatValueDelta || 0).reduce((pv, cv) => pv + cv, 0)
    );
  }

  get defense(): number {
    return (
      this.initialDefense +
      this.upgrades.map(x => x?.defense ?? 0).reduce((pv, cv) => pv + cv, 0) +
      this._crewOnDefense.length +
      this.abilities.map(a => a.ability?.defenseDelta || 0).reduce((pv, cv) => pv + cv, 0)
    );
  }

  get precision(): number {
    return (
      this.initialPrecision +
      this.upgrades.map(x => x?.precision ?? 0).reduce((pv, cv) => pv + cv, 0) +
      this.abilities.map(a => a.ability?.precisionDelta || 0).reduce((pv, cv) => pv + cv, 0)
    );
  }

  get isSturdy(): boolean {
    return this.abilities.map(a => a.ability?.name).includes('Sturdy');
  }

  get player(): Player | undefined {
    return this._player;
  }
  set player(p: Player | undefined) {
    this._player = p;
    this._recordSnapPoints();
    this._renderStatsUi();
  }

  /**
   * A captain in the Swash game
   * @param card The actual game card that this behavior is related to
   */
  constructor(public card: Card) {
    this._uiRenderer = new UIRenderer(card);
  }

  isUpkeepRequired(idx: number) {
    const cu = this.crewUpkeep[idx];
    return cu.resource !== Resources.None && !cu.snapPoint?.getSnappedObject()?.getTags()?.includes(Tags.Crew);
  }

  getUpgrades(): Array<Upgrade> {
    return this.upgrades;
  }

  addUpgrade(upgrade: CaptainUpgrade): boolean {
    console.log(upgrade.name);
    if (this.upgrades.map(x => x.name).includes(upgrade.name)) {
      return false;
    }

    let slotAvailable = false;
    if (upgrade.location === CaptainUpgradeLocation.Brain) {
      slotAvailable = true;
    } else if (upgrade.isWeapon) {
      const numWeaponHands = this.upgrades
        .filter(x => x.isWeapon)
        .map(x => (x.location === CaptainUpgradeLocation.TwoHandWeapon ? 2 : 1))
        .reduce((pv, cv) => pv + cv, 0);
      if (this.isSturdy && numWeaponHands <= 2) {
        slotAvailable = true;
      } else {
        slotAvailable =
          upgrade.location === CaptainUpgradeLocation.TwoHandWeapon ? numWeaponHands === 0 : numWeaponHands < 2;
      }
    } else {
      const numExisting = this.upgrades.filter(x => x.location === upgrade.location)?.length;
      slotAvailable = this.isSturdy ? numExisting < 2 : numExisting === 0;
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

  removeAllUpgrades() {
    this.upgrades = [];
    this._renderStatsUi();
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

  triggerAbilitySnapped(player: Player, ability: AbilityBehavior, snapPoint: SnapPoint, disableMessages = false) {
    const slot = this.abilities.find(a => a.snapPoint?.getIndex() === snapPoint.getIndex());
    if (slot) {
      slot.ability = ability;
      slot.faceUp = ability.card.isFaceUp();
      ability.equipped = true;

      ability.card.onMovementStopped.add(card => {
        if (!card.getSnappedToPoint()) {
          this._abilityRemoved(player, ability);
        } else if (card.isFaceUp() !== slot.faceUp) {
          this._abilityFlipped(player, ability);
        }
      });

      if (!disableMessages) {
        player.showMessage(`You acquired ability: ${ability.name}.`);
        world.broadcastChatMessage(`${player.getName()} acquired ability ${ability.name}.`, player.getPlayerColor());
      }

      this._renderStatsUi();
    }
  }

  returnCrew(crewObj: GameObject) {
    for (let i = this.crewUpkeep.length - 1; i >= 0; i--) {
      const u = this.crewUpkeep[i];
      if (u.snapPoint) {
        if (!u.snapPoint.getSnappedObject()) {
          crewObj.setPosition(u.snapPoint.getGlobalPosition());
          break;
        }
      }
    }
  }

  private _abilityRemoved(player: Player, ability: AbilityBehavior) {
    const slot = this.abilities.find(a => a.ability?.name === ability.name);
    if (slot) {
      slot.ability = undefined;
      ability.equipped = false;

      player.showMessage(`You removed ability: ${ability.name}.`);
      world.broadcastChatMessage(`${player.getName()} removed ability ${ability.name}.`, player.getPlayerColor());
      this._renderStatsUi();
    }
  }

  private _abilityFlipped(player: Player, ability: AbilityBehavior) {
    const slot = this.abilities.find(a => a.ability?.name === ability.name);
    if (slot) {
      slot.faceUp = ability.card.isFaceUp();

      const action = slot.faceUp ? 'enabled' : 'disabled';
      player.showMessage(`You ${action} ability: ${ability.name}.`);
      world.broadcastChatMessage(`${player.getName()} ${action} ability ${ability.name}.`, player.getPlayerColor());
      this._renderStatsUi();
    }
  }

  private _recordSnapPoints() {
    for (let i = 0; i < 5; i++) {
      const sp = this.card.getSnapPoint(i);
      this.crewUpkeep[i].snapPoint = sp;
    }

    for (let i = 5; i < 8; i++) {
      const sp = this.card.getSnapPoint(i);
      this.abilities[i - 5].snapPoint = sp;
      const snapped = sp?.getSnappedObject();
      if (sp && snapped && this.player) {
        const ability = AbilityManager.registerCard(snapped as Card);
        if (ability) {
          this.triggerAbilitySnapped(this.player, ability, sp, true);
        }
      }
    }

    this._renderStatsUi();
  }

  private _renderStatsUi() {
    const container = new LayoutBox();
    container.setVisible(!!this.player);

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

    this._uiRenderer.renderUI(container, ui => {
      ui.anchorY = 1.0;
      ui.position = new Vector(10, 0, 0);
      ui.presentationStyle = UIPresentationStyle.ViewAligned;
      ui.scale = 0.5;
    });
  }
}
