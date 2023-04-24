export enum ShipSizes {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

export class ShipSpec {
  /**
   * Specs for a ship
   * @param name The name of the ship
   * @param size The ship size
   * @param health The ship health
   * @param combatValue The starting Combat Value
   * @param defense The starting Defense
   * @param cargo The starting Cargo
   */
  constructor(
    public name: string,
    public size: ShipSizes,
    public health: number,
    public combatValue: number,
    public defense: number,
    public cargo: number
  ) {}
}
