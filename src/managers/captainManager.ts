import { CaptainBehavior } from '../behaviors/captain';
import { Card } from '@tabletop-playground/api';

export class CaptainManager {
  static behaviors: { [guid: string]: CaptainBehavior } = {};

  static registerCard(card: Card): CaptainBehavior {
    const capt = CaptainManager.getCaptain(card.getId());
    if (!!capt) {
      return capt;
    }

    const behavior = new CaptainBehavior(card);
    CaptainManager.behaviors[card.getId()] = behavior;
    return behavior;
  }

  static getCaptain(id: string): CaptainBehavior | undefined {
    return this.behaviors[id];
  }
}
