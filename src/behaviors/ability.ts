import { AbilitySpec, CaptainSocket } from '../specs/ability';
import { AbilityStatSpec } from '../specs/abilityStat';
import { Border, Button, Card, LayoutBox, Rotator, UIElement, UIPresentationStyle, UIZoomVisibility, Vector } from '@tabletop-playground/api';
import { Colors } from '../constants';
import { UIRenderer } from '../ui/renderer';

export class AbilityBehavior {
  private _uiRenderer: UIRenderer;
  private _equipped = false;
  private _exhausted = false;

  name?: string;
  socket?: CaptainSocket;
  canExhaust = false;
  faceUpStat?: AbilityStatSpec;
  faceDownStat?: AbilityStatSpec;

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
    this.canExhaust = abilitySpec.canExhaust;
    this.faceUpStat = abilitySpec.faceUpStat;
    this.faceDownStat = abilitySpec.faceDownStat;
    this._uiRenderer = new UIRenderer(card);
  }

  private _renderStatsUi() {
    const container = new LayoutBox();
    container.setVisible(this.equipped && this.canExhaust);

    if (this.canExhaust) {
      const color = this.exhausted ? Colors.red : Colors.green;
      const backdrop = new Border().setColor(color);
      container.setChild(backdrop);

      const button = new Button().setText(this.exhausted ? 'Unexhaust' : 'Exhaust').setTextColor(color);
      button.onClicked.add(() => (this.exhausted = !this.exhausted));
      backdrop.setChild(button);
    }

    this._uiRenderer.renderUI(container, ui => {
      ui.anchorY = 1.0;
      ui.position = new Vector(2, 0, -0.1);
      ui.rotation = new Rotator(180, 180, 0);
      ui.scale = 0.35;
    });
  }
}
