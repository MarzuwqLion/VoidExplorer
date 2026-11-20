/** Minimal typed event emitter. */
export class Emitter<T extends Record<string, unknown>> {
  private map = new Map<keyof T, Set<(p: any) => void>>();
  on<K extends keyof T>(k: K, fn: (p: T[K]) => void): () => void {
    let s = this.map.get(k);
    if (!s) this.map.set(k, (s = new Set()));
    s.add(fn);
    return () => s!.delete(fn);
  }
  emit<K extends keyof T>(k: K, p: T[K]): void {
    const s = this.map.get(k);
    if (s) for (const fn of [...s]) fn(p);
  }
  clear(): void {
    this.map.clear();
  }
}
