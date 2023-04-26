import { Border, Color, HorizontalAlignment, HorizontalBox, ImageWidget, LayoutBox, Text, VerticalAlignment, Widget } from '@tabletop-playground/api';
import { Colors, SWASH_PACKAGE_ID } from '../constants';

export abstract class StatRow extends Border {
  constructor(label: Widget, value: string, bgColor: Color, color: Color) {
    super();
    this.setColor(bgColor);
    const labelBox = new LayoutBox()
      .setChild(label)
      .setHorizontalAlignment(HorizontalAlignment.Left)
      .setVerticalAlignment(VerticalAlignment.Center);
    const valueBox = new LayoutBox()
      .setChild(new Text().setText(value).setTextColor(color).setFontSize(20).setBold(true))
      .setHorizontalAlignment(HorizontalAlignment.Right)
      .setVerticalAlignment(VerticalAlignment.Center);
    const row = new HorizontalBox().addChild(labelBox, 1).addChild(valueBox);
    this.setChild(row);
  }
}

export class TextStatRow extends StatRow {
  constructor(label: string, value: string, bgColor: Color, color: Color = Colors.white) {
    super(new Text().setText(label).setTextColor(color).setFontSize(16), value, bgColor, color);
  }
}

export class ImageStatRow extends StatRow {
  constructor(textureName: string, value: string, bgColor: Color, color: Color = Colors.white) {
    super(new ImageWidget().setImage(textureName, SWASH_PACKAGE_ID).setImageSize(0, 48), value, bgColor, color);
  }
}

export class ImageTextStatRow extends StatRow {
  constructor(label: string, textureName: string, value: string, bgColor: Color, color: Color = Colors.white) {
    const img = new ImageWidget().setImage(textureName, SWASH_PACKAGE_ID).setImageSize(0, 48);
    const txt = new Text().setText(label).setTextColor(color).setFontSize(16);
    const box = new HorizontalBox()
      .setHorizontalAlignment(HorizontalAlignment.Left)
      .setVerticalAlignment(VerticalAlignment.Center)
      .addChild(img)
      .addChild(txt);
    super(box, value, bgColor, color);
  }
}
