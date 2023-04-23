export enum UpgradeType {
  Captain = 'captain',
  Ship = 'ship',
}

export abstract class Upgrade {
  /**
   * Represents the bottom part of the card that can be played in the
   * player area to increase stats
   * @param name The name of the upgrade (bottom part of card)
   * @param upgradeType Whether this upgrade may be played on a Captain or Ship
   * @param combatValue An increase in Combat Value
   * @param defense An increase in Defense
   */
  constructor(
    public name: string,
    public upgradeType: UpgradeType,
    public combatValue: number,
    public defense: number
  ) {}
}
