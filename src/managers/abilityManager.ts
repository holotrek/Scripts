import { AbilityBehavior } from '../behaviors/ability';
import { AbilitySpec, CaptainSocket } from '../specs/ability';
import { AbilityStatSpec } from '../specs/abilityStat';
import { Card } from '@tabletop-playground/api';

const abilities = [
  new AbilitySpec('Surveilant', CaptainSocket.Eye, undefined, new AbilityStatSpec(0, -1)),
  new AbilitySpec('Charismatic', CaptainSocket.Eye),
  new AbilitySpec('Sureshot', CaptainSocket.Eye, undefined, new AbilityStatSpec(0, -1)),
  new AbilitySpec('Strategist', CaptainSocket.Eye, undefined, new AbilityStatSpec(0, -1)),
  new AbilitySpec('Efficient', CaptainSocket.Eye, undefined, new AbilityStatSpec(0, -1)),
  new AbilitySpec('Thief', CaptainSocket.Eye, undefined, new AbilityStatSpec(0, -1)),
  new AbilitySpec('Deadshot', CaptainSocket.Hand),
  new AbilitySpec('Fortifier', CaptainSocket.Hand),
  new AbilitySpec('Dextrous', CaptainSocket.Hand, new AbilityStatSpec(1)),
  new AbilitySpec('Innovative', CaptainSocket.Hand),
  new AbilitySpec('Infighting', CaptainSocket.Hand),
  new AbilitySpec('Improvisational', CaptainSocket.Hand),
  new AbilitySpec('Lithe', CaptainSocket.Leg, undefined, new AbilityStatSpec(-1)),
  new AbilitySpec('Savvy', CaptainSocket.Leg, undefined, new AbilityStatSpec(-1)),
  new AbilitySpec('Switchblade', CaptainSocket.Leg, new AbilityStatSpec(2)),
  new AbilitySpec('Sturdy', CaptainSocket.Leg, undefined, new AbilityStatSpec(-1)),
  new AbilitySpec('Adaptable', CaptainSocket.Leg, undefined, new AbilityStatSpec(-1)),
  new AbilitySpec('Steadfast', CaptainSocket.Leg, new AbilityStatSpec(0, 0, 1), new AbilityStatSpec(-1)),
];

export class AbilityManager {
  static behaviors: { [guid: string]: AbilityBehavior } = {};

  static registerCard(card: Card): AbilityBehavior | undefined {
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
