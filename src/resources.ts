import { Color, GameObject } from '@tabletop-playground/api';
import { Colors } from './constants';

export enum Resources {
  None,
  Lumber,
  Leather,
  Iron,
  Coffee,
  Rum,
  Sugar,
  Spices,
  Gold,
}

export class Resource {
  static getValue(resource: Resources): number {
    switch (resource) {
      case Resources.None:
        return 0;
      case Resources.Lumber:
      case Resources.Leather:
      case Resources.Iron:
        return 1;
      case Resources.Coffee:
      case Resources.Rum:
        return 2;
      case Resources.Sugar:
      case Resources.Spices:
        return 3;
      case Resources.Gold:
        return 4;
    }
  }

  static getName(resource: Resources): string {
    return Resources[resource];
  }

  static getImage(resource: Resources): string {
    return `${this.getName(resource)}.png`;
  }

  static getColor(resource: Resources): Color {
    switch (resource) {
      case Resources.None:
        return Colors.white;
      case Resources.Lumber:
        return Colors.lumber;
      case Resources.Leather:
        return Colors.leather;
      case Resources.Iron:
        return Colors.iron;
      case Resources.Coffee:
        return Colors.black;
      case Resources.Rum:
        return Colors.rum;
      case Resources.Sugar:
        return Colors.white;
      case Resources.Spices:
        return Colors.spices;
      case Resources.Gold:
        return Colors.gold;
    }
  }

  static getBgColor(resource: Resources): Color {
    if (resource === Resources.Sugar) {
      return Colors.black;
    } else {
      return Colors.white;
    }
  }

  static getFromGameObject(obj: GameObject): Resources {
    return Resources[obj.getTemplateName() as keyof typeof Resources];
  }
}
