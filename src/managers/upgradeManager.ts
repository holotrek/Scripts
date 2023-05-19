import { CaptainUpgrade, CaptainUpgradeLocation } from '../captainUpgrade';
import { CardDetails } from '@tabletop-playground/api';
import { IUpgradeMetadata, Upgrade } from '../upgrade';
import { ShipUpgrade } from '../shipUpgrade';

const upgrades = [
  new ShipUpgrade('Hold', 0, 0, 1),
  new ShipUpgrade('Boarding Hook', 0, 0, 0),
  new ShipUpgrade('Broadside Cannons', 2, 0, 0),
  new ShipUpgrade('Swivel Gun', 1, 0, 0),
  new ShipUpgrade('Smoke Bomb', 0, 1, 0),
  new ShipUpgrade('Larder', 0, 0, 2),
  new ShipUpgrade('Mortar', 3, 0, 0),
  new ShipUpgrade('Ironsides', 0, 2, 0),
  new ShipUpgrade('Stockpile', 0, 0, 3),
  new ShipUpgrade('Chainshot', 4, 0, 0),
  new ShipUpgrade('Razor Wire', 0, 3, 0),
  new ShipUpgrade('Carronade', 5, 0, 0),
  new ShipUpgrade('Dragonbreath', 5, 1, 0),
  new ShipUpgrade('Burning Oil', 0, 4, 0),
  new CaptainUpgrade('Strength I', CaptainUpgradeLocation.Brain, 1, 0, 0),
  new CaptainUpgrade('Cutlass', CaptainUpgradeLocation.OneHandWeapon, 2, 0, 0),
  new CaptainUpgrade('Dagger', CaptainUpgradeLocation.OneHandWeapon, 1, 0, 1),
  new CaptainUpgrade('Gauntlets', CaptainUpgradeLocation.HandArmor, 0, 1, 0),
  new CaptainUpgrade('Greaves', CaptainUpgradeLocation.LegArmor, 0, 2, 0),
  new CaptainUpgrade('Constitution', CaptainUpgradeLocation.Brain, 0, 1, 0),
  new CaptainUpgrade('Pistol', CaptainUpgradeLocation.OneHandWeapon, 3, 0, 0),
  new CaptainUpgrade('Crossbow', CaptainUpgradeLocation.TwoHandWeapon, 2, 0, 1),
  new CaptainUpgrade('Spaulders', CaptainUpgradeLocation.TorsoArmor, 0, 3, 0),
  new CaptainUpgrade('Intelligence', CaptainUpgradeLocation.Brain, 0, 0, 1),
  new CaptainUpgrade('Axe Pistol', CaptainUpgradeLocation.OneHandWeapon, 4, 0, 0),
  new CaptainUpgrade('Hidden Blade', CaptainUpgradeLocation.OneHandWeapon, 3, 0, 1),
  new CaptainUpgrade('Cuirass', CaptainUpgradeLocation.TorsoArmor, 0, 4, 0),
  new CaptainUpgrade('Strength II', CaptainUpgradeLocation.Brain, 2, 0, 0),
  new CaptainUpgrade('Blunderbuss', CaptainUpgradeLocation.TwoHandWeapon, 5, 0, 0),
  new CaptainUpgrade('Long Rifle', CaptainUpgradeLocation.TwoHandWeapon, 4, 0, 1),
  new CaptainUpgrade('Shield', CaptainUpgradeLocation.OneHandWeapon, 0, 5, 0),
];

export class UpgradeManager {
  static getUpgrade(card: CardDetails): Upgrade | undefined {
    const meta = JSON.parse(card.metadata) as IUpgradeMetadata;
    return upgrades.find(x => x.name === meta.upgradeName);
  }
}
