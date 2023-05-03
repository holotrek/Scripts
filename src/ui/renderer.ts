import { GameObject, UIElement, Widget } from '@tabletop-playground/api';

export class UIRenderer {
  private _uiIdx = -1;

  constructor(public obj: GameObject) {}

  renderUI(widget: Widget, configure: (elem: UIElement) => void) {
    const uis = this.obj.getUIs();
    let ui: UIElement;
    let uiIsNew = false;

    if (this._uiIdx > -1 && !!uis[this._uiIdx]) {
      ui = uis[this._uiIdx];
    } else {
      ui = new UIElement();
      uiIsNew = true;
    }

    ui.widget = widget;
    configure(ui);
    if (uiIsNew) {
      this._uiIdx = this.obj.addUI(ui);
    } else {
      this.obj.setUI(this._uiIdx, ui);
      this.obj.updateUI(ui);
    }
  }
}
