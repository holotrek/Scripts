import { Color, refPackageId } from '@tabletop-playground/api';

export const PLAYER_SLOTS = ['Whales', 'Sharks', 'Starfish', 'Turtles', 'Lobsters', 'Parrots'];

export enum Tags {
  SwashShip = 'SwashShip',
  SwashCard = 'SwashCard',
  UpgradeSlot = 'Upgrade Slot',
  PlayerInfo = 'Player Info',
  CaptainSheet = 'Captain Sheet',
  TokenChest = 'Token Chest',
  Crew = 'Crew',
  Resource = 'Resource',
  DamageCube = 'Damage Cube',
}

export class Colors {
  static black = new Color(0, 0, 0, 1);
  static white = new Color(1, 1, 1);
  static red = new Color(0.6, 0.1, 0.11);
  static pink = new Color(0.996, 0.514, 0.514);
  static blue = new Color(0.157, 0.157, 0.45);
  static gold = new Color(0.788, 0.6, 0.173);
  static green = new Color(0.157, 0.45, 0.157);

  static lumber = new Color(0.05, 0.5, 0.25);
  static leather = new Color(0.29, 0.2, 0.07);
  static iron = new Color(0.11, 0.15, 0.22);
  static rum = new Color(0.7, 0.34, 0.15);
  static spices = new Color(0.6, 0.11, 0.13);
}

export const GM_INDEX = 19;

export const SWASH_PACKAGE_ID = refPackageId;
