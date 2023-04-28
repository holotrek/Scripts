import { AbilityManager } from '../managers/abilityManager';
import { CaptainManager } from '../managers/captainManager';
import { Card, refCard } from '@tabletop-playground/api';
import { PlayerManager } from '../managers/playerManager';

AbilityManager.registerCard(refCard);
refCard.onCreated.add(AbilityManager.registerCard);

const identifyAbilityPosition = (card: Card, disableMessages = false) => {
  const ability = AbilityManager.getAbility(card.getId());
  if (ability) {
    const snapPoint = card.getSnappedToPoint();
    if (snapPoint) {
      const capt = CaptainManager.getCaptain(snapPoint.getParentObject().getId());
      if (capt) {
        const player = PlayerManager.getPlayerFromCaptain(capt);
        if (player && player.player) {
          capt.triggerAbilitySnapped(player.player, ability, snapPoint, disableMessages);
        }
      }
    }
  }
};

refCard.onSnapped.add(card => identifyAbilityPosition(card));
