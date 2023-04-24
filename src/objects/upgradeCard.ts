import { refCard, world } from '@tabletop-playground/api';
import { SwashZone } from '../swashZone';

refCard.onMovementStopped.add(card => {
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
