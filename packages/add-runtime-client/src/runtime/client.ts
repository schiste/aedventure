import type {
  AddGameEvent,
  CatalogSnapshot,
  SimulationSnapshot,
  StationSpecializationPath,
  WorkerEvent,
  WorkerRequest,
} from '@aedventure/add-protocol'
import { mergeSnapshotDelta } from './snapshot-delta'

/** A single observation at the worker boundary: a command going out, or an event coming back. */
export interface TraceEntry {
  /** 'command' = request sent to the worker; 'event' = result received from it. */
  readonly dir: 'command' | 'event'
  /** High-resolution timestamp (ms) when this crossed the boundary. */
  readonly at: number
  /** Protocol message type — 'tick', 'engage', 'snapshot', 'error', … */
  readonly kind: string
  /** Round-trip ms (send→receive) for events; undefined for commands. */
  readonly latencyMs?: number
  /** For events, the type of the command this completed (if one was in flight). */
  readonly request?: string
  /** Requests still waiting behind this one — worker back-pressure / throughput signal. */
  readonly queueDepth?: number
  /** Monotonic id linking a command to the event(s) and state changes it produced. */
  readonly seq?: number
  /** Worker-reported handling time (ms), and its snapshot-build / diff components. */
  readonly workerMs?: number
  /** Time spent inside the Rust/WASM runtime call, excluding snapshot/diff work. */
  readonly runtimeMs?: number
  readonly snapshotMs?: number
  readonly diffMs?: number
  /** Transport split (ms): send→worker-receive, and worker-post→client-receive. */
  readonly toWorkerMs?: number
  readonly fromWorkerMs?: number
  /** The full protocol payload (request or event). */
  readonly payload: WorkerRequest | WorkerEvent
}

const monotonicNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now()

/** Absolute wall-clock ms, comparable to the worker's clock on the same machine. */
const absNow = (): number =>
  typeof performance !== 'undefined' ? performance.timeOrigin + performance.now() : Date.now()

const clampPos = (n: number): number => (n > 0 ? Math.round(n * 10) / 10 : 0)

/** The per-frame game events carried by a worker message (empty for non-snapshot messages). */
function frameEventsOf(message: WorkerEvent): AddGameEvent[] {
  if (message.type === 'ready' || message.type === 'snapshot') return message.snapshot.events
  if (message.type === 'snapshotDelta') return message.changed.events ?? []
  return []
}

export interface SimulationClientOptions {
  onSnapshot(snapshot: SimulationSnapshot): void
  onReady(snapshot: SimulationSnapshot, catalog: CatalogSnapshot): void
  onSave(payload: string): void
  onError(message: string): void
  /** Per-frame structured game events (combat, level-ups, discoveries, …) as they occur. */
  onEvents?(events: AddGameEvent[]): void
  /** Dev-only: receives a structured entry for every command sent and event received. */
  onTrace?(entry: TraceEntry): void
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
  // Timing for the request currently awaiting a reply, so events can report
  // round-trip latency and name the command they completed.
  private inFlightSince = 0
  private inFlightSentAbs = 0
  private inFlightRequest: WorkerRequest | null = null
  // Monotonic command id; the in-flight value is echoed onto the completing event
  // so a command can be linked to the events and state changes it produced.
  private seq = 0
  private inFlightSeq = 0

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

  completePreArrivalRoute() {
    this.post({ type: 'completePreArrivalRoute' })
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

  engage(creatureId: string, key: string, lootItem: string | undefined, lootQty: number) {
    this.post({ type: 'engage', creatureId, key, lootItem, lootQty })
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

  setBalanceOverride(path: string, value: number) {
    this.post({ type: 'setBalanceOverride', path, value })
  }

  resetBalanceOverrides() {
    this.post({ type: 'resetBalanceOverrides' })
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

    if (this.options.onTrace) {
      // Split transport using absolute timestamps the worker stamped on the same
      // machine clock: send→receive (inbound queue) and post→handle (main thread busy).
      const recvAbs = absNow()
      const hasWorkerStamps =
        message.workerRecvAt !== undefined && message.workerPostAt !== undefined
      this.options.onTrace({
        dir: 'event',
        at: monotonicNow(),
        kind: message.type,
        latencyMs: this.inFlightSince ? monotonicNow() - this.inFlightSince : undefined,
        request: this.inFlightRequest?.type,
        queueDepth: this.queue.length,
        seq: this.inFlightSeq,
        workerMs: message.workerMs,
        runtimeMs: message.runtimeMs,
        snapshotMs: message.snapshotMs,
        diffMs: message.diffMs,
        toWorkerMs: hasWorkerStamps ? clampPos(message.workerRecvAt! - this.inFlightSentAbs) : undefined,
        fromWorkerMs: hasWorkerStamps ? clampPos(recvAbs - message.workerPostAt!) : undefined,
        payload: message,
      })
    }

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

    // Surface this frame's game events after app state is current, so consumers
    // (music, telemetry) read a snapshot that already reflects them.
    if (this.options.onEvents) {
      const events = frameEventsOf(message)
      if (events.length) this.options.onEvents(events)
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
    this.inFlightRequest = next
    this.inFlightSince = monotonicNow()
    this.inFlightSentAbs = absNow()
    this.inFlightSeq = ++this.seq
    if (this.options.onTrace) {
      this.options.onTrace({
        dir: 'command',
        at: this.inFlightSince,
        kind: next.type,
        queueDepth: this.queue.length,
        seq: this.inFlightSeq,
        payload: next,
      })
    }
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
