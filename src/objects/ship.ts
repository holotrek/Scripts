import { Card, refCard } from '@tabletop-playground/api';
import { ShipManager } from '../managers/shipManager';

const registerShip = (card: Card) => {
  if (card.getStackSize() === 1) {
    ShipManager.registerCard(card);
  }
};

registerShip(refCard);
refCard.onCreated.add(registerShip);
refCard.onMovementStopped.add(registerShip);
refCard.onSnapped.add(registerShip);
