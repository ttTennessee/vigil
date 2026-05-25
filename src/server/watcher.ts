import chokidar, { type FSWatcher } from 'chokidar';

const DEBOUNCE_MS = 300;
const CEILING_MS = 2000;

export function createWatcher(
  planningDir: string,
  onInvalidate: () => void,
): () => void {
  const watcher: FSWatcher = chokidar.watch(planningDir, {
    ignoreInitial: true,
    persistent: true,
  });

  let trailing: NodeJS.Timeout | null = null;
  let ceiling: NodeJS.Timeout | null = null;

  const fire = () => {
    if (trailing) { clearTimeout(trailing); trailing = null; }
    if (ceiling) { clearTimeout(ceiling); ceiling = null; }
    onInvalidate();
  };

  const handle = () => {
    if (trailing) clearTimeout(trailing);
    trailing = setTimeout(fire, DEBOUNCE_MS);
    if (!ceiling) ceiling = setTimeout(fire, CEILING_MS);
  };

  watcher
    .on('add', handle)
    .on('change', handle)
    .on('unlink', handle)
    .on('addDir', handle)
    .on('unlinkDir', handle);

  return () => {
    if (trailing) { clearTimeout(trailing); trailing = null; }
    if (ceiling) { clearTimeout(ceiling); ceiling = null; }
    watcher.removeAllListeners();
    void watcher.close();
  };
}
