import { AbilitySpec, CaptainSocket } from '../specs/ability';
import { AbilityStatSpec } from '../specs/abilityStat';
import { Border, Button, Card, LayoutBox, Rotator, UIElement, UIPresentationStyle, UIZoomVisibility, Vector } from '@tabletop-playground/api';
import { Colors } from '../constants';

export class AbilityBehavior {
  private _equipped = false;
  private _exhausted = false;

  name?: string;
  socket?: CaptainSocket;
  faceUpStat?: AbilityStatSpec;
  faceDownStat?: AbilityStatSpec;
  ui?: UIElement;

  get combatValueDelta() {
    return this.card.isFaceUp() ? this.faceUpStat?.combatValue || 0 : this.faceDownStat?.combatValue || 0;
  }

  get precisionDelta() {
    return this.card.isFaceUp() ? this.faceUpStat?.precision || 0 : this.faceDownStat?.precision || 0;
  }

  get defenseDelta() {
    return this.card.isFaceUp() ? this.faceUpStat?.defense || 0 : this.faceDownStat?.defense || 0;
  }

  get equipped() {
    return this._equipped;
  }
  set equipped(equipped: boolean) {
    this._equipped = equipped;
    this._renderStatsUi();
  }

  get exhausted() {
    return this._exhausted;
  }
  set exhausted(exhausted: boolean) {
    this._exhausted = exhausted;
    this._renderStatsUi();
  }

  /**
   * Specs for an ability
   * @param card The actual game card that this behavior is related to
   * @param abilitySpec The specs for this ability
   */
  constructor(public card: Card, abilitySpec: AbilitySpec) {
    this.name = abilitySpec.name;
    this.socket = abilitySpec.socket;
    this.faceUpStat = abilitySpec.faceUpStat;
    this.faceDownStat = abilitySpec.faceDownStat;
    card.onMovementStopped.add(() => this._repositionUI());
  }

  private _repositionUI() {
    if (this.ui) {
      this.ui.anchorY = 1.0;
      this.ui.twoSided = true;
      this.ui.position = new Vector(2, 0, this.card.isFaceUp() ? -1 : 1);
      this.ui.rotation = new Rotator(0, 0, 180);
      this.ui.scale = 0.3;
      this.card.updateUI(this.ui);
    }
  }

  private _renderStatsUi() {
    if (this.equipped) {
      const container = new LayoutBox();

      const backdrop = new Border().setColor(Colors.black);
      container.setChild(backdrop);

      const button = new Button().setText(this.exhausted ? 'Unexhaust' : 'Exhaust');
      button.onClicked.add(() => (this.exhausted = !this.exhausted));
      backdrop.setChild(button);

      this.ui = new UIElement();
      this._repositionUI();
      this.ui.widget = container;
      if (this.card.getUIs().length) {
        this.card.setUI(0, this.ui);
      } else {
        this.card.addUI(this.ui);
      }
    } else {
      this.card.removeUI(0);
    }
  }
}
