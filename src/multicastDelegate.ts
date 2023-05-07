/** Represent one or more callback functions. Use the assignment operator = to set a single function to call, or the add() method to add multiple functions. */
export class MulticastDelegate<T extends Function> {
  delegates: Array<T> = [];

  /** Add a function to call. When called multiple times, all added function will be called. */
  add(fn: T): void {
    if (!this.delegates.includes(fn)) {
      this.delegates.push(fn);
    }
  }

  /** Remove the given function from the callback. Doesn't do anything if the function is not set as callback. */
  remove(fn: T): void {
    this.delegates = this.delegates.filter(x => x !== fn);
  }

  /** Clear the callback so no function will get called. */
  clear(): void {
    this.delegates = [];
  }

  trigger(...args: Array<any>) {
    for (const fn of this.delegates) {
      fn(...args);
    }
  }
}
