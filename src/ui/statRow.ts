import { Border, Color, HorizontalAlignment, HorizontalBox, ImageWidget, LayoutBox, Text, Widget } from '@tabletop-playground/api';
import { Colors, SWASH_PACKAGE_ID } from '../constants';

export abstract class StatRow extends Border {
  constructor(label: Widget, value: string, bgColor: Color, color: Color) {
    super();
    this.setColor(bgColor);
    const labelBox = new LayoutBox().setChild(label).setHorizontalAlignment(HorizontalAlignment.Left);
    const valueBox = new LayoutBox()
      .setChild(new Text().setText(value).setTextColor(color))
      .setHorizontalAlignment(HorizontalAlignment.Right);
    const row = new HorizontalBox().addChild(labelBox, 1).addChild(valueBox);
    this.setChild(row);
  }
}

export class TextStatRow extends StatRow {
  constructor(label: string, value: string, bgColor: Color, color: Color = Colors.white) {
    super(new Text().setText(label).setTextColor(color), value, bgColor, color);
  }
}

export class ImageStatRow extends StatRow {
  constructor(textureName: string, value: string, bgColor: Color, color: Color = Colors.white) {
    super(new ImageWidget().setImage(textureName, SWASH_PACKAGE_ID).setImageSize(0, 16), value, bgColor, color);
  }
}
