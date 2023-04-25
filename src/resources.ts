import { CardDetails, Color, GameObject } from '@tabletop-playground/api';
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

  static fromName(name: string): Resources {
    return Resources[name as keyof typeof Resources];
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
    switch (resource) {
      case Resources.Sugar:
      case Resources.Gold:
      case Resources.Lumber:
        return Colors.black;
      default:
        return Colors.white;
    }
  }

  static getFromGameObject(obj: GameObject): Resources {
    return Resource.fromName(obj.getTemplateName());
  }

  static getFromCardDetail(card: CardDetails): Resources {
    return Resource.fromName(card.name);
  }
}

export class ResourceConverter {
  private _output = Resources.Lumber;
  private _input = Resources.Lumber;
  private _numTransactions = 1;
  private _calcChangedEvent = () => {};

  get output(): Resources {
    return this._output;
  }
  set output(r: Resources) {
    if (this._output !== r) {
      this._output = r;
      this._calcChangedEvent();
    }
  }

  get input(): Resources {
    return this._input;
  }
  set input(r: Resources) {
    if (this._input !== r) {
      this._input = r;
      this._calcChangedEvent();
    }
  }

  get numTransactions(): number {
    return this._numTransactions;
  }
  set numTransactions(t: number) {
    if (this._numTransactions !== t) {
      this._numTransactions = Math.max(t, 1);
      this._calcChangedEvent();
    }
  }

  get conversionRate() {
    if (this.output === Resources.None || this.input === Resources.None) {
      return 0;
    }
    return Resource.getValue(this.output) / Resource.getValue(this.input);
  }

  get outputAmount() {
    if (this.conversionRate > 0) {
      return this.numTransactions * (this.conversionRate < 1 ? 1 / this.conversionRate : 1);
    } else {
      return 0;
    }
  }
  get inputAmount() {
    if (this.conversionRate > 0) {
      return this.numTransactions * (this.conversionRate < 1 ? 1 : this.conversionRate);
    } else {
      return 0;
    }
  }

  get outputName() {
    return Resource.getName(this.output);
  }
  get inputName() {
    return Resource.getName(this.input);
  }

  get isValid() {
    return (
      this.numTransactions > 0 &&
      this.outputAmount === Math.floor(this.outputAmount) &&
      this.inputAmount === Math.floor(this.inputAmount) &&
      this.output != Resources.None &&
      this.input !== Resources.None
    );
  }

  onCalculationChanged(event: () => void) {
    this._calcChangedEvent = event;
  }

  reset() {
    this.input = Resources.None;
    this.output = Resources.None;
    this.numTransactions = 1;
  }
}
