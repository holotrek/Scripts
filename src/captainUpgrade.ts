import { Upgrade, UpgradeType } from './upgrade';

export enum CaptainUpgradeLocation {
  OneHandWeapon = '1h',
  TwoHandWeapon = '2h',
  TorsoArmor = 'torso',
  HandArmor = 'hand',
  LegArmor = 'leg',
  Brain = 'brain',
}

export class CaptainUpgrade extends Upgrade {
  get isWeapon(): boolean {
    return (
      this.location === CaptainUpgradeLocation.OneHandWeapon || this.location === CaptainUpgradeLocation.TwoHandWeapon
    );
  }

  get locationName(): string {
    switch (this.location) {
      case CaptainUpgradeLocation.OneHandWeapon:
        return 'One-Handed Weapon';
      case CaptainUpgradeLocation.TwoHandWeapon:
        return 'Two-Handed Weapon';
      case CaptainUpgradeLocation.HandArmor:
        return 'Hand Armor';
      case CaptainUpgradeLocation.LegArmor:
        return 'Leg Armor';
      case CaptainUpgradeLocation.TorsoArmor:
        return 'Torso Armor';
      case CaptainUpgradeLocation.Brain:
        return 'Training Stat';
    }
  }

  get locationImage(): string {
    switch (this.location) {
      case CaptainUpgradeLocation.OneHandWeapon:
      case CaptainUpgradeLocation.TwoHandWeapon:
        return 'WeaponLeft.png';
      case CaptainUpgradeLocation.HandArmor:
        return 'ArmorHand.png';
      case CaptainUpgradeLocation.LegArmor:
        return 'ArmorLeg.png';
      case CaptainUpgradeLocation.TorsoArmor:
        return 'ArmorTorso.png';
      case CaptainUpgradeLocation.Brain:
        throw Error('Brain does not have a location image');
    }
  }

  /**
   * Represents the bottom part of the card that can be played in the
   * player area to increase stats
   * @param name The name of the upgrade (bottom part of card)
   * @param location Where the upgrade is attached
   * @param combatValue An increase in Combat Value
   * @param defense An increase in Defense
   * @param precision An increase in Precision
   */
  constructor(
    name: string,
    public location: CaptainUpgradeLocation,
    combatValue: number,
    defense: number,
    public precision: number
  ) {
    super(name, UpgradeType.Captain, combatValue, defense);
  }

  static fromMetadata(metadataJson: string): CaptainUpgrade | undefined {
    const metadata = JSON.parse(metadataJson);
    if (metadata.upgradeType == UpgradeType.Captain) {
      return new CaptainUpgrade(
        metadata.name,
        metadata.location,
        metadata.combatValue ?? 0,
        metadata.defense ?? 0,
        metadata.precision ?? 0
      );
    }
    return undefined;
  }
}
