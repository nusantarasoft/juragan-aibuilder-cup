/**
 * Virtual Office — domain types.
 *
 * The UI only depends on these types and on the `AgentDataSource` contract.
 * Today the office is driven by a local simulation (see `mockAgentSource.ts`);
 * later a real AI-agent backend (WebSocket / SSE / GraphQL subscription) can
 * implement `AgentDataSource` and emit the same `OfficeEvent`s.
 */

import type { ModuleId } from "./modules";

export type AgentStatus =
    | "working"
    | "thinking"
    | "idle"
    | "meeting"
    | "paused"
    | "error"
    | "offline";

export type ZoneId = "engineering" | "research" | "operations" | "meeting" | "core" | "lounge";

/** Where the agent's avatar physically is in the office. */
export type AgentLocation = "desk" | "meeting" | "lounge";

export interface Zone {
    id: ZoneId;
    name: string;
    tagline: string;
    color: string;
    /** Centre on the floor plane (x, z) in metres. */
    center: [number, number];
    /** Footprint: width along x, depth along z. */
    size: [number, number];
}

export interface Desk {
    id: string;
    zone: ZoneId;
    /** Desk centre on the floor plane (x, z). */
    position: [number, number];
    /** Rotation around Y. 0 = agent sits on +z side facing -z. */
    rotation: number;
}

/** A place an avatar can stand/hover at. */
export interface Spot {
    key: string;
    position: [number, number];
    yaw: number;
    zone: ZoneId;
}

export interface AgentTask {
    id: string;
    title: string;
    /** 0..1 */
    progress: number;
    startedAt: number;
    /** Module the agent is operating in (ITSM, Command Center, …). */
    moduleId: ModuleId;
    /** Exact admin page the agent is working on. */
    route: string;
    /** Scripted actions; the current one is derived from `progress`. */
    steps: string[];
}

export interface AgentStats {
    tasksCompleted: number;
    /** 0..1 */
    successRate: number;
    avgLatencyMs: number;
    tokensToday: number;
}

export type AgentRosterKind = "live" | "demo";

export interface AgentLiveMetrics {
    waChatsToday: number;
    transactionsToday: number;
    waOnline: boolean;
    lastActivityAt: string | null;
}

export interface Agent {
    id: string;
    name: string;
    role: string;
    model: string;
    color: string;
    zone: ZoneId;
    deskId: string;
    status: AgentStatus;
    location: AgentLocation;
    task?: AgentTask;
    /** Modules this agent is allowed to operate in. First one is its "home" module. */
    modules: ModuleId[];
    skills: string[];
    stats: AgentStats;
    /** Agentic OS record id (live mode only). */
    dbId?: string;
    /** Tasks waiting in the agent's queue (live mode). */
    queued?: number;
    /** Finished tasks waiting for a human to confirm (live mode). */
    review?: number;
    /** Live Kasir (AI Studio) vs simulated demo agents. */
    rosterKind?: AgentRosterKind;
    liveUnavailable?: string | null;
    liveMetrics?: AgentLiveMetrics;
}

export type ActivityLevel = "info" | "success" | "warning" | "error";

export interface ActivityEntry {
    id: string;
    ts: number;
    agentId?: string;
    level: ActivityLevel;
    message: string;
    moduleId?: ModuleId;
    route?: string;
}

export interface ChatMessage {
    id: string;
    from: "user" | "agent" | "system";
    text: string;
    ts: number;
}

/** "live" = agents from the Agentic OS database; "demo" = local simulation. */
export type DataMode = "connecting" | "live" | "demo";

export type OfficeEvent =
    | { type: "agent.patch"; agentId: string; patch: Partial<Omit<Agent, "id">> }
    | { type: "roster"; agents: Agent[] }
    | { type: "mode"; mode: DataMode }
    | { type: "activity"; entry: ActivityEntry }
    | { type: "chat"; agentId: string; message: ChatMessage };

export type AgentCommand =
    | "pause"
    | "resume"
    | "recall"
    | "meeting"
    | "break"
    | "retry"
    | "wake"
    | "shutdown";

export interface DispatchRequest {
    title: string;
    /** Explicit assignee. When omitted, the source picks the best agent. */
    agentId?: string;
}

/**
 * Contract between the Virtual Office UI and whatever drives the agents.
 * Swap the mock implementation for a real backend adapter without touching the UI.
 */
export interface AgentDataSource {
    /** Start streaming events. Returns a disconnect function. */
    connect(emit: (event: OfficeEvent) => void): () => void;
    /** Delegate a task. Resolves with the assigned agent id, or null if nobody is available. */
    dispatchTask(req: DispatchRequest): Promise<string | null>;
    /** Send a chat message to an agent. Replies arrive as `chat` events. */
    sendMessage(agentId: string, text: string): Promise<void>;
    /** Operational command (pause, recall, …). Results arrive as `agent.patch` events. */
    command(agentId: string, cmd: AgentCommand): Promise<void>;
}
