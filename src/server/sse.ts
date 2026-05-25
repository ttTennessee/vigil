import type { SSEStreamingApi } from 'hono/streaming';

export class SSEBroadcaster {
  private streams = new Set<SSEStreamingApi>();

  add(stream: SSEStreamingApi): void {
    this.streams.add(stream);
  }

  remove(stream: SSEStreamingApi): void {
    this.streams.delete(stream);
  }

  size(): number {
    return this.streams.size;
  }

  broadcast(): void {
    for (const stream of [...this.streams]) {
      if (stream.closed || stream.aborted) {
        this.streams.delete(stream);
        continue;
      }
      void stream.writeSSE({ event: 'invalidate', data: '{}' }).catch(() => {
        this.streams.delete(stream);
      });
    }
  }
}
