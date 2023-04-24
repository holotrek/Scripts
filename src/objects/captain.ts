import { CaptainManager } from '../managers/captainManager';
import { refCard } from '@tabletop-playground/api';

CaptainManager.registerCard(refCard);
refCard.onCreated.add(CaptainManager.registerCard);
