import { refContainer } from '@tabletop-playground/api';

refContainer.onInserted.add((container, objects) => {
  if (container.getItems().length > 1) {
    for (const obj of objects) {
      container.remove(obj);
    }
  }
});
