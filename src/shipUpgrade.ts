import { Upgrade, UpgradeType } from './upgrade';

export class ShipUpgrade extends Upgrade {
  /**
   * Represents the bottom part of the card that can be played in the
   * player area to increase stats
   * @param name The name of the upgrade (bottom part of card)
   * @param combatValue An increase in Combat Value
   * @param defense An increase in Defense
   * @param cargo An increase in Cargo space
   */
  constructor(name: string, combatValue: number, defense: number, public cargo: number) {
    super(name, UpgradeType.Ship, combatValue, defense);
  }

  static fromMetadata(metadataJson: string): ShipUpgrade | undefined {
    const metadata = JSON.parse(metadataJson);
    if (metadata.upgradeType == UpgradeType.Ship) {
      return new ShipUpgrade(metadata.name, metadata.combatValue ?? 0, metadata.defense ?? 0, metadata.cargo ?? 0);
    }
    return undefined;
  }
}
