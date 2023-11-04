import { AbilityBehavior } from '../behaviors/ability';
import { AbilitySpec, CaptainSocket } from '../specs/ability';
import { AbilityStatSpec } from '../specs/abilityStat';
import { Card } from '@tabletop-playground/api';

const abilities = [
  new AbilitySpec('Surveilant', CaptainSocket.Eye, true, undefined, new AbilityStatSpec(0, -1)),
  new AbilitySpec('Charismatic', CaptainSocket.Eye, false),
  new AbilitySpec('Sureshot', CaptainSocket.Eye, true, undefined, new AbilityStatSpec(0, -1)),
  new AbilitySpec('Strategist', CaptainSocket.Eye, false, undefined, new AbilityStatSpec(0, -1)),
  new AbilitySpec('Efficient', CaptainSocket.Eye, false, undefined, new AbilityStatSpec(0, -1)),
  new AbilitySpec('Thief', CaptainSocket.Eye, true, undefined, new AbilityStatSpec(0, -1)),
  new AbilitySpec('Deadshot', CaptainSocket.Hand, true),
  new AbilitySpec('Fortifier', CaptainSocket.Hand, true),
  new AbilitySpec('Dextrous', CaptainSocket.Hand, false, new AbilityStatSpec(1)),
  new AbilitySpec('Innovative', CaptainSocket.Hand, false),
  new AbilitySpec('Infighting', CaptainSocket.Hand, false),
  new AbilitySpec('Improvisational', CaptainSocket.Hand, false, undefined, new AbilityStatSpec(2)),
  new AbilitySpec('Lithe', CaptainSocket.Leg, true, undefined, new AbilityStatSpec(-1)),
  new AbilitySpec('Savvy', CaptainSocket.Leg, true, undefined, new AbilityStatSpec(-1)),
  new AbilitySpec('Switchblade', CaptainSocket.Leg, false, undefined, new AbilityStatSpec(2)),
  new AbilitySpec('Sturdy', CaptainSocket.Leg, false, undefined, new AbilityStatSpec(-1)),
  new AbilitySpec('Adaptable', CaptainSocket.Leg, true, undefined, new AbilityStatSpec(-1)),
  new AbilitySpec('Steadfast', CaptainSocket.Leg, false, new AbilityStatSpec(0, 0, 1), new AbilityStatSpec(-1)),
];

export class AbilityManager {
  static behaviors: { [guid: string]: AbilityBehavior } = {};

  static registerCard(card: Card): AbilityBehavior | undefined {
    const ability = AbilityManager.getAbility(card.getId());
    if (!!ability) {
      return ability;
    }

    const spec = AbilityManager.getAbilitySpec(card.getCardDetails().name);
    if (spec) {
      const behavior = new AbilityBehavior(card, spec);
      AbilityManager.behaviors[card.getId()] = behavior;
      return behavior;
    }
  }

  static getAbility(id: string): AbilityBehavior | undefined {
    return this.behaviors[id];
  }

  static getAbilitySpec(name: string): AbilitySpec | undefined {
    return abilities.find(x => x.name === name);
  }
}
