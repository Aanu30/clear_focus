import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip,
} from "recharts";
import {
  Home, Play, Square, Calendar as Cal, Layers, Target, BarChart3, LogOut,
  Plus, Minus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight, Flame, ShieldCheck,
} from "lucide-react";

// ---------------------------------------------------------------- theme
const T = {
  bg: "#0a0a0c", sidebar: "#0c0c0f", card: "#141518", card2: "#1a1c21",
  line: "#24262b", text: "#f3f4f6", muted: "#8b8f98", faint: "#565a63",
  green: "#86efac", greenDim: "#3f6b4f", greenInk: "#062012", active: "#1b2531",
};
const PALETTE = ["#60a5fa", "#f87171", "#a78bfa", "#fbbf24", "#34d399", "#f472b6", "#38bdf8", "#fb923c"];
const F = "'Inter', system-ui, -apple-system, sans-serif";

// ---------------------------------------------------------------- default state
const DEFAULT = {
  categories: [
    { id: "ma222", name: "MA222", color: "#60a5fa" },
    { id: "ma214", name: "MA214", color: "#f87171" },
  ],
  tasks: [],
  sessions: [],
  goals: [
    { id: "g-daily", scope: "overall", categoryId: null, period: "daily", targetMin: 360 },
    { id: "g-weekly", scope: "overall", categoryId: null, period: "weekly", targetMin: 2400 },
    { id: "g-ma222", scope: "category", categoryId: "ma222", period: "weekly", targetMin: 1200 },
    { id: "g-ma214", scope: "category", categoryId: "ma214", period: "weekly", targetMin: 1200 },
  ],
};

// ---------------------------------------------------------------- date helpers
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const mondayOf = (d) => { const x = startOfDay(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; };
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
const sameWeek = (a, b) => mondayOf(a).getTime() === mondayOf(b).getTime();
const sameMonth = (a, b) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const sameYear = (a, b) => a.getFullYear() === b.getFullYear();
const fmtHM = (min) => { const m = Math.round(min); const h = Math.floor(m / 60), r = m % 60; if (h === 0) return `${r}m`; if (r === 0) return `${h}h`; return `${h}h ${r}m`; };
const fmtClock = (sec) => { const p = (n) => String(n).padStart(2, "0"); return `${p(Math.floor(sec / 3600))}:${p(Math.floor((sec % 3600) / 60))}:${p(sec % 60)}`; };
const WD = ["M", "T", "W", "T", "F", "S", "S"];
const WD_LONG = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------------------------------------------------------------- atoms
const Card = ({ children, style, className = "" }) => (
  <div className={"rounded-2xl " + className} style={{ background: T.card, border: `1px solid ${T.line}`, ...style }}>{children}</div>
);
const Eyebrow = ({ children }) => (
  <div style={{ fontSize: 11, letterSpacing: "0.14em", color: T.faint, textTransform: "uppercase", fontWeight: 600 }}>{children}</div>
);
const H1 = ({ children }) => (
  <h1 style={{ fontSize: 30, fontWeight: 700, color: T.text, margin: "6px 0 0", letterSpacing: "-0.02em" }}>{children}</h1>
);
const GreenBtn = ({ children, onClick, style }) => (
  <button onClick={onClick} className="flex items-center justify-center gap-2 rounded-full"
    style={{ background: T.green, color: T.greenInk, fontWeight: 600, fontFamily: F, ...style }}>{children}</button>
);
const IconBtn = ({ children, onClick, color }) => (
  <button onClick={onClick} style={{ color: color || T.faint, padding: 7, borderRadius: 8, background: "transparent", display: "flex" }}>{children}</button>
);
const ProgBar = ({ p, color = T.green, h = 8 }) => (
  <div style={{ width: "100%", height: h, borderRadius: 999, background: T.card2, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, p * 100)}%`, height: "100%", background: color, borderRadius: 999, transition: "width .5s ease" }} />
  </div>
);
const Ring = ({ p, size = 210, stroke = 14, children }) => {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, prog = Math.max(0, Math.min(1, p));
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.card2} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.green} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - prog)}
          style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
};

// ================================================================ app
export default function App() {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("today");
  const [mobile, setMobile] = useState(typeof window !== "undefined" && window.innerWidth < 820);

  // focus session
  const [fcat, setFcat] = useState("ma222");
  const [ftask, setFtask] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reminder, setReminder] = useState(false);
  const startRef = useRef(null);

  // calendar
  const [calMonth, setCalMonth] = useState(startOfDay(new Date()));
  const [calSel, setCalSel] = useState(startOfDay(new Date()));

  // load
  useEffect(() => {
    (async () => {
      let init = DEFAULT;
      try { const r = await window.storage.get("focus-state"); if (r && r.value) init = JSON.parse(r.value); } catch (e) {}
      setState(init); setLoaded(true);
      if (init.categories[0]) setFcat(init.categories[0].id);
    })();
  }, []);
  // persist
  useEffect(() => {
    if (!loaded || !state) return;
    (async () => { try { await window.storage.set("focus-state", JSON.stringify(state)); } catch (e) {} })();
  }, [state, loaded]);
  // timer
  useEffect(() => { if (!running) return; const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, [running]);
  // resize
  useEffect(() => { const h = () => setMobile(window.innerWidth < 820); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  if (!state) return <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontFamily: F }}>Loading…</div>;

  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  const now = new Date();
  const cats = state.categories;
  const catById = (id) => cats.find((c) => c.id === id);
  const validSessions = state.sessions.filter((s) => catById(s.categoryId));

  // aggregations
  const sumSec = (pred) => validSessions.filter(pred).reduce((a, s) => a + s.seconds, 0);
  const todaySec = sumSec((s) => sameDay(new Date(s.start), now));
  const weekSec = sumSec((s) => sameWeek(new Date(s.start), now));
  const monthSec = sumSec((s) => sameMonth(new Date(s.start), now));
  const yearSec = sumSec((s) => sameYear(new Date(s.start), now));

  const goalActualSec = (g) => {
    const inPeriod = (s) => {
      const d = new Date(s.start);
      return g.period === "daily" ? sameDay(d, now) : g.period === "weekly" ? sameWeek(d, now) : g.period === "monthly" ? sameMonth(d, now) : sameYear(d, now);
    };
    return sumSec((s) => inPeriod(s) && (g.scope === "overall" || s.categoryId === g.categoryId));
  };
  const dailyGoal = state.goals.find((g) => g.scope === "overall" && g.period === "daily");
  const weeklyGoal = state.goals.find((g) => g.scope === "overall" && g.period === "weekly");

  // streak
  const streak = (() => {
    let n = 0; const d = startOfDay(now);
    for (;;) { const has = validSessions.some((s) => sameDay(new Date(s.start), d)); if (!has) break; n++; d.setDate(d.getDate() - 1); }
    return n;
  })();

  const perDayWeek = WD.map((lbl, i) => {
    const day = mondayOf(now); day.setDate(day.getDate() + i);
    const sec = sumSec((s) => sameDay(new Date(s.start), day));
    return { day: lbl, hours: +(sec / 3600).toFixed(2), today: sameDay(day, now) };
  });
  const perCat = (pred) => cats.map((c) => ({ ...c, sec: sumSec((s) => s.categoryId === c.id && pred(s)) })).filter((c) => c.sec > 0);
  const monthDays = (() => {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
      return { day: i + 1, hours: +(sumSec((s) => sameDay(new Date(s.start), d)) / 3600).toFixed(2) };
    });
  })();

  // actions
  const startFocus = () => {
    const cid = catById(fcat) ? fcat : cats[0]?.id; if (!cid) return;
    setFcat(cid); setElapsed(0); startRef.current = new Date().toISOString(); setRunning(true); setReminder(true); setTab("focus");
  };
  const stopFocus = () => {
    if (elapsed >= 1) set({ sessions: [...state.sessions, { id: "s" + Date.now(), categoryId: fcat, taskId: ftask || null, start: startRef.current, seconds: elapsed }] });
    setRunning(false); setElapsed(0); setReminder(false); setTab("today");
  };

  // ---------------------------------------------------------------- TODAY
  const Today = () => (
    <>
      <Eyebrow>Today</Eyebrow>
      <H1>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</H1>
      <div className="flex flex-col gap-4" style={{ marginTop: 22, maxWidth: 620 }}>
        <Card style={{ padding: "28px 0", display: "flex", justifyContent: "center" }}>
          <Ring p={dailyGoal ? todaySec / 60 / (dailyGoal.targetMin) : 0}>
            <div style={{ fontSize: 44, fontWeight: 700, color: T.text, lineHeight: 1 }}>{fmtHM(todaySec / 60)}</div>
            {dailyGoal ? (
              <>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>of {fmtHM(dailyGoal.targetMin)} today</div>
                <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{fmtHM(Math.max(0, dailyGoal.targetMin - todaySec / 60))} to go</div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>No daily target · <button onClick={() => setTab("goals")} style={{ color: T.green, background: "none" }}>Set one</button></div>
            )}
          </Ring>
        </Card>

        <GreenBtn onClick={startFocus} style={{ padding: 17, fontSize: 16, width: "100%" }}><Play size={18} fill={T.greenInk} /> Start focus session</GreenBtn>

        <Card style={{ padding: 18 }}>
          <Eyebrow>This week</Eyebrow>
          <div style={{ fontSize: 30, fontWeight: 700, color: T.text, margin: "6px 0 12px" }}>{fmtHM(weekSec / 60)}</div>
          <ProgBar p={weeklyGoal ? weekSec / 60 / weeklyGoal.targetMin : 0} />
          <div style={{ fontSize: 12, color: T.muted, marginTop: 10 }}>
            {weeklyGoal ? `${fmtHM(weekSec / 60)} of ${fmtHM(weeklyGoal.targetMin)}` : <>No weekly target · <button onClick={() => setTab("goals")} style={{ color: T.green, background: "none" }}>Set one</button></>}
          </div>
        </Card>

        <div className="flex gap-4">
          <Card style={{ padding: 18, flex: 1 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}><Flame size={15} color={T.green} /><span style={{ fontSize: 12, color: T.muted }}>Streak</span></div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.text }}>{streak}<span style={{ fontSize: 13, color: T.faint, fontWeight: 400 }}> days</span></div>
          </Card>
          <Card style={{ padding: 18, flex: 1 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}><BarChart3 size={15} color={T.muted} /><span style={{ fontSize: 12, color: T.muted }}>Sessions</span></div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.text }}>{validSessions.filter((s) => sameDay(new Date(s.start), now)).length}<span style={{ fontSize: 13, color: T.faint, fontWeight: 400 }}> today</span></div>
          </Card>
        </div>

        <Card style={{ padding: 18 }}>
          <Eyebrow>Today by category</Eyebrow>
          <div className="flex flex-col gap-3" style={{ marginTop: 14 }}>
            {cats.map((c) => {
              const sec = sumSec((s) => s.categoryId === c.id && sameDay(new Date(s.start), now));
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
                    <span className="flex items-center gap-2" style={{ fontSize: 13, color: T.text }}><span style={{ width: 9, height: 9, borderRadius: 999, background: c.color }} />{c.name}</span>
                    <span style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{fmtHM(sec / 60)}</span>
                  </div>
                  <ProgBar p={todaySec > 0 ? sec / todaySec : 0} color={c.color} h={5} />
                </div>
              );
            })}
            {cats.length === 0 && <div style={{ fontSize: 13, color: T.faint }}>No categories yet.</div>}
          </div>
        </Card>
      </div>
    </>
  );

  // ---------------------------------------------------------------- FOCUS
  const Focus = () => (
    <>
      <Eyebrow>Focus</Eyebrow>
      <H1>New session</H1>
      <div className="flex flex-col gap-4" style={{ marginTop: 22, maxWidth: 620 }}>
        {reminder && running && (
          <Card style={{ padding: 14, background: "#16202e", border: "1px solid #2b3a4f" }}>
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} color={T.green} style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Start your blocker now</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Open ScreenZen or Opal to block distracting apps for this session.</div>
              </div>
              <IconBtn onClick={() => setReminder(false)}><X size={16} /></IconBtn>
            </div>
          </Card>
        )}

        {!running && (
          <Card style={{ padding: 20 }}>
            <Eyebrow>Category</Eyebrow>
            <select value={fcat} onChange={(e) => { setFcat(e.target.value); setFtask(""); }}
              style={{ width: "100%", marginTop: 8, marginBottom: 18, background: T.card2, color: T.text, border: `1px solid ${T.green}`, borderRadius: 12, padding: "12px 14px", fontFamily: F, fontSize: 15, outline: "none" }}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Eyebrow>Task (optional)</Eyebrow>
            <select value={ftask} onChange={(e) => setFtask(e.target.value)}
              style={{ width: "100%", marginTop: 8, background: T.card2, color: T.text, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 14px", fontFamily: F, fontSize: 15, outline: "none" }}>
              <option value="">None</option>
              {state.tasks.filter((t) => t.categoryId === fcat).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Card>
        )}

        <Card style={{ padding: "36px 20px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {running && <span className="flex items-center gap-2" style={{ fontSize: 14, color: T.muted, marginBottom: 18 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: catById(fcat)?.color }} />{catById(fcat)?.name}</span>}
          <div style={{ fontSize: 52, fontWeight: 700, color: T.text, letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" }}>{fmtClock(elapsed)}</div>
          {running
            ? <button onClick={stopFocus} className="flex items-center justify-center gap-2 rounded-full" style={{ marginTop: 22, width: "100%", padding: 15, background: T.card2, color: T.text, border: `1px solid ${T.line}`, fontWeight: 600, fontFamily: F, fontSize: 16 }}><Square size={15} fill={T.text} /> Stop &amp; save</button>
            : <GreenBtn onClick={startFocus} style={{ marginTop: 22, width: "100%", padding: 15, fontSize: 16 }}><Play size={18} fill={T.greenInk} /> Start</GreenBtn>}
        </Card>
      </div>
    </>
  );

  // ---------------------------------------------------------------- CALENDAR
  const Calendar = () => {
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const daysIn = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysIn; d++) cells.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), d));
    const daySessions = validSessions.filter((s) => sameDay(new Date(s.start), calSel));
    return (
      <>
        <Eyebrow>Calendar</Eyebrow>
        <H1>{calSel.toLocaleDateString("en-GB", { weekday: "long", month: "short", day: "numeric" })}</H1>
        <div className="flex flex-col gap-4" style={{ marginTop: 22, maxWidth: 720 }}>
          <Card style={{ padding: 18 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <IconBtn onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} color={T.text}><ChevronLeft size={18} /></IconBtn>
              <span style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{calMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
              <IconBtn onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} color={T.text}><ChevronRight size={18} /></IconBtn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
              {WD.map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 11, color: T.faint, paddingBottom: 4 }}>{d}</div>)}
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const sec = sumSec((s) => sameDay(new Date(s.start), d));
                const isSel = sameDay(d, calSel), isToday = sameDay(d, now);
                return (
                  <button key={i} onClick={() => setCalSel(d)}
                    style={{ aspectRatio: "1", borderRadius: 12, background: isSel ? T.green : T.card2, color: isSel ? T.greenInk : T.text, border: isToday && !isSel ? `1px solid ${T.green}` : "1px solid transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, fontFamily: F }}>
                    {d.getDate()}
                    {sec > 0 && <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.8 }}>{fmtHM(sec / 60)}</span>}
                  </button>
                );
              })}
            </div>
          </Card>
          <Card style={{ padding: 18 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{calSel.toLocaleDateString("en-GB", { weekday: "long", month: "short", day: "numeric" })}</span>
              <span style={{ fontSize: 14, color: T.muted, fontWeight: 600 }}>{fmtHM(daySessions.reduce((a, s) => a + s.seconds, 0) / 60)}</span>
            </div>
            {daySessions.length === 0 ? <div style={{ fontSize: 13, color: T.faint }}>No sessions logged.</div> :
              daySessions.map((s) => {
                const c = catById(s.categoryId); const t = state.tasks.find((x) => x.id === s.taskId);
                return (
                  <div key={s.id} className="flex items-center justify-between" style={{ padding: "8px 0", borderTop: `1px solid ${T.line}` }}>
                    <span className="flex items-center gap-2" style={{ fontSize: 13, color: T.text }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: c?.color }} />{c?.name}{t && <span style={{ color: T.faint }}> · {t.name}</span>}
                      <span style={{ color: T.faint, fontSize: 12 }}>{new Date(s.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                    </span>
                    <span style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{fmtHM(s.seconds / 60)}</span>
                  </div>
                );
              })}
          </Card>
        </div>
      </>
    );
  };

  // ---------------------------------------------------------------- CATEGORIES
  const CategoriesScreen = () => {
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState("");
    const [editId, setEditId] = useState(null);
    const [editVal, setEditVal] = useState("");
    const [taskFor, setTaskFor] = useState(null);
    const [taskName, setTaskName] = useState("");
    const [taskMin, setTaskMin] = useState("");
    const addCat = () => { if (!name.trim()) return; set({ categories: [...cats, { id: "c" + Date.now(), name: name.trim(), color: PALETTE[cats.length % PALETTE.length] }] }); setName(""); setAdding(false); };
    const addTask = (cid) => { if (!taskName.trim()) return; set({ tasks: [...state.tasks, { id: "t" + Date.now(), categoryId: cid, name: taskName.trim(), estMin: taskMin ? +taskMin : null }] }); setTaskName(""); setTaskMin(""); setTaskFor(null); };
    const delCat = (cid) => set({ categories: cats.filter((c) => c.id !== cid), tasks: state.tasks.filter((t) => t.categoryId !== cid), goals: state.goals.filter((g) => g.categoryId !== cid) });
    return (
      <>
        <div className="flex items-start justify-between" style={{ maxWidth: 720 }}>
          <div><Eyebrow>Categories</Eyebrow><H1>What you focus on</H1></div>
          <GreenBtn onClick={() => setAdding((v) => !v)} style={{ padding: "9px 16px", fontSize: 14 }}><Plus size={16} /> New</GreenBtn>
        </div>
        <div className="flex flex-col gap-3" style={{ marginTop: 22, maxWidth: 720 }}>
          {adding && (
            <Card style={{ padding: 14 }}>
              <div className="flex gap-2">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} placeholder="Category name"
                  style={{ flex: 1, background: T.card2, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px", color: T.text, fontFamily: F, fontSize: 14, outline: "none" }} />
                <GreenBtn onClick={addCat} style={{ padding: "0 16px", fontSize: 14 }}>Add</GreenBtn>
              </div>
            </Card>
          )}
          {cats.map((c) => (
            <Card key={c.id} style={{ padding: 16 }}>
              <div className="flex items-center justify-between">
                {editId === c.id ? (
                  <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { set({ categories: cats.map((x) => x.id === c.id ? { ...x, name: editVal || x.name } : x) }); setEditId(null); } }}
                    style={{ flex: 1, background: T.card2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "6px 10px", color: T.text, fontFamily: F, fontSize: 15, outline: "none" }} />
                ) : (
                  <span className="flex items-center gap-3" style={{ fontSize: 16, color: T.text, fontWeight: 600 }}><span style={{ width: 11, height: 11, borderRadius: 999, background: c.color }} />{c.name}</span>
                )}
                <div className="flex items-center">
                  {editId === c.id
                    ? <IconBtn color={T.green} onClick={() => { set({ categories: cats.map((x) => x.id === c.id ? { ...x, name: editVal || x.name } : x) }); setEditId(null); }}><Check size={16} /></IconBtn>
                    : <IconBtn onClick={() => { setEditId(c.id); setEditVal(c.name); }}><Pencil size={15} /></IconBtn>}
                  <IconBtn onClick={() => delCat(c.id)}><Trash2 size={15} /></IconBtn>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                {state.tasks.filter((t) => t.categoryId === c.id).map((t) => (
                  <div key={t.id} className="flex items-center justify-between" style={{ padding: "6px 0" }}>
                    <span style={{ fontSize: 13, color: T.muted }}>{t.name}{t.estMin ? <span style={{ color: T.faint }}> · ~{t.estMin}m</span> : null}</span>
                    <IconBtn onClick={() => set({ tasks: state.tasks.filter((x) => x.id !== t.id) })}><Trash2 size={13} /></IconBtn>
                  </div>
                ))}
                {taskFor === c.id ? (
                  <div className="flex gap-2" style={{ marginTop: 6 }}>
                    <input autoFocus value={taskName} onChange={(e) => setTaskName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask(c.id)} placeholder="Task name"
                      style={{ flex: 1, background: T.card2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", color: T.text, fontFamily: F, fontSize: 13, outline: "none" }} />
                    <input value={taskMin} onChange={(e) => setTaskMin(e.target.value.replace(/\D/g, ""))} placeholder="min" style={{ width: 60, background: T.card2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", color: T.text, fontFamily: F, fontSize: 13, outline: "none" }} />
                    <IconBtn color={T.green} onClick={() => addTask(c.id)}><Check size={16} /></IconBtn>
                  </div>
                ) : (
                  <button onClick={() => { setTaskFor(c.id); setTaskName(""); setTaskMin(""); }} style={{ color: T.green, background: "none", fontSize: 13, marginTop: 6, fontFamily: F }}>+ Add task</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  };

  // ---------------------------------------------------------------- GOALS
  const GoalsScreen = () => {
    const [adding, setAdding] = useState(false);
    const [scope, setScope] = useState("overall");
    const [gcat, setGcat] = useState(cats[0]?.id || "");
    const [period, setPeriod] = useState("weekly");
    const [target, setTarget] = useState(600);
    const bump = (id, d) => set({ goals: state.goals.map((g) => g.id === id ? { ...g, targetMin: Math.max(30, g.targetMin + d) } : g) });
    const setPeriodOf = (id, p) => set({ goals: state.goals.map((g) => g.id === id ? { ...g, period: p } : g) });
    const addGoal = () => { set({ goals: [...state.goals, { id: "g" + Date.now(), scope, categoryId: scope === "category" ? gcat : null, period, targetMin: target }] }); setAdding(false); setTarget(600); };
    const periods = ["daily", "weekly", "monthly", "yearly"];
    return (
      <>
        <div className="flex items-start justify-between" style={{ maxWidth: 720 }}>
          <div><Eyebrow>Goals</Eyebrow><H1>Targets &amp; deadlines</H1></div>
          <GreenBtn onClick={() => setAdding((v) => !v)} style={{ padding: "9px 16px", fontSize: 14 }}><Plus size={16} /> New</GreenBtn>
        </div>
        <div className="flex flex-col gap-3" style={{ marginTop: 22, maxWidth: 720 }}>
          {adding && (
            <Card style={{ padding: 18 }}>
              <Eyebrow>Scope</Eyebrow>
              <div className="flex gap-2" style={{ margin: "8px 0 16px" }}>
                {["overall", "category"].map((s) => <Chip key={s} on={scope === s} onClick={() => setScope(s)}>{s === "overall" ? "Overall" : "Category"}</Chip>)}
              </div>
              {scope === "category" && (
                <>
                  <Eyebrow>Category</Eyebrow>
                  <select value={gcat} onChange={(e) => setGcat(e.target.value)} style={{ width: "100%", margin: "8px 0 16px", background: T.card2, color: T.text, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px", fontFamily: F, fontSize: 14, outline: "none" }}>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </>
              )}
              <Eyebrow>Period</Eyebrow>
              <div className="flex gap-2" style={{ margin: "8px 0 16px", flexWrap: "wrap" }}>
                {periods.map((p) => <Chip key={p} on={period === p} onClick={() => setPeriod(p)}>{p[0].toUpperCase() + p.slice(1)}</Chip>)}
              </div>
              <Eyebrow>Target</Eyebrow>
              <div className="flex items-center gap-3" style={{ margin: "8px 0 16px" }}>
                <Stepper onClick={() => setTarget((t) => Math.max(30, t - 30))}><Minus size={14} /></Stepper>
                <span style={{ fontSize: 18, fontWeight: 700, color: T.text, minWidth: 70, textAlign: "center" }}>{fmtHM(target)}</span>
                <Stepper onClick={() => setTarget((t) => t + 30)}><Plus size={14} /></Stepper>
              </div>
              <GreenBtn onClick={addGoal} style={{ padding: 12, width: "100%", fontSize: 15 }}>Add goal</GreenBtn>
            </Card>
          )}
          {state.goals.map((g) => {
            const c = g.categoryId ? catById(g.categoryId) : null;
            const actual = goalActualSec(g), color = c ? c.color : T.green, hit = actual / 60 >= g.targetMin;
            return (
              <Card key={g.id} style={{ padding: 18 }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
                      {c && <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />}{c ? c.name : "Overall"}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 3, textTransform: "capitalize" }}>{g.period}</div>
                  </div>
                  <div style={{ fontSize: 14, color: T.muted, fontWeight: 600 }}><span style={{ color: hit ? T.green : T.text }}>{fmtHM(actual / 60)}</span> of {fmtHM(g.targetMin)}</div>
                </div>
                <div style={{ margin: "14px 0 12px" }}><ProgBar p={g.targetMin ? actual / 60 / g.targetMin : 0} color={color} h={6} /></div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                    {periods.map((p) => <Chip key={p} small on={g.period === p} onClick={() => setPeriodOf(g.id, p)}>{p[0].toUpperCase() + p.slice(1)}</Chip>)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Stepper sm onClick={() => bump(g.id, -30)}><Minus size={12} /></Stepper>
                    <span style={{ fontSize: 13, color: T.text, fontWeight: 600, minWidth: 54, textAlign: "center" }}>{fmtHM(g.targetMin)}</span>
                    <Stepper sm onClick={() => bump(g.id, 30)}><Plus size={12} /></Stepper>
                    <IconBtn onClick={() => set({ goals: state.goals.filter((x) => x.id !== g.id) })}><Trash2 size={14} /></IconBtn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </>
    );
  };
  const Chip = ({ children, on, onClick, small }) => (
    <button onClick={onClick} style={{ background: on ? T.green : T.card2, color: on ? T.greenInk : T.muted, border: `1px solid ${on ? T.green : T.line}`, borderRadius: 999, padding: small ? "4px 10px" : "7px 14px", fontSize: small ? 11 : 13, fontWeight: 600, fontFamily: F }}>{children}</button>
  );
  const Stepper = ({ children, onClick, sm }) => (
    <button onClick={onClick} style={{ width: sm ? 28 : 32, height: sm ? 28 : 32, borderRadius: 8, background: T.card2, color: T.text, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</button>
  );

  // ---------------------------------------------------------------- STATS
  const Stats = () => (
    <>
      <Eyebrow>Stats</Eyebrow>
      <H1>Where your hours went</H1>
      <div className="flex flex-col gap-4" style={{ marginTop: 22, maxWidth: 760 }}>
        <div className="flex gap-4" style={{ flexWrap: "wrap" }}>
          {[["Today", todaySec], ["Week", weekSec], ["Month", monthSec]].map(([lbl, sec]) => (
            <Card key={lbl} style={{ padding: 18, flex: 1, minWidth: 130 }}>
              <Eyebrow>{lbl}</Eyebrow>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.text, marginTop: 6 }}>{fmtHM(sec / 60)}</div>
            </Card>
          ))}
        </div>

        <Card style={{ padding: "18px 14px 8px" }}>
          <div style={{ padding: "0 6px" }}><Eyebrow>Hours this week</Eyebrow></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={perDayWeek} margin={{ top: 12, right: 6, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: T.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.faint, fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,.03)" }} contentStyle={{ background: T.card2, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 12 }} labelStyle={{ color: T.muted }} itemStyle={{ color: T.text }} formatter={(v) => [`${v}h`, "Logged"]} />
              {dailyGoal && <ReferenceLine y={dailyGoal.targetMin / 60} stroke={T.greenDim} strokeDasharray="4 4" />}
              <Bar dataKey="hours" radius={[5, 5, 0, 0]} maxBarSize={30}>
                {perDayWeek.map((d, i) => <Cell key={i} fill={d.today ? T.green : T.greenDim} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {dailyGoal && <div style={{ fontSize: 11, color: T.faint, textAlign: "center", paddingBottom: 6 }}>dashed line = daily target ({fmtHM(dailyGoal.targetMin)})</div>}
        </Card>

        <CatBreakdown title="By category (this week)" data={perCat((s) => sameWeek(new Date(s.start), now))} total={weekSec} />

        <Card style={{ padding: "18px 14px 8px" }}>
          <div style={{ padding: "0 6px" }}><Eyebrow>Hours in {now.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</Eyebrow></div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={monthDays} margin={{ top: 12, right: 6, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: T.faint, fontSize: 10 }} axisLine={false} tickLine={false} ticks={[1, 5, 10, 15, 20, 25, 30]} interval={0} />
              <YAxis tick={{ fill: T.faint, fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,.03)" }} contentStyle={{ background: T.card2, border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 12 }} labelStyle={{ color: T.muted }} itemStyle={{ color: T.text }} formatter={(v) => [`${v}h`, "Logged"]} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={14} fill={T.green} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <CatBreakdown title="By category (this month)" data={perCat((s) => sameMonth(new Date(s.start), now))} total={monthSec} />
      </div>
    </>
  );
  const CatBreakdown = ({ title, data, total }) => (
    <Card style={{ padding: 18 }}>
      <Eyebrow>{title}</Eyebrow>
      <div className="flex flex-col gap-3" style={{ marginTop: 14 }}>
        {data.length === 0 ? <div style={{ fontSize: 13, color: T.faint }}>Nothing logged yet.</div> :
          data.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span className="flex items-center gap-2" style={{ fontSize: 13, color: T.text }}><span style={{ width: 9, height: 9, borderRadius: 999, background: c.color }} />{c.name}</span>
                <span style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{fmtHM(c.sec / 60)}</span>
              </div>
              <ProgBar p={total > 0 ? c.sec / total : 0} color={c.color} h={6} />
            </div>
          ))}
      </div>
    </Card>
  );

  // ---------------------------------------------------------------- chrome
  const NAV = [
    { id: "today", label: "Today", icon: Home },
    { id: "focus", label: "Focus", icon: Play },
    { id: "calendar", label: "Calendar", icon: Cal },
    { id: "categories", label: "Categories", icon: Layers },
    { id: "goals", label: "Goals", icon: Target },
    { id: "stats", label: "Stats", icon: BarChart3 },
  ];
  const screen = { today: <Today />, focus: <Focus />, calendar: <Calendar />, categories: <CategoriesScreen />, goals: <GoalsScreen />, stats: <Stats /> }[tab];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", fontFamily: F, color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;} button{cursor:pointer;border:none;} input::placeholder{color:${T.faint};}
        select{appearance:none;-webkit-appearance:none;} option{background:${T.card2};color:${T.text};}
        button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid ${T.green};outline-offset:2px;}
        ::-webkit-scrollbar{width:8px;height:8px;} ::-webkit-scrollbar-thumb{background:${T.line};border-radius:8px;}
        @media (prefers-reduced-motion: reduce){*{transition:none!important;}}
      `}</style>

      {!mobile && (
        <aside style={{ width: 250, flexShrink: 0, background: T.sidebar, borderRight: `1px solid ${T.line}`, padding: "26px 16px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, padding: "0 10px 24px" }}>Focus</div>
          <nav className="flex flex-col gap-1" style={{ flex: 1 }}>
            {NAV.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className="flex items-center gap-3 rounded-xl"
                style={{ padding: "11px 12px", background: tab === id ? T.active : "transparent", color: tab === id ? T.text : T.muted, fontSize: 15, fontWeight: 500, fontFamily: F, textAlign: "left" }}>
                <Icon size={19} /> {label}
              </button>
            ))}
          </nav>
          <button className="flex items-center gap-3" style={{ padding: "11px 12px", color: T.faint, background: "transparent", fontSize: 14, fontFamily: F }}><LogOut size={18} /> Sign out</button>
        </aside>
      )}

      <main style={{ flex: 1, padding: mobile ? "24px 18px 96px" : "40px 44px", overflowX: "hidden" }}>
        {mobile && <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Focus</div>}
        {screen}
      </main>

      {mobile && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(12,12,15,.95)", backdropFilter: "blur(8px)", borderTop: `1px solid ${T.line}`, display: "flex", justifyContent: "space-around", padding: "8px 0 10px" }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === id ? T.green : T.faint, background: "transparent", flex: 1 }}>
              <Icon size={20} /><span style={{ fontSize: 9, fontFamily: F }}>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
