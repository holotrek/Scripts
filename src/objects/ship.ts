import { refCard } from '@tabletop-playground/api';
import { ShipManager } from '../managers/shipManager';

refCard.onCreated.add(card => {
  const ship = ShipManager.getShip(card.getCardDetails().name);
  ship?.setSheet(card);
});

refCard.onMovementStopped.add(card => {
  const ship = ShipManager.getShip(card.getCardDetails().name);
  ship?.setSheet(card);
});
