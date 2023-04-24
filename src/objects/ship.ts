import { refCard } from '@tabletop-playground/api';
import { ShipManager } from '../managers/shipManager';

ShipManager.registerCard(refCard);
refCard.onCreated.add(ShipManager.registerCard);
