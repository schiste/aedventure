import type {
  CatalogSnapshot,
  SimulationSnapshot,
  StationSpecializationPath,
  WorkerEvent,
  WorkerRequest,
} from './protocol'
import { mergeSnapshotDelta } from './snapshot-delta'

export interface SimulationClientOptions {
  onSnapshot(snapshot: SimulationSnapshot): void
  onReady(snapshot: SimulationSnapshot, catalog: CatalogSnapshot): void
  onSave(payload: string): void
  onError(message: string): void
  worker?: Worker
  createWorker?: () => Worker
}

export class SimulationClient {
  private readonly options: SimulationClientOptions
  private readonly worker: Worker
  // Canonical snapshot, reconstructed from full snapshots + merged deltas so the
  // delta channel is invisible to consumers (they still get full snapshots).
  private currentSnapshot: SimulationSnapshot | null = null
  // Back-pressure: at most one request is in flight; the rest queue and drain
  // one round-trip at a time, so a slow worker can never be flooded.
  private readonly queue: WorkerRequest[] = []
  private inFlight = false

  constructor(options: SimulationClientOptions) {
    this.options = options
    this.worker = createSimulationWorker(options)
    this.worker.addEventListener('message', this.onMessage as EventListener)
  }

  init() {
    this.post({ type: 'init' })
  }

  tick(seconds: number) {
    this.post({ type: 'tick', seconds })
  }

  chooseStoryOption(beatId: string, optionId: string) {
    this.post({ type: 'chooseStoryOption', beatId, optionId })
  }

  reset() {
    this.post({ type: 'reset' })
  }

  runOfflineCatchup(elapsedSeconds: number) {
    this.post({ type: 'offlineCatchup', elapsedSeconds })
  }

  assignHero(assigned: boolean) {
    this.post({ type: 'assignHero', assigned })
  }

  setHeroRole(roleId: string) {
    this.post({ type: 'setHeroRole', roleId })
  }

  setRoleCrew(roleId: string, crew: number) {
    this.post({ type: 'setRoleCrew', roleId, crew })
  }

  setStationEnabled(stationId: string, enabled: boolean) {
    this.post({ type: 'setStationEnabled', stationId, enabled })
  }

  startWorldAction(actionId: string) {
    this.post({ type: 'startWorldAction', actionId })
  }

  startConstruction(optionId: string) {
    this.post({ type: 'startConstruction', optionId })
  }

  startProcessing(recipeId: string) {
    this.post({ type: 'startProcessing', recipeId })
  }

  startResonanceRecipe(recipeId: string) {
    this.post({ type: 'startResonanceRecipe', recipeId })
  }

  setStationSpecialization(stationId: string, path: StationSpecializationPath) {
    this.post({ type: 'setStationSpecialization', stationId, path })
  }

  startExpedition(targetId: string, assignedCrew: number) {
    this.post({ type: 'startExpedition', targetId, assignedCrew })
  }

  clearExpeditionReports() {
    this.post({ type: 'clearExpeditionReports' })
  }

  recruitFromSurvivorCave() {
    this.post({ type: 'recruitFromSurvivorCave' })
  }

  moveHeroTo(q: number, r: number) {
    this.post({ type: 'moveHeroTo', q, r })
  }

  openDoor(key: string) {
    this.post({ type: 'openDoor', key })
  }

  acquirePerk(perkId: string) {
    this.post({ type: 'acquirePerk', perkId })
  }

  clearLocation(key: string, lootItem: string | undefined, lootQty: number) {
    this.post({ type: 'clearLocation', key, lootItem, lootQty })
  }

  dropItem(key: string, itemId: string, qty: number) {
    this.post({ type: 'dropItem', key, itemId, qty })
  }

  pickUpLocation(key: string) {
    this.post({ type: 'pickUpLocation', key })
  }

  useItem(itemId: string) {
    this.post({ type: 'useItem', itemId })
  }

  spendBassline(amount: number) {
    this.post({ type: 'spendBassline', amount })
  }

  exportSave() {
    this.post({ type: 'exportSave' })
  }

  importSave(payload: string) {
    this.post({ type: 'importSave', payload })
  }

  dispose() {
    this.worker.removeEventListener('message', this.onMessage as EventListener)
    this.worker.terminate()
  }

  private onMessage = (event: MessageEvent<WorkerEvent>) => {
    const message = event.data

    switch (message.type) {
      case 'ready':
        this.currentSnapshot = message.snapshot
        this.options.onReady(message.snapshot, message.catalog)
        break
      case 'snapshot':
        this.currentSnapshot = message.snapshot
        this.options.onSnapshot(message.snapshot)
        break
      case 'snapshotDelta': {
        // Reconstruct the full snapshot from the held baseline + changed
        // sections, then surface it like any full snapshot.
        const base = this.currentSnapshot
        if (!base) {
          this.options.onError('Received a snapshot delta before any full snapshot.')
          break
        }
        const merged = mergeSnapshotDelta(base, message.changed)
        this.currentSnapshot = merged
        this.options.onSnapshot(merged)
        break
      }
      case 'save':
        this.options.onSave(message.payload)
        break
      case 'error':
        this.options.onError(message.message)
        break
    }

    // Every worker event completes the in-flight request; drain the next.
    this.inFlight = false
    this.pump()
  }

  // Enqueue a request, coalescing a tick onto a tick already waiting at the tail
  // (so a backlog collapses into one larger catch-up tick rather than a flood).
  private post(message: WorkerRequest) {
    if (message.type === 'tick') {
      const tail = this.queue[this.queue.length - 1]
      if (tail && tail.type === 'tick') {
        tail.seconds += message.seconds
        return
      }
    }
    this.queue.push(message)
    this.pump()
  }

  private pump() {
    if (this.inFlight) return
    const next = this.queue.shift()
    if (!next) return
    this.inFlight = true
    this.worker.postMessage(next)
  }
}

function createSimulationWorker(options: SimulationClientOptions): Worker {
  if (options.worker) return options.worker
  if (options.createWorker) return options.createWorker()

  throw new Error(
    'SimulationClient requires a Worker instance or createWorker callback from the app layer.',
  )
}
