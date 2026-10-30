// ============================================================================
// ECHOES OF CHAOS — Per-Room Event Serialization (Mutex)
// ============================================================================
// Amendment #8: Ensures operations on a room state are executed sequentially,
// preventing race conditions on proposals, confirmations, votes, and transitions.
// ============================================================================

export class RoomMutex {
  private queues = new Map<string, Promise<void>>();

  /**
   * Run an asynchronous task exclusively for the specified room
   */
  public async runExclusive<T>(roomCode: string, task: () => Promise<T> | T): Promise<T> {
    const prevPromise = this.queues.get(roomCode) || Promise.resolve();

    let taskResolve: (val: T) => void;
    let taskReject: (err: any) => void;
    const resultPromise = new Promise<T>((res, rej) => {
      taskResolve = res;
      taskReject = rej;
    });

    const nextPromise = prevPromise
      .catch(() => {}) // Ignore errors from previous task in chain
      .then(async () => {
        try {
          const res = await task();
          taskResolve(res);
        } catch (err) {
          taskReject(err);
        }
      });

    this.queues.set(roomCode, nextPromise);

    // Clean up map once queue empties
    nextPromise.finally(() => {
      if (this.queues.get(roomCode) === nextPromise) {
        this.queues.delete(roomCode);
      }
    });

    return resultPromise;
  }
}

export const roomMutex = new RoomMutex();
