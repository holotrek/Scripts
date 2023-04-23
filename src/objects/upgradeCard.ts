import { refCard, world } from '@tabletop-playground/api';
import { SwashZone } from '../swashZone';
import { Tags } from '../constants';
import { UpgradeManager } from '../managers/upgradeManager';

refCard.onMovementStopped.add(card => {
  const cardDetails = card.getCardDetails();
  if (!cardDetails.tags.includes(Tags.SwashCard)) {
    return;
  }
  const upgrade = UpgradeManager.getUpgradeByCard(cardDetails);

  for (const z of world.getAllZones()) {
    if (z.getOverlappingObjects().includes(card)) {
      const zone = SwashZone.findZone(z);
      if (zone) {
        if (card.isFaceUp()) {
          zone.registerCard(card);
        } else {
          zone.unRegisterCard(card);
        }
      }
    }
  }
});
