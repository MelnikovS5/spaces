import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGraph, GraphNode, NodeType } from '../store/graphStore';

const COLORS: Record<string, string> = {
  space: '#222', focus: '#555', form: '#777', act: '#999', precedent: '#bbb', scenario: '#666', zone: '#bbb',
};

const SHAPES: Record<string, { label: string; render: (s: number) => JSX.Element }> = {
  space: {
    label: 'Пространство',
    render: (s) => <rect x={2} y={2} width={s - 4} height={s - 4} rx={4} fill="none" stroke={COLORS.space} strokeWidth={1.5} />,
  },
  focus: {
    label: 'Фокус',
    render: (s) => <circle cx={s / 2} cy={s / 2} r={s / 2 - 2} fill="none" stroke={COLORS.focus} strokeWidth={1.5} />,
  },
  form: {
    label: 'Фигура',
    render: (s) => <polygon points={`${s / 2},2 2,${s - 2} ${s - 2},${s - 2}`} fill="none" stroke={COLORS.form} strokeWidth={1.5} />,
  },
  act: {
    label: 'Акт',
    render: (s) => {
      const cx = s / 2;
      return <polygon points={`${cx},${s - 2} 2,2 ${s - 2},2`} fill="none" stroke={COLORS.act} strokeWidth={1.5} />;
    },
  },
  precedent: {
    label: 'Прецедент',
    render: (s) => <circle cx={s / 2} cy={s / 2} r={s / 6} fill={COLORS.precedent} stroke="none" />,
  },
  scenario: {
    label: 'Сценарий',
    render: (s) => {
      const cx = s / 2, cy = s / 2;
      const pts: string[] = [];
      for (let i = 0; i < 40; i++) {
        const t = i * 0.5;
        const r = t * 2.2;
        const a = t * 0.7;
        pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
      }
      return <path d={`M ${pts.join(' ')}`} fill="none" stroke={COLORS.scenario} strokeWidth={1.5} />;
    },
  },
  zone: {
    label: 'Зона',
    render: (s) => <rect x={1} y={1} width={s - 2} height={s - 2} rx={6} fill="none" stroke={COLORS.zone} strokeWidth={1.5} strokeDasharray="2 2" />,
  },
};

const NODE_SIZE = 80;

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

const btnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
  padding: '1px 4px', color: '#888', fontFamily: 'inherit', lineHeight: 1,
};

function NodeShape({ type }: { type: string }) {
  const s = SHAPES[type];
  if (!s) return null;
  return <svg width={NODE_SIZE} height={NODE_SIZE} viewBox={`0 0 ${NODE_SIZE} ${NODE_SIZE}`}>{s.render(NODE_SIZE)}</svg>;
}

function Header({ onArchive }: { onArchive: () => void }) {
  const nodes = useGraph(s => s.nodes);
  const navStack = useGraph(s => s.navStack);
  const goBack = useGraph(s => s.goBack);

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px', borderBottom: '1px solid #eee', flexShrink: 0, fontFamily: 'monospace',
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, color: '#888' }}>
        <span style={{ color: '#222', fontWeight: 700, fontSize: 16, letterSpacing: 1, cursor: 'pointer' }}
          onClick={() => { if (navStack.length > 0) useGraph.getState().goBack(); }}>
          ПРОСТРАНСТВА
        </span>
        {navStack.map((id, i) => {
          const n = nodes[id];
          if (!n) return null;
          return <span key={id}><span style={{ margin: '0 4px', color: '#bbb' }}>/</span><span style={{ color: '#555' }}>{n.name}</span></span>;
        })}
        {navStack.length > 0 && (
          <button onClick={goBack} style={{
            marginLeft: 8, background: 'none', border: '1px solid #ddd', borderRadius: 3,
            cursor: 'pointer', fontSize: 11, padding: '2px 8px', color: '#666', fontFamily: 'inherit',
          }}>← Назад</button>
        )}
      </div>
      <button onClick={onArchive} style={{
        background: 'none', border: '1px solid #ddd', borderRadius: 3,
        cursor: 'pointer', fontSize: 11, padding: '4px 10px', color: '#666', fontFamily: 'inherit',
      }}>Архив</button>
    </header>
  );
}

function CreateMenu({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  const createNode = useGraph(s => s.createNode);
  const visibleNodes = useGraph(s => s.visibleNodes);
  const navStack = useGraph(s => s.navStack);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const isRoot = navStack.length === 0;
  const focuses = visibleNodes().filter(n => n.type === 'focus');
  const types: NodeType[] = isRoot ? ['space'] : ['zone', 'focus', 'form', 'act'];
  const needsFocus = types.includes('form') || types.includes('act');
  const [focusId, setFocusId] = useState(focuses.length > 0 ? focuses[0].id : '');

  const handleCreate = (t: NodeType) => {
    if (t === 'focus') createNode('focus', name || 'Фокус', x, y);
    else if (t === 'act') createNode('act', name || 'Акт', x, y, { parentFocusId: focusId || undefined });
    else if (t === 'form') createNode('form', name || 'Фигура', x, y, { parentFocusId: focusId || undefined });
    else createNode(t, name || SHAPES[t].label, x, y);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', left: x, top: y, background: '#fff',
      border: '1px solid #e0e0e0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      padding: 12, zIndex: 1000, minWidth: 200, fontFamily: 'monospace',
    }}>
      <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
        placeholder="Название..."
        style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 2,
          fontSize: 12, fontFamily: 'inherit', marginBottom: 8, outline: 'none' }}
        onKeyDown={e => { if (e.key === 'Enter') handleCreate(types[0]); }} />
      {needsFocus && focuses.length > 0 && (
        <select value={focusId} onChange={e => setFocusId(e.target.value)}
          style={{ width: '100%', marginBottom: 6, padding: '4px 6px', fontSize: 11, fontFamily: 'inherit',
            border: '1px solid #ddd', borderRadius: 2, outline: 'none', color: '#555' }}>
          {focuses.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      )}
      {needsFocus && focuses.length === 0 && !isRoot && (
        <div style={{ fontSize: 10, color: '#bbb', marginBottom: 6, padding: '0 8px' }}>Сначала создайте фокус</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {types.map(t => (
          <div key={t} onClick={() => handleCreate(t)} style={{
            padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: '#333', borderRadius: 2,
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <svg width={14} height={14} viewBox="0 0 16 16">{SHAPES[t].render(16)}</svg>
            {SHAPES[t].label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionLines({ nodeIds, visibleNodes, selectedConnection, onSelectConnection, onConnectionContextMenu }: {
  nodeIds: Set<string>; visibleNodes: GraphNode[];
  selectedConnection: string | null; onSelectConnection: (id: string | null) => void;
  onConnectionContextMenu: (id: string, e: React.MouseEvent) => void;
}) {
  const allNodes = useGraph(s => s.nodes);
  const connections = useGraph(s => s.connections);

  const renderLine = (key: string, x1: number, y1: number, x2: number, y2: number, color: string, dash: string, connId?: string) => (
    <g key={key}>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={connId && connId === selectedConnection ? '#222' : color}
        strokeWidth={connId && connId === selectedConnection ? 2 : 1}
        strokeDasharray={dash} pointerEvents="none" />
    </g>
  );

  return (
    <>
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6 }}>
      {connections.map((l, i) => {
        const from = allNodes[l.fromId], to = allNodes[l.toId];
        if (!from || !to || !nodeIds.has(l.fromId) || !nodeIds.has(l.toId)) return null;
        return renderLine(`c${i}`, from.x, from.y, to.x, to.y, '#ddd', '3 2', l.id);
      })}
      {visibleNodes.filter(n => n.type === 'act' && n.parentFocusId && nodeIds.has(n.parentFocusId)).map(act => {
        const focus = allNodes[act.parentFocusId!];
        if (!focus) return null;
        return renderLine(`af-${act.id}`, act.x, act.y, focus.x, focus.y, '#ccc', '2 3');
      })}
      {visibleNodes.filter(n => n.type === 'form' && n.parentFocusId && nodeIds.has(n.parentFocusId)).map(form => {
        const focus = allNodes[form.parentFocusId!];
        if (!focus) return null;
        return renderLine(`ff-${form.id}`, form.x, form.y, focus.x, focus.y, '#ddd', '2 4');
      })}
      {visibleNodes.filter(n => (n.type === 'precedent' || n.type === 'scenario') && n.parentActId && nodeIds.has(n.parentActId)).map(child => {
        const act = allNodes[child.parentActId!];
        if (!act) return null;
        return renderLine(`pa-${child.id}`, child.x, child.y, act.x, act.y, '#ddd', '2 3');
      })}
    </svg>
    {connections.map((l, i) => {
      const from = allNodes[l.fromId], to = allNodes[l.toId];
      if (!from || !to || !nodeIds.has(l.fromId) || !nodeIds.has(l.toId)) return null;
      const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
      const dx = to.x - from.x, dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      return (
        <div key={`hit-${l.id}`}
          onPointerDown={(e) => { e.stopPropagation(); onSelectConnection(l.id === selectedConnection ? null : l.id); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onConnectionContextMenu(l.id, e); }}
          style={{
            position: 'absolute', left: mx - len / 2, top: my - 12, width: len, height: 24,
            transform: `rotate(${angle}deg)`, transformOrigin: 'center center',
            cursor: 'pointer', zIndex: 7, background: 'transparent',
          }} />
      );
    })}
    </>
  );
}

function makeDragHandlers(
  node: GraphNode, isSelected: boolean, selectedIds: string[],
  dragRef: React.MutableRefObject<{
    pointerId: number; ids: string[]; startPos: Record<string, { x: number; y: number }>;
    sx: number; sy: number; moved: boolean;
  } | null>,
  selectNode: (id: string) => void, toggleSelectNode: (id: string) => void,
  moveNode: (id: string, x: number, y: number) => void,
  allNodes: GraphNode[],
  onRmb: () => void,
) {
  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!isSelected) {
      selectNode(node.id);
    } else if (e.shiftKey) {
      toggleSelectNode(node.id);
    }
    const curSelected = useGraph.getState().selectedIds;
    const ids = curSelected.length > 0 ? curSelected : [node.id];
    dragRef.current = {
      pointerId: e.pointerId, ids,
      startPos: Object.fromEntries(ids.map(id => [id, { x: allNodes.find(n => n.id === id)?.x ?? 0, y: allNodes.find(n => n.id === id)?.y ?? 0 }])),
      sx: e.clientX, sy: e.clientY, moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const dr = dragRef.current;
    if (!dr) return;
    const dx = e.clientX - dr.sx, dy = e.clientY - dr.sy;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dr.moved = true;
    if (!dr.moved) return;
    dr.ids.forEach(id => {
      const sp = dr.startPos[id];
      if (sp) moveNode(id, sp.x + dx, sp.y + dy);
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const dr = dragRef.current;
    if (!dr || dr.pointerId !== e.pointerId) { dragRef.current = null; return; }
    if (!dr.moved && e.button === 2) onRmb();
    dragRef.current = null;
  };
  return { onPointerDown, onPointerMove, onPointerUp };
}

function FocusNode({
  focus, forms, actsByForm, orphanActs, onActSession, allNodes,
  connectMode, connectSource, onConnectClick,
  selectedConnection, onReconnect,
}: {
  focus: GraphNode; forms: GraphNode[]; actsByForm: Record<string, GraphNode[]>;
  orphanActs: GraphNode[]; onActSession: (actId: string) => void; allNodes: GraphNode[];
  connectMode: boolean; connectSource: string | null; onConnectClick: (id: string) => void;
  selectedConnection: string | null; onReconnect: (id: string) => void;
}) {
  const selectedIds = useGraph(s => s.selectedIds);
  const selectNode = useGraph(s => s.selectNode);
  const toggleSelectNode = useGraph(s => s.toggleSelectNode);
  const moveNode = useGraph(s => s.moveNode);
  const updateNode = useGraph(s => s.updateNode);
  const deleteNode = useGraph(s => s.deleteNode);
  const createNode = useGraph(s => s.createNode);

  const [hovered, setHovered] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [subHover, setSubHover] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<string | null>(null);
  const [editingAct, setEditingAct] = useState<string | null>(null);
  const [newActForm, setNewActForm] = useState<string | null>(null);
  const [actName, setActName] = useState('');
  const [formName, setFormName] = useState('');

  const isSelected = selectedIds.includes(focus.id);
  const glow = isSelected ? `0 0 0 2px ${COLORS.focus}` : hovered ? `0 0 0 1px #ccc` : 'none';
  const hasChildren = forms.length > 0 || orphanActs.length > 0;
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelLeave = () => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
  };
  const scheduleLeave = () => {
    cancelLeave();
    leaveTimer.current = setTimeout(() => {
      setHovered(false); setNewActForm(null); setEditingForm(null); setEditingAct(null); setSubHover(null);
    }, 250);
  };

  const dragRef = useRef<{
    pointerId: number; ids: string[]; startPos: Record<string, { x: number; y: number }>;
    sx: number; sy: number; moved: boolean;
  } | null>(null);

  const dh = makeDragHandlers(focus, isSelected, selectedIds, dragRef, selectNode, toggleSelectNode, moveNode, allNodes, () => setShowCard(true));

  return (
    <div style={{ position: 'absolute', left: focus.x - NODE_SIZE / 2, top: focus.y - NODE_SIZE / 2, zIndex: 10 }}
      onPointerEnter={() => { cancelLeave(); setHovered(true); }}
      onPointerLeave={scheduleLeave}
    >
      {hovered && hasChildren && (
        <div style={{
          position: 'absolute', bottom: NODE_SIZE + 4, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
          onPointerEnter={cancelLeave}
          onPointerLeave={scheduleLeave}>
          {forms.map(form => {
            const acts = actsByForm[form.id] || [];
            return (
              <div key={form.id} style={{
                background: '#fff', border: '1px solid #eee', borderRadius: 3, marginBottom: 2,
                padding: '6px 10px', minWidth: 200, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                fontFamily: 'monospace', fontSize: 11,
              }}
                onMouseEnter={() => setSubHover(form.id)}
                onMouseLeave={() => setSubHover(null)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: acts.length > 0 || newActForm === form.id ? 4 : 0 }}>
                  <span style={{ color: COLORS.form, fontWeight: 600, flex: 1 }}>{form.name}</span>
                  <button onClick={e => { e.stopPropagation(); setEditingForm(editingForm === form.id ? null : form.id); }} style={btnStyle} title="Редактировать">✎</button>
                  <button onClick={e => { e.stopPropagation(); setNewActForm(newActForm === form.id ? null : form.id); }} style={btnStyle} title="Добавить акт">+акт</button>
                  <button onClick={e => { e.stopPropagation(); deleteNode(form.id); }} style={{ ...btnStyle, color: '#c00' }} title="Удалить">✕</button>
                </div>
                {editingForm === form.id && (
                  <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                    <input value={formName || form.name} onChange={e => setFormName(e.target.value)}
                      placeholder="Название формы" autoFocus
                      style={{ flex: 1, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 1, fontSize: 11, fontFamily: 'inherit', outline: 'none' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { updateNode(form.id, { name: formName.trim() || form.name }); setEditingForm(null); setFormName(''); }
                        if (e.key === 'Escape') setEditingForm(null);
                      }} />
                  </div>
                )}
                {acts.map(act => (
                  <div key={act.id} style={{
                    display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 8, marginTop: 2,
                    color: act.status === 'success' ? '#222' : act.status === 'failure' ? '#c00' : COLORS.act,
                  }}>
                    {act.status === 'success' ? <span>✓</span> : act.status === 'failure' ? <span>✗</span> : <span style={{ color: '#ccc' }}>○</span>}
                    {editingAct === act.id ? (
                      <input defaultValue={act.name}
                        onBlur={e => { updateNode(act.id, { name: e.target.value.trim() || act.name }); setEditingAct(null); }}
                        onKeyDown={e => { if (e.key === 'Escape') setEditingAct(null); if (e.key === 'Enter') e.currentTarget.blur(); }}
                        autoFocus style={{ flex: 1, padding: '1px 4px', border: '1px solid #ddd', borderRadius: 1, fontSize: 11, fontFamily: 'inherit', outline: 'none' }} />
                    ) : (
                      <span style={{ flex: 1, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setEditingAct(act.id); }}>{act.name}</span>
                    )}
                    <button onClick={e => { e.stopPropagation(); onActSession(act.id); }} style={btnStyle} title="Старт">▶</button>
                    <button onClick={e => { e.stopPropagation(); deleteNode(act.id); }} style={{ ...btnStyle, color: '#c00' }} title="Удалить">✕</button>
                  </div>
                ))}
                {newActForm === form.id && (
                  <div style={{ display: 'flex', gap: 2, marginTop: 4, paddingLeft: 8 }}>
                    <input value={actName} onChange={e => setActName(e.target.value)}
                      placeholder="Название акта"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && actName.trim()) {
                          createNode('act', actName.trim(), focus.x, focus.y, { parentFormId: form.id });
                          setActName(''); setNewActForm(null);
                        }
                        if (e.key === 'Escape') { setActName(''); setNewActForm(null); }
                      }}
                      autoFocus
                      style={{ flex: 1, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 1, fontSize: 11, fontFamily: 'inherit', outline: 'none' }} />
        </div>
      )}
          </div>
        );
        })}
        {orphanActs.length > 0 && (
            <div style={{
              background: '#fff', border: '1px solid #eee', borderRadius: 3, padding: '6px 10px',
              minWidth: 200, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontFamily: 'monospace', fontSize: 11,
            }}>
              {orphanActs.map(act => (
                <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
                  color: act.status === 'success' ? '#222' : act.status === 'failure' ? '#c00' : COLORS.act }}>
                  {act.status === 'success' ? <span>✓</span> : act.status === 'failure' ? <span>✗</span> : <span style={{ color: '#ccc' }}>○</span>}
                  <span style={{ flex: 1 }}>{act.name}</span>
                  <button onClick={e => { e.stopPropagation(); onActSession(act.id); }} style={btnStyle} title="Старт">▶</button>
                  <button onClick={e => { e.stopPropagation(); deleteNode(act.id); }} style={{ ...btnStyle, color: '#c00' }} title="Удалить">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          if (selectedConnection && e.shiftKey) { e.currentTarget.setPointerCapture(e.pointerId); onReconnect(focus.id); return; }
          if (connectMode) { onConnectClick(focus.id); return; }
          dh.onPointerDown(e);
        }}
        onPointerMove={(e) => { if (!connectMode) dh.onPointerMove(e); }}
        onPointerUp={(e) => { if (!connectMode) dh.onPointerUp(e); }}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); if (!connectMode) setShowCard(true); }}
        style={{
          width: NODE_SIZE, height: NODE_SIZE, cursor: connectMode ? 'crosshair' : 'default',
          userSelect: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          boxShadow: connectSource === focus.id ? `0 0 0 3px ${COLORS.focus}` : glow, borderRadius: 2, padding: 2,
          transition: 'left 0.2s ease, top 0.2s ease, opacity 0.15s ease, box-shadow 0.15s ease',
        }}>
        <NodeShape type="focus" />
        <span style={{ fontSize: 11, color: COLORS.focus, maxWidth: NODE_SIZE + 20, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>{focus.name}</span>
      </div>

      {showCard && (
        <div style={{
          position: 'fixed', left: Math.min(focus.x + NODE_SIZE / 2 + 8, window.innerWidth - 220),
          top: Math.max(8, Math.min(focus.y - NODE_SIZE / 2, window.innerHeight - 150)),
          background: '#fff', border: '1px solid #ddd', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          padding: 12, zIndex: 2000, minWidth: 200, fontFamily: 'monospace', maxWidth: 260,
        }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
            <input defaultValue={focus.name}
              onBlur={e => { updateNode(focus.id, { name: e.target.value.trim() || focus.name }); }}
              onKeyDown={e => { if (e.key === 'Escape') setShowCard(false); }}
              autoFocus
              style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={() => setShowCard(false)} style={{ background: '#222', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: 11, borderRadius: 2, fontFamily: 'inherit' }}>ОК</button>
          </div>
          <textarea defaultValue={focus.description}
            onBlur={e => updateNode(focus.id, { description: e.target.value })}
            placeholder="Описание..." rows={2}
            onKeyDown={e => { if (e.key === 'Escape') setShowCard(false); }}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 11, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: '#555', marginBottom: 8, boxSizing: 'border-box' }} />
          <button onClick={() => {
            createNode('act', 'Акт', focus.x, focus.y + 100, { parentFocusId: focus.id });
            setShowCard(false);
          }} style={{
            background: 'none', border: '1px solid #ddd', borderRadius: 2, cursor: 'pointer',
            fontSize: 11, padding: '2px 8px', color: COLORS.act, fontFamily: 'inherit', marginBottom: 4, width: '100%',
          }}>△ Создать акт</button>
          <button onClick={() => { deleteNode(focus.id); setShowCard(false); }}
            style={{ background: 'none', border: '1px solid #ddd', borderRadius: 2, cursor: 'pointer', fontSize: 11, padding: '2px 8px', color: '#c00', fontFamily: 'inherit', width: '100%' }}>✕ Удалить</button>
        </div>
      )}
    </div>
  );
}

function FormNode({
  form, allNodes,
  connectMode, connectSource, onConnectClick,
  selectedConnection, onReconnect,
}: {
  form: GraphNode; allNodes: GraphNode[];
  connectMode: boolean; connectSource: string | null; onConnectClick: (id: string) => void;
  selectedConnection: string | null; onReconnect: (id: string) => void;
}) {
  const selectedIds = useGraph(s => s.selectedIds);
  const selectNode = useGraph(s => s.selectNode);
  const toggleSelectNode = useGraph(s => s.toggleSelectNode);
  const moveNode = useGraph(s => s.moveNode);
  const updateNode = useGraph(s => s.updateNode);
  const deleteNode = useGraph(s => s.deleteNode);

  const [showCard, setShowCard] = useState(false);
  const isSelected = selectedIds.includes(form.id);

  const dragRef = useRef<{
    pointerId: number; ids: string[]; startPos: Record<string, { x: number; y: number }>;
    sx: number; sy: number; moved: boolean;
  } | null>(null);

  const dh = makeDragHandlers(form, isSelected, selectedIds, dragRef, selectNode, toggleSelectNode, moveNode, allNodes, () => setShowCard(true));

  return (
    <div style={{ position: 'absolute', left: form.x - NODE_SIZE / 2, top: form.y - NODE_SIZE / 2, zIndex: 10 }}>
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          if (selectedConnection && e.shiftKey) { e.currentTarget.setPointerCapture(e.pointerId); onReconnect(form.id); return; }
          if (connectMode) { onConnectClick(form.id); return; }
          dh.onPointerDown(e);
        }}
        onPointerMove={(e) => { if (!connectMode) dh.onPointerMove(e); }}
        onPointerUp={(e) => { if (!connectMode) dh.onPointerUp(e); }}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); if (!connectMode) setShowCard(true); }}
        style={{
          width: NODE_SIZE, height: NODE_SIZE, cursor: connectMode ? 'crosshair' : 'default',
          userSelect: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          boxShadow: connectSource === form.id ? `0 0 0 3px ${COLORS.form}` : isSelected ? `0 0 0 2px ${COLORS.form}` : 'none',
          borderRadius: 2, padding: 2,
          transition: 'left 0.2s ease, top 0.2s ease, opacity 0.15s ease, box-shadow 0.15s ease',
        }}>
        <NodeShape type="form" />
        <span style={{ fontSize: 11, color: COLORS.form, maxWidth: NODE_SIZE + 20, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>{form.name}</span>
      </div>
      {showCard && (
        <div style={{
          position: 'fixed', left: Math.min(form.x + NODE_SIZE / 2 + 8, window.innerWidth - 220),
          top: Math.max(8, Math.min(form.y - NODE_SIZE / 2, window.innerHeight - 150)),
          background: '#fff', border: '1px solid #ddd', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          padding: 12, zIndex: 2000, minWidth: 200, fontFamily: 'monospace', maxWidth: 260,
        }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
            <input defaultValue={form.name}
              onBlur={e => { updateNode(form.id, { name: e.target.value.trim() || form.name }); }}
              onKeyDown={e => { if (e.key === 'Escape') setShowCard(false); }}
              autoFocus
              style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={() => setShowCard(false)}
              style={{ background: '#222', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: 11, borderRadius: 2, fontFamily: 'inherit' }}>ОК</button>
          </div>
          <textarea defaultValue={form.description}
            onBlur={e => updateNode(form.id, { description: e.target.value })}
            placeholder="Описание..." rows={2}
            onKeyDown={e => { if (e.key === 'Escape') setShowCard(false); }}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 11, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: '#555', marginBottom: 8, boxSizing: 'border-box' }} />
          <button onClick={() => { deleteNode(form.id); setShowCard(false); }}
            style={{ background: 'none', border: '1px solid #ddd', borderRadius: 2, cursor: 'pointer', fontSize: 11, padding: '2px 8px', color: '#c00', fontFamily: 'inherit' }}>✕ Удалить</button>
        </div>
      )}
    </div>
  );
}

function ActNode({
  act, precedents, scenarios, onActSession, allNodes,
  connectMode, connectSource, onConnectClick,
  selectedConnection, onReconnect,
}: {
  act: GraphNode; precedents: GraphNode[]; scenarios: GraphNode[]; onActSession: (actId: string) => void; allNodes: GraphNode[];
  connectMode: boolean; connectSource: string | null; onConnectClick: (id: string) => void;
  selectedConnection: string | null; onReconnect: (id: string) => void;
}) {
  const selectedIds = useGraph(s => s.selectedIds);
  const selectNode = useGraph(s => s.selectNode);
  const toggleSelectNode = useGraph(s => s.toggleSelectNode);
  const moveNode = useGraph(s => s.moveNode);
  const updateNode = useGraph(s => s.updateNode);
  const deleteNode = useGraph(s => s.deleteNode);
  const addStep = useGraph(s => s.addStep);
  const removeStep = useGraph(s => s.removeStep);
  const createPrecedentAct = useGraph(s => s.createPrecedent);
  const convertToScenario = useGraph(s => s.convertToScenario);
  const completeScenario = useGraph(s => s.completeScenario);

  const [showCard, setShowCard] = useState(false);
  const [newStepText, setNewStepText] = useState('');

  const isSelected = selectedIds.includes(act.id);
  const glow = isSelected ? `0 0 0 2px ${COLORS.act}` : 'none';
  const hasChild = precedents.length > 0 || scenarios.length > 0;
  const isSuccess = act.status === 'success';

  const dragRef = useRef<{
    pointerId: number; ids: string[]; startPos: Record<string, { x: number; y: number }>;
    sx: number; sy: number; moved: boolean;
  } | null>(null);

  const dh = makeDragHandlers(act, isSelected, selectedIds, dragRef, selectNode, toggleSelectNode, moveNode, allNodes, () => setShowCard(true));

  return (
    <div style={{ position: 'absolute', left: act.x - NODE_SIZE / 2, top: act.y - NODE_SIZE / 2, zIndex: 10 }}>
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          if (selectedConnection && e.shiftKey) { e.currentTarget.setPointerCapture(e.pointerId); onReconnect(act.id); return; }
          if (connectMode) { onConnectClick(act.id); return; }
          dh.onPointerDown(e);
        }}
        onPointerMove={(e) => { if (!connectMode) dh.onPointerMove(e); }}
        onPointerUp={(e) => { if (!connectMode) dh.onPointerUp(e); }}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); if (!connectMode) setShowCard(true); }}
        style={{
          width: NODE_SIZE, height: NODE_SIZE, cursor: connectMode ? 'crosshair' : 'default',
          userSelect: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          boxShadow: connectSource === act.id ? `0 0 0 3px ${COLORS.act}` : glow, borderRadius: 2, padding: 2,
          transition: 'left 0.2s ease, top 0.2s ease, opacity 0.15s ease, box-shadow 0.15s ease',
        }}>
        <NodeShape type="act" />
        <span style={{ fontSize: 11, color: COLORS.act, maxWidth: NODE_SIZE + 20, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>{act.name}</span>
      </div>

      {showCard && (
        <div style={{
          position: 'fixed', left: Math.min(act.x + NODE_SIZE / 2 + 8, window.innerWidth - 220),
          top: Math.max(8, Math.min(act.y - NODE_SIZE / 2, window.innerHeight - 150)),
          background: '#fff', border: '1px solid #ddd', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          padding: 12, zIndex: 2000, minWidth: 220, fontFamily: 'monospace', maxWidth: 280,
        }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
            <input defaultValue={act.name}
              onBlur={e => { updateNode(act.id, { name: e.target.value.trim() || act.name }); }}
              onKeyDown={e => { if (e.key === 'Escape') setShowCard(false); }}
              autoFocus
              style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={() => setShowCard(false)}
              style={{ background: '#222', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: 11, borderRadius: 2, fontFamily: 'inherit' }}>ОК</button>
          </div>

          {hasChild && (
            <div style={{ marginBottom: 8, fontSize: 11, color: '#888' }}>
              {precedents.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ color: COLORS.precedent }}>●</span>
                  <span style={{ flex: 1 }}>{p.name}</span>
                  <button onClick={() => convertToScenario(p.id)} style={btnStyle} title="Преобразовать в сценарий">→</button>
                  <button onClick={() => deleteNode(p.id)} style={{ ...btnStyle, color: '#c00' }}>✕</button>
                </div>
              ))}
              {scenarios.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ color: COLORS.scenario }}>◎</span>
                  <span style={{ flex: 1 }}>{s.name}</span>
                  <button onClick={() => completeScenario(s.id)} style={btnStyle} title="Завершить сценарий (→ подпространство)">✓</button>
                  <button onClick={() => deleteNode(s.id)} style={{ ...btnStyle, color: '#c00' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: '#bbb', marginBottom: 4 }}>ШАГИ</div>
            {act.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', marginTop: 2 }}>
                <span>{i + 1}.</span>
                <span style={{ flex: 1 }}>{step}</span>
                <button onClick={() => removeStep(act.id, i)} style={{ ...btnStyle, color: '#c00' }}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
              <input value={newStepText} onChange={e => setNewStepText(e.target.value)}
                placeholder="+ шаг" autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && newStepText.trim()) {
                    addStep(act.id, newStepText.trim());
                    setNewStepText('');
                  }
                }}
                style={{ flex: 1, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 1, fontSize: 11, fontFamily: 'inherit', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            <button onClick={() => { onActSession(act.id); setShowCard(false); }}
              style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer', fontSize: 11, padding: '4px 10px', fontFamily: 'inherit', flex: 1 }}>▶ Старт</button>
            {isSuccess && (
              <button onClick={() => { createPrecedentAct(act.id); setShowCard(false); }}
                style={{ background: 'none', border: '1px solid #ddd', borderRadius: 2, cursor: 'pointer', fontSize: 11, padding: '4px 10px', color: COLORS.precedent, fontFamily: 'inherit' }}>● Прецедент</button>
            )}
          </div>

          <button onClick={() => { deleteNode(act.id); setShowCard(false); }}
            style={{ background: 'none', border: '1px solid #ddd', borderRadius: 2, cursor: 'pointer', fontSize: 11, padding: '2px 8px', color: '#c00', fontFamily: 'inherit', width: '100%' }}>✕ Удалить</button>
        </div>
      )}
    </div>
  );
}

function SmallNode({
  node, allNodes,
  connectMode, connectSource, onConnectClick,
  selectedConnection, onReconnect,
}: {
  node: GraphNode; allNodes: GraphNode[];
  connectMode: boolean; connectSource: string | null; onConnectClick: (id: string) => void;
  selectedConnection: string | null; onReconnect: (id: string) => void;
}) {
  const selectedIds = useGraph(s => s.selectedIds);
  const selectNode = useGraph(s => s.selectNode);
  const toggleSelectNode = useGraph(s => s.toggleSelectNode);
  const moveNode = useGraph(s => s.moveNode);
  const deleteNode = useGraph(s => s.deleteNode);
  const updateNode = useGraph(s => s.updateNode);
  const convertToScenario = useGraph(s => s.convertToScenario);
  const completeScenario = useGraph(s => s.completeScenario);

  const isSelected = selectedIds.includes(node.id);
  const [showCard, setShowCard] = useState(false);

  const dragRef = useRef<{
    pointerId: number; ids: string[]; startPos: Record<string, { x: number; y: number }>;
    sx: number; sy: number; moved: boolean;
  } | null>(null);

  const dh = makeDragHandlers(node, isSelected, selectedIds, dragRef, selectNode, toggleSelectNode, moveNode, allNodes, () => setShowCard(true));

  const sz = 40;

  return (
    <div style={{ position: 'absolute', left: node.x - sz / 2, top: node.y - sz / 2, zIndex: 10 }}>
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          if (selectedConnection && e.shiftKey) { e.currentTarget.setPointerCapture(e.pointerId); onReconnect(node.id); return; }
          if (connectMode) { onConnectClick(node.id); return; }
          dh.onPointerDown(e);
        }}
        onPointerMove={(e) => { if (!connectMode) dh.onPointerMove(e); }}
        onPointerUp={(e) => { if (!connectMode) dh.onPointerUp(e); }}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); if (!connectMode) setShowCard(true); }}
        style={{
          width: sz, height: sz, cursor: connectMode ? 'crosshair' : 'default',
          userSelect: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: connectSource === node.id ? `0 0 0 3px ${COLORS[node.type] || '#888'}` : isSelected ? `0 0 0 2px ${COLORS[node.type] || '#888'}` : 'none',
          borderRadius: 2, padding: 2,
          transition: 'box-shadow 0.15s ease',
        }}>
        <svg width={sz} height={sz} viewBox={`0 0 40 40`}>
          {node.type === 'precedent'
            ? <circle cx={20} cy={20} r={6} fill={COLORS.precedent} stroke="none" />
            : <circle cx={20} cy={20} r={3} fill="none" stroke={COLORS.scenario} strokeWidth={1.5} />
              /* scenario in small view: just a small circle with stroke */
          }
        </svg>
      </div>

      {showCard && (
        <div style={{
          position: 'fixed', left: Math.min(node.x + sz / 2 + 8, window.innerWidth - 200),
          top: Math.max(8, Math.min(node.y - sz / 2, window.innerHeight - 150)),
          background: '#fff', border: '1px solid #ddd', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          padding: 12, zIndex: 2000, minWidth: 180, fontFamily: 'monospace', maxWidth: 240,
        }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
            <input defaultValue={node.name}
              onBlur={e => { updateNode(node.id, { name: e.target.value.trim() || node.name }); }}
              onKeyDown={e => { if (e.key === 'Escape') setShowCard(false); }}
              autoFocus
              style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={() => setShowCard(false)}
              style={{ background: '#222', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: 11, borderRadius: 2, fontFamily: 'inherit' }}>ОК</button>
          </div>
          <textarea defaultValue={node.description}
            onBlur={e => updateNode(node.id, { description: e.target.value })}
            placeholder="Описание..." rows={2}
            onKeyDown={e => { if (e.key === 'Escape') setShowCard(false); }}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 11, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: '#555', marginBottom: 8, boxSizing: 'border-box' }} />
          {node.type === 'precedent' && (
            <button onClick={() => { convertToScenario(node.id); setShowCard(false); }}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 2, cursor: 'pointer', fontSize: 11, padding: '2px 8px', color: '#666', fontFamily: 'inherit', marginBottom: 4, width: '100%' }}>→ Преобразовать в сценарий</button>
          )}
          {node.type === 'scenario' && (
            <button onClick={() => { completeScenario(node.id); setShowCard(false); }}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 2, cursor: 'pointer', fontSize: 11, padding: '2px 8px', color: '#666', fontFamily: 'inherit', marginBottom: 4, width: '100%' }}>✓ Завершить сценарий</button>
          )}
          <button onClick={() => { deleteNode(node.id); setShowCard(false); }}
            style={{ background: 'none', border: '1px solid #ddd', borderRadius: 2, cursor: 'pointer', fontSize: 11, padding: '2px 8px', color: '#c00', fontFamily: 'inherit', width: '100%' }}>✕ Удалить</button>
        </div>
      )}
    </div>
  );
}

function ZoneNode({ node, allNodes }: { node: GraphNode; allNodes: GraphNode[] }) {
  const selectedIds = useGraph(s => s.selectedIds);
  const selectNode = useGraph(s => s.selectNode);
  const toggleSelectNode = useGraph(s => s.toggleSelectNode);
  const moveNode = useGraph(s => s.moveNode);
  const updateNode = useGraph(s => s.updateNode);
  const deleteNode = useGraph(s => s.deleteNode);

  const isSelected = selectedIds.includes(node.id);
  const [showCard, setShowCard] = useState(false);
  const w = node.width || 400;
  const h = node.height || 320;

  const dragRef = useRef<{
    pointerId: number; startX: number; startY: number;
    startW: number; startH: number; startNX: number; startNY: number;
    edge: string; moved: boolean;
  } | null>(null);

  const makeResizeHandle = (edge: string, style: React.CSSProperties) => (
    <div key={edge}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        selectNode(node.id);
        dragRef.current = {
          pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
          startW: w, startH: h, startNX: node.x, startNY: node.y,
          edge, moved: false,
        };
      }}
      onPointerMove={(e) => {
        const dr = dragRef.current;
        if (!dr || dr.pointerId !== e.pointerId) return;
        const dx = e.clientX - dr.startX, dy = e.clientY - dr.startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dr.moved = true;
        const pw = dr.edge.includes('e') ? dr.startW + dx : dr.startW;
        const ph = dr.edge.includes('s') ? dr.startH + dy : dr.startH;
        const px = dr.edge.includes('w') ? dr.startNX + dx : node.x;
        const py = dr.edge.includes('n') ? dr.startNY + dy : node.y;
        if (dr.edge.includes('e') || dr.edge.includes('w')) updateNode(node.id, { width: Math.max(120, pw) });
        if (dr.edge.includes('s') || dr.edge.includes('n')) updateNode(node.id, { height: Math.max(80, ph) });
        if (dr.edge.includes('w')) moveNode(node.id, px, node.y);
        if (dr.edge.includes('n')) moveNode(node.id, node.x, py);
      }}
      onPointerUp={(e) => {
        if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
      }}
      style={{
        position: 'absolute', cursor: `${edge}-resize`, zIndex: 20,
        ...style,
      }} />
  );

  return (
    <div style={{ position: 'absolute', left: node.x, top: node.y, zIndex: 4 }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setShowCard(true); }}>
      <div style={{
        width: w, height: h, border: isSelected ? '1.5px solid #222' : `1px dashed ${node.zoneColor || '#ccc'}`,
        borderRadius: 8, boxSizing: 'border-box',
        background: node.zoneColor ? hexToRgba(node.zoneColor, 0.25) : 'rgba(250,250,250,0.5)',
        position: 'relative',
      }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          if (!isSelected) { selectNode(node.id); } else if (e.shiftKey) { toggleSelectNode(node.id); }
          dragRef.current = {
            pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
            startW: w, startH: h, startNX: node.x, startNY: node.y,
            edge: 'move', moved: false,
          };
        }}
        onPointerMove={(e) => {
          const dr = dragRef.current;
          if (!dr || dr.pointerId !== e.pointerId) return;
          if (dr.edge === 'move') {
            const dx = e.clientX - dr.startX, dy = e.clientY - dr.startY;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dr.moved = true;
            moveNode(node.id, dr.startNX + dx, dr.startNY + dy);
          }
        }}
        onPointerUp={(e) => {
          if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
        }}>
        <span style={{
          position: 'absolute', top: -10, left: 12, fontSize: 10, fontWeight: 600,
          color: '#222',
          background: node.zoneColor ? hexToRgba(node.zoneColor, 0.25) : 'rgba(250,250,250,0.5)',
          padding: '0 4px', letterSpacing: 1, textTransform: 'uppercase',
        }}>{node.name || 'Зона'}</span>
      </div>
      {isSelected && (
        <>
          {makeResizeHandle('e', { right: -3, top: 0, width: 6, height: h, bottom: 0 })}
          {makeResizeHandle('s', { left: 0, bottom: -3, height: 6, right: 0 })}
          {makeResizeHandle('se', { right: -4, bottom: -4, width: 10, height: 10, background: '#222', borderRadius: '50%' })}
        </>
      )}
      {showCard && (
        <div style={{
          position: 'fixed', left: Math.min(node.x + 8, window.innerWidth - 220),
          top: Math.max(8, Math.min(node.y, window.innerHeight - 150)),
          background: '#fff', border: '1px solid #ddd', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          padding: 12, zIndex: 2000, minWidth: 200, fontFamily: 'monospace', maxWidth: 260,
        }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
            <input defaultValue={node.name} autoFocus
              onBlur={e => { updateNode(node.id, { name: e.target.value.trim() || node.name }); }}
              onKeyDown={e => { if (e.key === 'Escape') setShowCard(false); }}
              style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={() => setShowCard(false)}
              style={{ background: '#222', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: 11, borderRadius: 2, fontFamily: 'inherit' }}>ОК</button>
          </div>
          <textarea defaultValue={node.description}
            onBlur={e => updateNode(node.id, { description: e.target.value })}
            placeholder="Описание..." rows={2}
            onKeyDown={e => { if (e.key === 'Escape') setShowCard(false); }}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 11, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: '#555', marginBottom: 8, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {['#faebd2', '#d2e4fa', '#d2fad9', '#fad2d2', '#e8d2fa', '#faf2d2'].map(c => (
              <div key={c} onClick={() => updateNode(node.id, { zoneColor: node.zoneColor === c ? undefined : c })}
                style={{
                  width: 20, height: 20, borderRadius: 3, cursor: 'pointer',
                  background: c, border: node.zoneColor === c ? '2px solid #222' : '1px solid #ddd',
                }} />
            ))}
          </div>
          <button onClick={() => { deleteNode(node.id); setShowCard(false); }}
            style={{ background: 'none', border: '1px solid #ddd', borderRadius: 2, cursor: 'pointer', fontSize: 11, padding: '2px 8px', color: '#c00', fontFamily: 'inherit', width: '100%' }}>✕ Удалить</button>
        </div>
      )}
    </div>
  );
}

function Canvas() {
  const visibleNodes = useGraph(s => s.visibleNodes);
  const allNodes = useGraph(s => s.nodes);
  const navStack = useGraph(s => s.navStack);
  const selectedIds = useGraph(s => s.selectedIds);
  const selectNode = useGraph(s => s.selectNode);
  const toggleSelectNode = useGraph(s => s.toggleSelectNode);
  const clearSelection = useGraph(s => s.clearSelection);
  const moveNode = useGraph(s => s.moveNode);
  const updateNode = useGraph(s => s.updateNode);
  const deleteNode = useGraph(s => s.deleteNode);
  const startSession = useGraph(s => s.startSession);

  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [reconnectingConnection, setReconnectingConnection] = useState<string | null>(null);
  const [connMenu, setConnMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const hyperspaceDragRef = useRef<{
    pointerId: number; ids: string[]; startPos: Record<string, { x: number; y: number }>;
    sx: number; sy: number; moved: boolean;
  } | null>(null);
  const lastClick = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  const nodes = visibleNodes();
  const isRoot = navStack.length === 0;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const t = e.target as HTMLElement;
    if (t === canvasRef.current || t.dataset?.canvas) {
      setMenuPos({ x: e.clientX, y: e.clientY });
      setCardId(null);
    }
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t === canvasRef.current || t.dataset?.canvas) {
      clearSelection();
      setCardId(null);
      setSelectedConnection(null);
      setReconnectingConnection(null);
      setConnMenu(null);
      if (connectSource) setConnectSource(null);
    }
  }, [clearSelection, connectSource]);

  const handleConnectClick = useCallback((nodeId: string) => {
    if (!connectSource) {
      setConnectSource(nodeId);
    } else if (connectSource === nodeId) {
      setConnectSource(null);
    } else {
      useGraph.getState().addConnection(connectSource, nodeId);
      setConnectSource(null);
    }
  }, [connectSource]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reconnectingConnection) { setReconnectingConnection(null); return; }
        if (connectMode) { setConnectMode(false); setConnectSource(null); return; }
        if (menuPos) { setMenuPos(null); return; }
        if (cardId) { setCardId(null); return; }
        if (selectedConnection) { setSelectedConnection(null); return; }
        if (connMenu) { setConnMenu(null); return; }
        useGraph.getState().goBack();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !cardId) {
        if (selectedConnection) {
          useGraph.getState().removeConnection(selectedConnection);
          setSelectedConnection(null);
        } else if (selectedIds.length > 0) {
          selectedIds.forEach(id => useGraph.getState().deleteNode(id));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [menuPos, cardId, selectedIds, connectMode, selectedConnection, connMenu, reconnectingConnection]);

  if (isRoot) {
    const spaces = nodes;
    const dragRef = hyperspaceDragRef;

    return (
      <div ref={canvasRef} data-canvas onClick={handleCanvasClick} onContextMenu={handleContextMenu}
        style={{ position: 'relative', width: '100%', flex: 1, overflow: 'hidden' }}>
        {spaces.length === 0 && !menuPos && (
          <div data-canvas style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ccc', fontSize: 16, cursor: 'pointer', userSelect: 'none', fontFamily: 'monospace', letterSpacing: 1,
          }}>Нажмите правой кнопкой, чтобы создать пространство</div>
        )}
        {spaces.map(space => {
          const isSelected = selectedIds.includes(space.id);
          const glow = isSelected ? `0 0 0 2px ${COLORS.space}` : `0 0 0 1px transparent`;

          return (
            <div key={space.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                const now = Date.now();
                if (now - lastClick.current.time < 300 && lastClick.current.id === space.id) {
                  setMenuPos(null);
                  useGraph.getState().diveIn(space.id);
                  lastClick.current = { id: '', time: 0 };
                  return;
                }
                lastClick.current = { id: space.id, time: now };
                if (!isSelected) {
                  selectNode(space.id);
                } else if (e.shiftKey) {
                  toggleSelectNode(space.id);
                }
                const curSelected = useGraph.getState().selectedIds;
                const ids = curSelected.length > 0 ? curSelected : [space.id];
                dragRef.current = {
                  pointerId: e.pointerId, ids,
                  startPos: Object.fromEntries(ids.map(id => [id, { x: allNodes[id]?.x ?? 0, y: allNodes[id]?.y ?? 0 }])),
                  sx: e.clientX, sy: e.clientY, moved: false,
                };
              }}
              onPointerMove={(e) => {
                const dr = dragRef.current;
                if (!dr) return;
                const dx = e.clientX - dr.sx, dy = e.clientY - dr.sy;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dr.moved = true;
                if (!dr.moved) return;
                dr.ids.forEach(id => {
                  const sp = dr.startPos[id];
                  if (sp) moveNode(id, sp.x + dx, sp.y + dy);
                });
              }}
              onPointerUp={(e) => {
                const dr = dragRef.current;
                if (!dr || dr.pointerId !== e.pointerId) { dragRef.current = null; return; }
                if (!dr.moved && e.button === 2) {
                  setCardId(space.id);
                }
                dragRef.current = null;
              }}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCardId(space.id); }}
              style={{
                position: 'absolute', left: space.x - NODE_SIZE / 2, top: space.y - NODE_SIZE / 2,
                width: NODE_SIZE, height: NODE_SIZE, cursor: 'default', userSelect: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                boxShadow: glow, borderRadius: 2, padding: 2,
                transition: 'left 0.2s ease, top 0.2s ease, opacity 0.15s ease, box-shadow 0.15s ease',
              }}>
              <NodeShape type="space" />
              <span style={{ fontSize: 11, color: COLORS.space, maxWidth: NODE_SIZE + 20, textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>{space.name}</span>
            </div>
          );
        })}
        {spaces.map(space => {
          if (cardId !== space.id) return null;
          return (
            <div key={`card-${space.id}`} style={{
              position: 'fixed', left: Math.min(space.x + NODE_SIZE / 2 + 8, window.innerWidth - 220),
              top: Math.max(8, Math.min(space.y - NODE_SIZE / 2, window.innerHeight - 150)),
              background: '#fff', border: '1px solid #ddd', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              padding: 12, zIndex: 2000, minWidth: 200, fontFamily: 'monospace', maxWidth: 260,
            }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                <input defaultValue={space.name}
                  onBlur={e => { updateNode(space.id, { name: e.target.value.trim() || space.name }); }}
                  onKeyDown={e => { if (e.key === 'Escape') setCardId(null); }}
                  autoFocus
                  style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                <button onClick={() => setCardId(null)}
                  style={{ background: '#222', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: 11, borderRadius: 2, fontFamily: 'inherit' }}>ОК</button>
              </div>
              <textarea defaultValue={space.description}
                onBlur={e => updateNode(space.id, { description: e.target.value })}
                placeholder="Описание..." rows={2}
                onKeyDown={e => { if (e.key === 'Escape') setCardId(null); }}
                style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 2, fontSize: 11, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: '#555', marginBottom: 8, boxSizing: 'border-box' }} />
              <button onClick={() => { deleteNode(space.id); setCardId(null); }}
                style={{ background: 'none', border: '1px solid #ddd', borderRadius: 2, cursor: 'pointer', fontSize: 11, padding: '2px 8px', color: '#c00', fontFamily: 'inherit' }}>✕ Удалить</button>
            </div>
          );
        })}
        {menuPos && <CreateMenu x={menuPos.x} y={menuPos.y} onClose={() => setMenuPos(null)} />}
      </div>
    );
  }

  const zones = nodes.filter(n => n.type === 'zone');
  const focuses = nodes.filter(n => n.type === 'focus');
  const acts = nodes.filter(n => n.type === 'act');
  const precedents = nodes.filter(n => n.type === 'precedent');
  const scenarios = nodes.filter(n => n.type === 'scenario');
  const forms = nodes.filter(n => n.type === 'form');
  const allNodeIds = new Set(nodes.map(n => n.id));

  const formsByFocus: Record<string, GraphNode[]> = {};
  forms.forEach(f => {
    const fid = f.parentFocusId || '_none';
    if (!formsByFocus[fid]) formsByFocus[fid] = [];
    formsByFocus[fid].push(f);
  });

  const actsByForm: Record<string, GraphNode[]> = {};
  const orphanActs: GraphNode[] = [];
  acts.forEach(a => {
    if (a.parentFormId) {
      if (!actsByForm[a.parentFormId]) actsByForm[a.parentFormId] = [];
      actsByForm[a.parentFormId].push(a);
    } else if (!a.parentFocusId) { orphanActs.push(a); }
  });

  const actsByFocus: Record<string, GraphNode[]> = {};
  const focusOrphanActs: GraphNode[] = [];
  acts.forEach(a => {
    if (a.parentFocusId) {
      if (!actsByFocus[a.parentFocusId]) actsByFocus[a.parentFocusId] = [];
      actsByFocus[a.parentFocusId].push(a);
    } else if (!a.parentFormId) { focusOrphanActs.push(a); }
  });

  const precedentsByAct: Record<string, GraphNode[]> = {};
  precedents.forEach(p => {
    const pid = p.parentActId || '_none';
    if (!precedentsByAct[pid]) precedentsByAct[pid] = [];
    precedentsByAct[pid].push(p);
  });

  const scenariosByAct: Record<string, GraphNode[]> = {};
  scenarios.forEach(s => {
    const pid = s.parentActId || '_none';
    if (!scenariosByAct[pid]) scenariosByAct[pid] = [];
    scenariosByAct[pid].push(s);
  });

  const allNodesArr = Object.values(allNodes);

  const handleReconnect = useCallback((nodeId: string) => {
    if (reconnectingConnection) {
      const conn = useGraph.getState().connections.find(c => c.id === reconnectingConnection);
      if (conn && conn.toId !== nodeId && conn.fromId !== nodeId) {
        useGraph.getState().updateConnection(reconnectingConnection, { toId: nodeId });
      }
      setReconnectingConnection(null);
    } else if (selectedConnection) {
      const conn = useGraph.getState().connections.find(c => c.id === selectedConnection);
      if (conn && conn.toId !== nodeId && conn.fromId !== nodeId) {
        useGraph.getState().updateConnection(selectedConnection, { toId: nodeId });
      }
      setSelectedConnection(null);
    }
  }, [selectedConnection, reconnectingConnection]);

  const connectProps = { connectMode, connectSource, onConnectClick: handleConnectClick,
    selectedConnection, onReconnect: handleReconnect };

  return (
    <div ref={canvasRef} data-canvas onClick={handleCanvasClick} onContextMenu={handleContextMenu}
      style={{ position: 'relative', width: '100%', flex: 1, overflow: 'hidden' }}>
      <ConnectionLines nodeIds={allNodeIds} visibleNodes={nodes}
        selectedConnection={selectedConnection}
        onSelectConnection={(id) => { setSelectedConnection(id); setConnMenu(null); }}
        onConnectionContextMenu={(id, e) => { setSelectedConnection(id); setConnMenu({ id, x: e.clientX, y: e.clientY }); }} />

      {nodes.length === 0 && !menuPos && (
        <div data-canvas style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ccc', fontSize: 16, cursor: 'pointer', userSelect: 'none', fontFamily: 'monospace', letterSpacing: 1,
        }}>Нажмите правой кнопкой, чтобы создать элемент</div>
      )}

      {zones.map(zone => (
        <ZoneNode key={zone.id} node={zone} allNodes={allNodesArr} />
      ))}

      {focuses.map(focus => (
        <FocusNode key={focus.id} focus={focus} forms={formsByFocus[focus.id] || []}
          actsByForm={actsByForm} orphanActs={orphanActs}
          onActSession={(actId) => startSession(actId)} allNodes={allNodesArr}
          {...connectProps} />
      ))}

      {forms.map(form => (
        <FormNode key={form.id} form={form} allNodes={allNodesArr} {...connectProps} />
      ))}

      {acts.map(act => (
        <ActNode key={act.id} act={act}
          precedents={precedentsByAct[act.id] || []}
          scenarios={scenariosByAct[act.id] || []}
          onActSession={(actId) => startSession(actId)} allNodes={allNodesArr}
          {...connectProps} />
      ))}

      {precedents.map(p => (
        <SmallNode key={p.id} node={p} allNodes={allNodesArr} {...connectProps} />
      ))}

      {scenarios.map(s => (
        <SmallNode key={s.id} node={s} allNodes={allNodesArr} {...connectProps} />
      ))}

      {menuPos && <CreateMenu x={menuPos.x} y={menuPos.y} onClose={() => setMenuPos(null)} />}
      {!isRoot && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
          <button onClick={() => { setConnectMode(!connectMode); if (connectMode) setConnectSource(null); }}
            style={{
              background: connectMode ? '#222' : '#fff', color: connectMode ? '#fff' : '#888',
              border: '1px solid #ddd', borderRadius: 3, cursor: 'pointer', fontSize: 11,
              padding: '4px 10px', fontFamily: 'monospace', letterSpacing: 1,
            }}>🔗 {connectMode ? (connectSource ? 'Выберите цель' : 'Выберите источник') : 'СВЯЗИ'}</button>
        </div>
      )}
      {connMenu && (
        <div style={{
          position: 'fixed', left: connMenu.x, top: connMenu.y, zIndex: 3000,
          background: '#fff', border: '1px solid #ddd', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          padding: 4, fontFamily: 'monospace',
        }}>
          <button onClick={() => {
            setReconnectingConnection(connMenu.id);
            setConnMenu(null);
          }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '4px 8px', color: '#666', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}>
            ⟳ Переподключить
          </button>
          <button onClick={() => {
            useGraph.getState().removeConnection(connMenu.id);
            setConnMenu(null);
            setSelectedConnection(null);
          }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '4px 8px', color: '#c00', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}>✕ Удалить связь</button>
        </div>
      )}
    </div>
  );
}

function SessionView() {
  const nodes = useGraph(s => s.nodes);
  const sessionActId = useGraph(s => s.sessionActId);
  const sessionStart = useGraph(s => s.sessionStart);
  const connections = useGraph(s => s.connections);
  const endSession = useGraph(s => s.endSession);
  const cancelSession = useGraph(s => s.cancelSession);
  const completeAct = useGraph(s => s.completeAct);
  const createPrecedent = useGraph(s => s.createPrecedent);

  const [elapsed, setElapsed] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<'success' | 'failure'>('success');
  const [notes, setNotes] = useState('');
  const [showPrecedentOption, setShowPrecedentOption] = useState(false);

  useEffect(() => {
    if (!sessionStart) return;
    const tick = () => setElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [sessionStart]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !showResult) cancelSession(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showResult, cancelSession]);

  if (!sessionActId) return null;
  const act = nodes[sessionActId];
  if (!act) return null;

  const linked = connections.filter(c => c.fromId === act.id || c.toId === act.id)
    .map(c => nodes[c.fromId === act.id ? c.toId : c.fromId]).filter(Boolean);

  const fmt = (s: number) => { const m = Math.floor(s / 60), sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; };

  if (showResult) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ width: 320, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>Завершить акт</div>
          <div style={{ fontSize: 20, color: '#222', fontWeight: 600, marginBottom: 16 }}>{act.name}</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Время: {fmt(elapsed)}</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
            <button onClick={() => setResult('success')} style={{
              padding: '10px 24px', border: result === 'success' ? '2px solid #222' : '1px solid #ddd',
              borderRadius: 4, background: result === 'success' ? '#f5f5f5' : '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', color: '#222',
            }}>✓ Успех</button>
            <button onClick={() => setResult('failure')} style={{
              padding: '10px 24px', border: result === 'failure' ? '2px solid #c00' : '1px solid #ddd',
              borderRadius: 4, background: result === 'failure' ? '#fff5f5' : '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', color: '#c00',
            }}>✗ Неуспех</button>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Заметки..." rows={3}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 2, fontSize: 12, fontFamily: 'inherit', outline: 'none', resize: 'vertical', color: '#555', marginBottom: 16, boxSizing: 'border-box' }} />
          <button onClick={() => {
            endSession(result, notes);
            if (result === 'success') setShowPrecedentOption(true);
            else setShowPrecedentOption(false);
          }}
            style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 3, padding: '10px 28px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Сохранить в архив</button>
          {showPrecedentOption && (
            <div style={{ marginTop: 12 }}>
              <button onClick={() => { createPrecedent(act.id); setShowPrecedentOption(false); }}
                style={{ background: 'none', border: '1px solid #ddd', borderRadius: 3, cursor: 'pointer', fontSize: 12, padding: '8px 20px', color: '#666', fontFamily: 'inherit' }}>● Создать прецедент</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 5000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>Сессия</div>
        <div style={{ fontSize: 28, color: '#222', fontWeight: 600, marginBottom: 24 }}>{act.name}</div>
        {act.description && <div style={{ fontSize: 13, color: '#888', marginBottom: 24, maxWidth: 400, lineHeight: 1.5 }}>{act.description}</div>}
        {act.steps.length > 0 && (
          <div style={{ marginBottom: 24, textAlign: 'left', maxWidth: 300 }}>
            <div style={{ fontSize: 11, color: '#bbb', marginBottom: 6 }}>ШАГИ</div>
            {act.steps.map((step, i) => (
              <div key={i} style={{ fontSize: 12, color: '#666', marginTop: 3, display: 'flex', gap: 6 }}>
                <span style={{ color: '#ccc' }}>{i + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 48, color: '#222', fontWeight: 300, marginBottom: 40, fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</div>
        {linked.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: '#bbb', marginBottom: 6 }}>СВЯЗАНО</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {linked.map(l => <span key={l.id} style={{ padding: '4px 12px', border: '1px solid #eee', borderRadius: 3, fontSize: 12, color: '#666' }}>{l.name}</span>)}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => setShowResult(true)} style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 3, padding: '12px 36px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>Завершить</button>
          <button onClick={cancelSession} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 3, padding: '12px 24px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', color: '#666' }}>Отмена (Esc)</button>
        </div>
      </div>
    </div>
  );
}

function ArchiveView({ onBack }: { onBack: () => void }) {
  const archives = useGraph(s => s.archives);
  const deleteArchive = useGraph(s => s.deleteArchive);
  const sorted = [...archives].sort((a, b) => b.completedAt - a.completedAt);
  const fmt = (s: number) => { const m = Math.floor(s / 60), sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'monospace' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid #eee', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 3, cursor: 'pointer', fontSize: 11, padding: '4px 10px', color: '#666', fontFamily: 'inherit' }}>← Назад</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#222', letterSpacing: 1 }}>АРХИВ</span>
      </header>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {sorted.length === 0 && <div style={{ textAlign: 'center', color: '#ccc', fontSize: 14, marginTop: 60 }}>Архив пуст</div>}
        {sorted.map(a => (
          <div key={a.id} style={{ border: '1px solid #eee', borderRadius: 3, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: a.result === 'success' ? '#222' : '#c00', padding: '2px 8px', borderRadius: 2 }}>
              {a.result === 'success' ? '✓' : '✗'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>{a.actName}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{a.spaceName && `${a.spaceName} · `}{fmt(a.duration)} · {new Date(a.completedAt).toLocaleDateString()}</div>
              {a.notes && <div style={{ fontSize: 11, color: '#888', marginTop: 4, lineHeight: 1.4 }}>{a.notes}</div>}
            </div>
            <button onClick={() => deleteArchive(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ccc', fontFamily: 'inherit' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Canvas crashed:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', color: '#c00' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>⚠ Ошибка</div>
          <pre style={{ fontSize: 12, color: '#555', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ marginTop: 12, background: '#222', color: '#fff', border: 'none', borderRadius: 3, padding: '8px 20px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const navStack = useGraph(s => s.navStack);
  const sessionActId = useGraph(s => s.sessionActId);
  const [showArchive, setShowArchive] = useState(false);

  if (showArchive) return <ArchiveView onBack={() => setShowArchive(false)} />;
  if (sessionActId) return <SessionView />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff' }}>
      <Header onArchive={() => setShowArchive(true)} />
      <ErrorBoundary><Canvas /></ErrorBoundary>
    </div>
  );
}
