export class AbilityStatSpec {
  /**
   * Specs for an ability stat which is part of an ability
   * @param combatValue The change in CV
   * @param precision The change in Precision
   * @param defense The change in Defense
   */
  constructor(public combatValue = 0, public precision = 0, public defense = 0) {}
}
