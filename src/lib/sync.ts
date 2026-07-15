import { supabase } from '../lib/supabase';
import { GraphNode, Connection, ArchiveEntry, SessionConfig } from '../store/graphStore';
import { getUserId } from '../lib/userId';

export async function loadAllData(): Promise<{
  nodes: Record<string, GraphNode>;
  connections: Connection[];
  archives: ArchiveEntry[];
  sessionConfigs: Record<string, SessionConfig>;
}> {
  const userId = getUserId();
  if (!userId) return { nodes: {}, connections: [], archives: [], sessionConfigs: {} };

  const [nodesRes, connectionsRes, archivesRes, configsRes] = await Promise.all([
    supabase.from('nodes').select('*').eq('user_id', userId),
    supabase.from('connections').select('*').eq('user_id', userId),
    supabase.from('archives').select('*').eq('user_id', userId),
    supabase.from('session_configs').select('*').eq('user_id', userId),
  ]);

  const nodes: Record<string, GraphNode> = {};
  if (nodesRes.data) {
    for (const n of nodesRes.data) {
      nodes[n.id] = {
        id: n.id, type: n.type, name: n.name, description: n.description || '',
        x: n.x, y: n.y, parentId: n.parent_id, status: n.status,
        parentFocusId: n.parent_focus_id, parentFormId: n.parent_form_id,
        parentActId: n.parent_act_id, parentZoneId: n.parent_zone_id,
        zoneColor: n.zone_color, width: n.width, height: n.height,
        layers: n.layers || [], children: n.children || [], createdAt: n.created_at,
      };
    }
  }

  const connections: Connection[] = (connectionsRes.data || []).map(c => ({
    id: c.id, fromId: c.from_id, toId: c.to_id,
  }));

  const archives: ArchiveEntry[] = (archivesRes.data || []).map(a => ({
    id: a.id, actId: a.act_id, actName: a.act_name,
    spaceId: a.space_id, spaceName: a.space_name,
    result: a.result, duration: a.duration, notes: a.notes || '',
    completedAt: a.completed_at,
  }));

  const sessionConfigs: Record<string, SessionConfig> = {};
  if (configsRes.data) {
    for (const c of configsRes.data) {
      sessionConfigs[c.act_id] = {
        actLayerIndex: c.act_layer_index,
        formId: c.form_id,
        formLayerIndex: c.form_layer_index,
      };
    }
  }

  return { nodes, connections, archives, sessionConfigs };
}

export async function saveNode(node: GraphNode): Promise<void> {
  const userId = getUserId();
  if (!userId) return;
  await supabase.from('nodes').upsert({
    id: node.id, user_id: userId, type: node.type, name: node.name, description: node.description,
    x: node.x, y: node.y, parent_id: node.parentId, status: node.status,
    parent_focus_id: node.parentFocusId, parent_form_id: node.parentFormId,
    parent_act_id: node.parentActId, parent_zone_id: node.parentZoneId,
    zone_color: node.zoneColor, width: node.width, height: node.height,
    layers: node.layers, children: node.children, created_at: node.createdAt,
  });
}

export async function deleteNode(id: string): Promise<void> {
  await supabase.from('nodes').delete().eq('id', id);
}

export async function saveConnection(conn: Connection): Promise<void> {
  const userId = getUserId();
  if (!userId) return;
  await supabase.from('connections').upsert({
    id: conn.id, user_id: userId, from_id: conn.fromId, to_id: conn.toId,
  });
}

export async function deleteConnection(id: string): Promise<void> {
  await supabase.from('connections').delete().eq('id', id);
}

export async function saveArchive(entry: ArchiveEntry): Promise<void> {
  const userId = getUserId();
  if (!userId) return;
  await supabase.from('archives').upsert({
    id: entry.id, user_id: userId, act_id: entry.actId, act_name: entry.actName,
    space_id: entry.spaceId, space_name: entry.spaceName,
    result: entry.result, duration: entry.duration, notes: entry.notes,
    completed_at: entry.completedAt,
  });
}

export async function deleteArchive(id: string): Promise<void> {
  await supabase.from('archives').delete().eq('id', id);
}

export async function saveSessionConfig(actId: string, config: SessionConfig): Promise<void> {
  const userId = getUserId();
  if (!userId) return;
  await supabase.from('session_configs').upsert({
    act_id: actId, user_id: userId, act_layer_index: config.actLayerIndex,
    form_id: config.formId, form_layer_index: config.formLayerIndex,
  });
}

export async function saveBulkData(data: {
  nodes?: Record<string, GraphNode>;
  connections?: Connection[];
  archives?: ArchiveEntry[];
  sessionConfigs?: Record<string, SessionConfig>;
}): Promise<void> {
  const userId = getUserId();
  if (!userId) return;

  const promises: Promise<void>[] = [];

  if (data.nodes) {
    const rows = Object.values(data.nodes).map(n => ({
      id: n.id, user_id: userId, type: n.type, name: n.name, description: n.description,
      x: n.x, y: n.y, parent_id: n.parentId, status: n.status,
      parent_focus_id: n.parentFocusId, parent_form_id: n.parentFormId,
      parent_act_id: n.parentActId, parent_zone_id: n.parentZoneId,
      zone_color: n.zoneColor, width: n.width, height: n.height,
      layers: n.layers, children: n.children, created_at: n.createdAt,
    }));
    promises.push(supabase.from('nodes').upsert(rows).then(() => {}));
  }

  if (data.connections) {
    const rows = data.connections.map(c => ({
      id: c.id, user_id: userId, from_id: c.fromId, to_id: c.toId,
    }));
    promises.push(supabase.from('connections').upsert(rows).then(() => {}));
  }

  if (data.archives) {
    const rows = data.archives.map(a => ({
      id: a.id, user_id: userId, act_id: a.actId, act_name: a.actName,
      space_id: a.spaceId, space_name: a.spaceName,
      result: a.result, duration: a.duration, notes: a.notes,
      completed_at: a.completedAt,
    }));
    promises.push(supabase.from('archives').upsert(rows).then(() => {}));
  }

  if (data.sessionConfigs) {
    const rows = Object.entries(data.sessionConfigs).map(([actId, c]) => ({
      act_id: actId, user_id: userId, act_layer_index: c.actLayerIndex,
      form_id: c.formId, form_layer_index: c.formLayerIndex,
    }));
    promises.push(supabase.from('session_configs').upsert(rows).then(() => {}));
  }

  await Promise.all(promises);
}
