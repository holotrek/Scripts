import { AbilityStatSpec } from './abilityStat';

export enum CaptainSocket {
  Eye,
  Hand,
  Leg,
}

export class AbilitySpec {
  /**
   * Specs for an ability
   * @param name The name of the ability
   * @param socket The body part on the Captain that the ability is attached to
   * @param faceUpStat The ability stat when the card is face-up
   * @param faceDownStat The ability stat when the card is face-down
   */
  constructor(
    public name: string,
    public socket: CaptainSocket,
    public faceUpStat?: AbilityStatSpec,
    public faceDownStat?: AbilityStatSpec
  ) {}
}
