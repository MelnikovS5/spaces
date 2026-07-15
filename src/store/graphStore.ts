import { create } from 'zustand';
import { saveBulkData, loadAllData } from '../lib/sync';

export type NodeType = 'space' | 'focus' | 'form' | 'act' | 'precedent' | 'scenario' | 'zone';

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  description: string;
  x: number;
  y: number;
  parentId: string | null;
  status: 'pending' | 'success' | 'failure';
  parentFocusId?: string;
  parentFormId?: string;
  parentActId?: string;
  parentZoneId?: string;
  zoneColor?: string;
  width?: number;
  height?: number;
  layers: string[];
  children: string[];
  createdAt: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

export interface ArchiveEntry {
  id: string;
  actId: string;
  actName: string;
  spaceId: string;
  spaceName: string;
  result: 'success' | 'failure';
  completedAt: number;
  duration: number;
  notes: string;
}

export interface SessionConfig {
  actLayerIndex: number | null;
  formId: string | null;
  formLayerIndex: number | null;
}

export interface GraphState {
  nodes: Record<string, GraphNode>;
  connections: Connection[];
  archives: ArchiveEntry[];
  navStack: string[];
  selectedIds: string[];
  sessionActId: string | null;
  sessionStart: number | null;
  sessionConfigs: Record<string, SessionConfig>;
  nextId: number;
}

export interface GraphStore extends GraphState {
  createNode: (type: NodeType, name: string, x: number, y: number, extra?: Partial<GraphNode>) => GraphNode;
  updateNode: (id: string, patch: Partial<GraphNode>) => void;
  moveNode: (id: string, x: number, y: number) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  toggleSelectNode: (id: string) => void;
  clearSelection: () => void;
  diveIn: (id: string) => void;
  goBack: () => void;
  currentParentId: () => string | null;
  visibleNodes: () => GraphNode[];
  generateId: () => string;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, updates: { fromId?: string; toId?: string }) => void;
  connectionsFor: (nodeId: string) => Connection[];
  startSession: (actId: string) => void;
  beginSession: () => void;
  saveSessionConfig: (actId: string, config: SessionConfig) => void;
  endSession: (result: 'success' | 'failure', notes: string) => void;
  cancelSession: () => void;
  addArchive: (a: Omit<ArchiveEntry, 'id'>) => void;
  deleteArchive: (id: string) => void;
  addLayer: (nodeId: string, layer: string) => void;
  removeLayer: (nodeId: string, index: number) => void;
  completeAct: (actId: string, result: 'success' | 'failure', notes: string) => void;
  createPrecedent: (actId: string) => GraphNode | undefined;
  convertToScenario: (precedentId: string) => void;
  completeScenario: (scenarioId: string) => void;
  importData: (data: { nodes?: Record<string, GraphNode>; connections?: Connection[]; archives?: ArchiveEntry[]; sessionConfigs?: Record<string, SessionConfig> }) => void;
}

const VALID_TYPES: NodeType[] = ['space', 'focus', 'form', 'act', 'precedent', 'scenario', 'zone'];

function genId(n: number) { return `n${n}`; }

const load = (): GraphState => {
  try {
    const raw = localStorage.getItem('spaces-graph');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.nodes) {
        const ids = Object.keys(data.nodes);
        for (const id of ids) {
          if (!VALID_TYPES.includes(data.nodes[id].type)) {
            delete data.nodes[id];
          } else {
            const n = data.nodes[id];
            if (!Array.isArray(n.layers)) {
              n.layers = Array.isArray(n.steps) ? n.steps : [];
              delete n.steps;
            }
          }
        }
      }
      if (data.navStack) {
        data.navStack = data.navStack.filter((id: string) => data.nodes?.[id]);
      }
      return {
        nodes: data.nodes || {},
        connections: data.connections || [],
        archives: data.archives || [],
        navStack: data.navStack || [],
        selectedIds: data.selectedIds || [],
        sessionActId: data.sessionActId ?? null,
        sessionStart: data.sessionStart ?? null,
        sessionConfigs: data.sessionConfigs || {},
        nextId: data.nextId || 1,
      };
    }
  } catch {}
  return {
    nodes: {}, connections: [], archives: [],
    navStack: [], selectedIds: [],
    sessionActId: null, sessionStart: null, sessionConfigs: {}, nextId: 1,
  };
};

const save = (s: GraphState) => {
  localStorage.setItem('spaces-graph', JSON.stringify({
    nodes: s.nodes, connections: s.connections, archives: s.archives,
    navStack: s.navStack, selectedIds: s.selectedIds,
    sessionActId: s.sessionActId, sessionStart: s.sessionStart,
    sessionConfigs: s.sessionConfigs, nextId: s.nextId,
  }));
  saveBulkData({
    nodes: s.nodes, connections: s.connections,
    archives: s.archives, sessionConfigs: s.sessionConfigs,
  }).catch(() => {});
};

let _syncedFromCloud = false;

export async function syncFromCloud(): Promise<boolean> {
  if (_syncedFromCloud) return false;
  try {
    const data = await loadAllData();
    if (Object.keys(data.nodes).length === 0) { _syncedFromCloud = true; return false; }
    const s = useGraph.getState();
    const hasLocal = Object.keys(s.nodes).length > 0;
    if (hasLocal) {
      for (const [id, node] of Object.entries(data.nodes)) {
        if (!s.nodes[id]) s.nodes[id] = node;
      }
      for (const conn of data.connections) {
        if (!s.connections.find(c => c.id === conn.id)) s.connections.push(conn);
      }
      for (const arc of data.archives) {
        if (!s.archives.find(a => a.id === arc.id)) s.archives.push(arc);
      }
      for (const [actId, cfg] of Object.entries(data.sessionConfigs)) {
        if (!s.sessionConfigs[actId]) s.sessionConfigs[actId] = cfg;
      }
    } else {
      set({ nodes: data.nodes, connections: data.connections, archives: data.archives, sessionConfigs: data.sessionConfigs });
    }
    _syncedFromCloud = true;
    return true;
  } catch { return false; }
}

export const useGraph = create<GraphStore>((set, get) => ({
  ...load(),

  generateId: () => {
    const id = get().nextId;
    set(s => ({ nextId: s.nextId + 1 }));
    return genId(id);
  },

  createNode: (type, name, x, y, extra) => {
    const id = get().generateId();
    const parentId = extra?.parentId ?? get().currentParentId();
    const node: GraphNode = {
      id, type, name, description: '', x, y,
      parentId, status: 'pending', layers: [], children: [], createdAt: Date.now(),
      width: type === 'zone' ? 400 : undefined,
      height: type === 'zone' ? 320 : undefined,
      parentFocusId: extra?.parentActId ? undefined : extra?.parentFocusId,
      parentFormId: extra?.parentActId ? undefined : extra?.parentFormId,
      ...extra,
    };
    set(s => {
      const nodes = { ...s.nodes, [id]: node };
      if (parentId && nodes[parentId]) {
        nodes[parentId] = { ...nodes[parentId], children: [...nodes[parentId].children, id] };
      }
      const next = { ...s, nodes, selectedIds: [id] };
      save(next);
      return next;
    });
    return node;
  },

  updateNode: (id, patch) => {
    set(s => {
      if (!s.nodes[id]) return s;
      const nodes = { ...s.nodes, [id]: { ...s.nodes[id], ...patch } };
      const next = { ...s, nodes };
      save(next);
      return next;
    });
  },

  moveNode: (id, x, y) => {
    set(s => {
      if (!s.nodes[id]) return s;
      const nodes = { ...s.nodes, [id]: { ...s.nodes[id], x, y } };
      const next = { ...s, nodes };
      save(next);
      return next;
    });
  },

  deleteNode: (id) => {
    set(s => {
      const nodes = { ...s.nodes };
      const node = nodes[id];
      if (!node) return s;
      const toDelete = new Set<string>([id]);
      const pending = [id];
      while (pending.length > 0) {
        const cid = pending.pop()!;
        Object.values(nodes).forEach(n => {
          if (!toDelete.has(n.id) && (n.parentId === cid || n.parentFocusId === cid || n.parentFormId === cid || n.parentActId === cid)) {
            toDelete.add(n.id);
            pending.push(n.id);
          }
        });
      }
      toDelete.forEach(did => {
        const n = nodes[did];
        if (n && n.parentId && nodes[n.parentId]) {
          const p = nodes[n.parentId];
          p.children = p.children.filter(c => c !== did);
        }
        delete nodes[did];
      });
      const connections = s.connections.filter(c => !toDelete.has(c.fromId) && !toDelete.has(c.toId));
      const next = {
        ...s, nodes, connections,
        selectedIds: s.selectedIds.filter(x => !toDelete.has(x)),
      };
      save(next);
      return next;
    });
  },

  selectNode: (id) => {
    set(s => {
      const next = { ...s, selectedIds: id !== null ? [id] : [] };
      save(next);
      return next;
    });
  },

  toggleSelectNode: (id) => {
    set(s => {
      const selectedIds = s.selectedIds.includes(id)
        ? s.selectedIds.filter(x => x !== id)
        : [...s.selectedIds, id];
      const next = { ...s, selectedIds };
      save(next);
      return next;
    });
  },

  clearSelection: () => {
    set(s => {
      const next = { ...s, selectedIds: [] };
      save(next);
      return next;
    });
  },

  diveIn: (id) => {
    set(s => {
      const next = { ...s, navStack: [...s.navStack, id], selectedIds: [] };
      save(next);
      return next;
    });
  },

  goBack: () => {
    set(s => {
      if (s.navStack.length === 0) return s;
      const navStack = s.navStack.slice(0, -1);
      const next = { ...s, navStack, selectedIds: [] };
      save(next);
      return next;
    });
  },

  currentParentId: () => {
    const { navStack } = get();
    return navStack.length > 0 ? navStack[navStack.length - 1] : null;
  },

  visibleNodes: () => {
    const { nodes, navStack } = get();
    const parentId = navStack.length > 0 ? navStack[navStack.length - 1] : null;
    return Object.values(nodes).filter(n => n.parentId === parentId);
  },

  addConnection: (fromId, toId) => {
    const id = `c${get().nextId}`;
    set(s => ({ nextId: s.nextId + 1 }));
    set(s => {
      const connections = [...s.connections, { id, fromId, toId }];
      const next = { ...s, connections };
      save(next);
      return next;
    });
  },

  removeConnection: (id) => {
    set(s => {
      const connections = s.connections.filter(c => c.id !== id);
      const next = { ...s, connections };
      save(next);
      return next;
    });
  },

  updateConnection: (id, updates) => {
    set(s => {
      const connections = s.connections.map(c => c.id === id ? { ...c, ...updates } : c);
      const next = { ...s, connections };
      save(next);
      return next;
    });
  },

  connectionsFor: (nodeId) => {
    return get().connections.filter(c => c.fromId === nodeId || c.toId === nodeId);
  },

  startSession: (actId) => {
    set(s => {
      const next = { ...s, sessionActId: actId, sessionStart: null };
      save(next);
      return next;
    });
  },

  beginSession: () => {
    set(s => {
      const next = { ...s, sessionStart: Date.now() };
      save(next);
      return next;
    });
  },

  saveSessionConfig: (actId, config) => {
    set(s => {
      const next = { ...s, sessionConfigs: { ...s.sessionConfigs, [actId]: config } };
      save(next);
      return next;
    });
  },

  endSession: (result, notes) => {
    set(s => {
      if (!s.sessionActId || !s.sessionStart) return s;
      const act = s.nodes[s.sessionActId];
      const duration = Math.round((Date.now() - s.sessionStart) / 1000);
      const archiveEntry: ArchiveEntry = {
        id: `a${s.nextId}`,
        actId: s.sessionActId,
        actName: act?.name || '',
        spaceId: act?.parentId || '',
        spaceName: act?.parentId ? (s.nodes[act.parentId]?.name || '') : '',
        result, duration, notes, completedAt: Date.now(),
      };
      const archives = [...s.archives, archiveEntry];
      const nodes = { ...s.nodes };
      if (act) {
        nodes[s.sessionActId] = { ...act, status: result };
      }
      const next = {
        ...s, nodes, archives,
        nextId: s.nextId + 1,
        sessionActId: null, sessionStart: null,
      };
      save(next);
      return next;
    });
  },

  cancelSession: () => {
    set(s => {
      const next = { ...s, sessionActId: null, sessionStart: null };
      save(next);
      return next;
    });
  },

  addArchive: (a) => {
    const id = `a${get().nextId}`;
    set(s => ({ nextId: s.nextId + 1 }));
    set(s => {
      const archives = [...s.archives, { ...a, id }];
      const next = { ...s, archives };
      save(next);
      return next;
    });
  },

  deleteArchive: (id) => {
    set(s => {
      const archives = s.archives.filter(a => a.id !== id);
      const next = { ...s, archives };
      save(next);
      return next;
    });
  },

  addLayer: (nodeId, layer) => {
    set(s => {
      const node = s.nodes[nodeId];
      if (!node) return s;
      const nodes = { ...s.nodes, [nodeId]: { ...node, layers: [...node.layers, layer] } };
      const next = { ...s, nodes };
      save(next);
      return next;
    });
  },

  removeLayer: (nodeId, index) => {
    set(s => {
      const node = s.nodes[nodeId];
      if (!node) return s;
      const layers = node.layers.filter((_, i) => i !== index);
      const nodes = { ...s.nodes, [nodeId]: { ...node, layers } };
      const next = { ...s, nodes };
      save(next);
      return next;
    });
  },



  removeStep: (actId, index) => {
    set(s => {
      const node = s.nodes[actId];
      if (!node) return s;
      const steps = node.steps.filter((_, i) => i !== index);
      const nodes = { ...s.nodes, [actId]: { ...node, steps } };
      const next = { ...s, nodes };
      save(next);
      return next;
    });
  },

  completeAct: (actId, result, notes) => {
    const state = get();
    const act = state.nodes[actId];
    if (!act || act.type !== 'act') return;
    const duration = state.sessionStart ? Math.round((Date.now() - state.sessionStart) / 1000) : 0;
    const archiveEntry: ArchiveEntry = {
      id: `a${state.nextId}`,
      actId: act.id, actName: act.name,
      spaceId: act.parentId || '',
      spaceName: act.parentId ? (state.nodes[act.parentId]?.name || '') : '',
      result, duration, notes, completedAt: Date.now(),
    };
    set(s => {
      const archives = [...s.archives, archiveEntry];
      const nodes = { ...s.nodes, [actId]: { ...s.nodes[actId], status: result } };
      const next = {
        ...s, nodes, archives, nextId: s.nextId + 1,
        sessionActId: null, sessionStart: null,
      };
      save(next);
      return next;
    });
  },

  createPrecedent: (actId) => {
    const state = get();
    const act = state.nodes[actId];
    if (!act || act.type !== 'act') return;
    return get().createNode('precedent', 'Прецедент', act.x + 60, act.y + 60, { parentActId: actId });
  },

  convertToScenario: (precedentId) => {
    set(s => {
      const node = s.nodes[precedentId];
      if (!node || node.type !== 'precedent') return s;
      const nodes = { ...s.nodes, [precedentId]: { ...node, type: 'scenario' as NodeType, name: node.name === 'Прецедент' ? 'Сценарий' : node.name } };
      const next = { ...s, nodes };
      save(next);
      return next;
    });
  },

  completeScenario: (scenarioId) => {
    set(s => {
      const node = s.nodes[scenarioId];
      if (!node || node.type !== 'scenario') return s;
      const spaceId = node.parentId;
      const nodes = { ...s.nodes, [scenarioId]: { ...node, type: 'space' as NodeType, parentId: spaceId, status: 'success' } };
      const next = { ...s, nodes };
      save(next);
      return next;
    });
  },

  importData: (data) => {
    set(s => {
      const nodes = data.nodes ? { ...s.nodes, ...data.nodes } : s.nodes;
      const connections = data.connections ? [...s.connections, ...data.connections] : s.connections;
      const archives = data.archives ? [...s.archives, ...data.archives] : s.archives;
      const sessionConfigs = data.sessionConfigs ? { ...s.sessionConfigs, ...data.sessionConfigs } : s.sessionConfigs;
      const next = { ...s, nodes, connections, archives, sessionConfigs };
      save(next);
      return next;
    });
  },
}));
