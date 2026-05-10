import { useState, useRef, useEffect } from "react";
import { loadQuizDraft, saveQuizDraft, clearQuizDraft } from "./quiz-progress.js";

const TEAL = "#0d9488";
const SLATE = { background: "linear-gradient(135deg,#334155,#475569)" };
const pctCalc = (a, b) => b ? Math.round(a / b * 100) : 0;

// ─── GRAPH SVG DEFINITIONS ──────────────────────────────────────────────────
// Each graph: 100×80 viewBox, axes at x=12,y=68 to x=88,y=68 (x-axis) and x=12,y=8 to x=12,y=68 (y-axis)
const AXIS = `<line x1="12" y1="68" x2="88" y2="68" stroke="#94a3b8" stroke-width="1.5"/>
<line x1="12" y1="8" x2="12" y2="68" stroke="#94a3b8" stroke-width="1.5"/>
<text x="90" y="71" font-size="7" fill="#94a3b8">Activity</text>
<text x="2" y="7" font-size="7" fill="#94a3b8">$</text>`;

const GRAPHS_I = {
  A: { label:"A", path:`M14,60 Q35,30 86,18`, desc:"Concave down curve (diminishing marginal cost)" },
  B: { label:"B", path:`M14,38 L86,38`, desc:"Horizontal line (constant total cost)" },
  C: { label:"C", path:`M14,62 L30,62 L30,50 L46,50 L46,40 L62,40 L62,30 L78,30 L78,20 L86,20`, desc:"Step function (staircase up)" },
  D: { label:"D", path:`M14,56 L86,18`, desc:"Semi-variable (positive y-intercept + slope)" },
  E: { label:"E", path:`M14,68 L86,12`, desc:"Linear from origin (pure variable)" },
  F: { label:"F", path:`M14,65 Q55,65 86,12`, desc:"Concave up curve (accelerating cost increase)" },
  G: { label:"G", path:`M14,62 L34,48 L56,38 L86,24`, desc:"Piece-wise with decreasing slopes (quantity discounts)" },
  H: { label:"H", path:`M14,38 L48,38 L86,10`, desc:"Horizontal then increasing (flat fee + variable after threshold)" },
};

const GRAPHS_II = {
  A: { label:"A", path:`M14,68 L86,12`, desc:"Linear from origin" },
  B: { label:"B", path:`M14,38 L86,38`, desc:"Horizontal (fixed)" },
  C: { label:"C", path:`M14,62 L30,62 L30,50 L46,50 L46,40 L62,40 L62,30 L78,30 L78,20 L86,20`, desc:"Step function" },
  D: { label:"D", path:`M14,56 L86,18`, desc:"Semi-variable (intercept + slope)" },
  E: { label:"E", path:`M14,60 Q35,30 86,18`, desc:"Concave down (diminishing marginal rate)" },
  F: { label:"F", path:`M14,65 Q55,65 86,12`, desc:"Concave up (accelerating rate)" },
  G: { label:"G", path:`M14,22 L52,22 L52,68 L86,68`, desc:"Fixed then drops to zero at threshold" },
  H: { label:"H", path:`M14,14 Q50,40 86,60`, desc:"Decreasing curve approaching a floor" },
  I: { label:"I", path:`M14,65 Q40,10 86,55`, desc:"S-shaped / inverted (rises then falls)" },
  J: { label:"J", path:`M14,68 L14,68 L86,68`, desc:"Zero cost (along x-axis)" },
  K: { label:"K", path:`M14,68 L40,68 L40,50 L65,50 L65,32 L86,32`, desc:"Step up (larger steps)" },
  L: { label:"L", path:`M14,16 L30,16 L68,58 L86,58`, desc:"Fixed, then linear decrease, then fixed at floor" },
};

// ─── QUESTIONS ────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id:"p1", nav:"Part I",
    title:"Identifying Cost Behavior — Part I",
    desc:"Using graphs A through H below, choose which graph best illustrates how each cost behaves in response to changes in its cost driver. The vertical axis = total cost ($), horizontal axis = cost driver activity level. Graphs may be used more than once.",
    type:"graph_match",
    graphSet:"I",
    items:[
      { desc:"Availability of quantity discounts, where the cost per unit falls as each price break is reached.", correct:"G" },
      { desc:"Price of an increasingly scarce raw material as the quantity used increases.", correct:"F" },
      { desc:"Guaranteed annual wage plan, whereby workers get paid for 40 hours of work per week even at zero or low levels of production.", correct:"B" },
      { desc:"Water bill, which entails a flat fee for the first 10,000 gallons used and then an increasing unit cost for every additional 10,000 gallons.", correct:"H" },
      { desc:"Cost of labor that tends to decrease as workers gain experience (learning curve effect on total cost).", correct:"A" },
      { desc:"Depreciation of office equipment for each month (straight-line depreciation method).", correct:"B" },
      { desc:"Cost of sheet steel for a manufacturer of farm implements (no quantity discounts).", correct:"E" },
      { desc:"Salaries of supervisors, where one supervisor is added for every 12 phone solicitors hired.", correct:"C" },
      { desc:"Natural gas bill consisting of a fixed component, plus a constant variable cost per thousand cubic feet after a specified number of cubic feet are used.", correct:"D" },
    ],
  },
  {
    id:"p2", nav:"Part II",
    title:"Identifying Cost Behavior — Part II",
    desc:"Using graphs A through L below, choose which graph best illustrates the cost behavior of each situation. The vertical axis = total cost ($), horizontal axis = production output during a calendar year. Graphs may be used more than once.",
    type:"graph_match",
    graphSet:"II",
    items:[
      { desc:"Annual depreciation of equipment, where the amount is computed by the straight-line method.", correct:"B" },
      { desc:"Annual depreciation of equipment, where the amount of depreciation charged is computed by the machine-hours method.", correct:"A" },
      { desc:"Electricity bills: a flat fixed charge, plus a variable cost after a certain number of kilowatt-hours, where kilowatt-hours vary proportionately with production output.", correct:"D" },
      { desc:"City water bill: $1,000 flat fee for first 1,000,000 gallons, then increasing rate per additional 10,000 gallons (0.003, 0.006, 0.009 per gallon — gallons proportionate to output).", correct:"F" },
      { desc:"Cost of lubricant for machines where cost per unit decreases with each pound used (e.g., 1 lb = $10.00; 2 lbs = $19.98; 3 lbs = $29.94) with a minimum cost per pound of $9.20.", correct:"H" },
      { desc:"Rent on a manufacturing plant donated by the city, where the agreement calls for a fixed fee payment unless 200,000 labor-hours are worked, in which case no rent need be paid.", correct:"G" },
      { desc:"Salaries of repair personnel, where one person is needed for every 1,000 machine-hours or fewer (0–1,000 hrs = 1 person; 1,001–2,000 = 2 people; etc.).", correct:"C" },
      { desc:"Cost of direct materials used (assume no quantity discounts).", correct:"A" },
      { desc:"Rent on a manufacturing plant donated by the county: rent = $100,000 reduced by $1 for each direct labor-hour worked in excess of 200,000 hours, but minimum rental payment of $20,000 must be paid.", correct:"L" },
    ],
  },
];

// ─── SCORING ─────────────────────────────────────────────────────────────────
function scoreQuestion(q, ans) {
  let total = 0, correct = 0;
  q.items.forEach((item, i) => {
    total++;
    if (ans[`${q.id}_${i}`] === item.correct) correct++;
  });
  return { total, correct };
}

function allFilled(q, ans) {
  return q.items.every((_, i) => !!ans[`${q.id}_${i}`]);
}

// ─── GRAPH DISPLAY ────────────────────────────────────────────────────────────
function GraphSVG({ letter, path, highlight, small }) {
  const sz = small ? 80 : 100;
  const strokeW = small ? 1.5 : 2;
  return (
    <svg viewBox="0 0 100 80" width={sz} height={sz * 0.8}
      style={{ display:"block", background: highlight ? "#f0fdf4" : "#f8fafc",
        borderRadius:6, border: `1.5px solid ${highlight?"#10b981":"#e2e8f0"}` }}>
      <g dangerouslySetInnerHTML={{__html: AXIS}} />
      <path d={path} fill="none" stroke={highlight?"#10b981":TEAL} strokeWidth={strokeW}
        strokeLinecap="round" strokeLinejoin="round" />
      <text x="50" y="78" textAnchor="middle" fontSize="10" fontWeight="700"
        fill={highlight?"#10b981":"#475569"}>{letter}</text>
    </svg>
  );
}

function GraphGrid({ graphSet }) {
  const graphs = graphSet === "I" ? GRAPHS_I : GRAPHS_II;
  const entries = Object.entries(graphs);
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center",
      padding:"12px 16px", background:"#f1f5f9", borderRadius:8,
      border:"1.5px solid #e2e8f0", marginBottom:14 }}>
      {entries.map(([letter, g]) => (
        <div key={letter} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <GraphSVG letter={letter} path={g.path} />
          <div style={{ fontSize:9.5, color:"#64748b", textAlign:"center", maxWidth:80 }}>{g.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ─── GRAPH MATCH BODY ─────────────────────────────────────────────────────────
function GraphMatchBody({ q, ans, setAns, revealed }) {
  const graphs = q.graphSet === "I" ? GRAPHS_I : GRAPHS_II;
  const letters = Object.keys(graphs);

  return (
    <div style={{ padding:"0 16px 16px" }}>
      <GraphGrid graphSet={q.graphSet} />
      <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
        <div style={{ ...SLATE, display:"grid", gridTemplateColumns:"1fr 140px" }}>
          <div style={{ padding:"8px 14px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Cost Description</div>
          <div style={{ padding:"8px 14px", color:"#fff", fontWeight:700, fontSize:11.5, textAlign:"center" }}>Graph</div>
        </div>
        {q.items.map((item, i) => {
          const k = `${q.id}_${i}`;
          const sel = ans[k] || "";
          const ok  = revealed && sel === item.correct;
          const bad = revealed && sel && sel !== item.correct;
          const noA = revealed && !sel;
          const bg  = revealed ? (ok?"#f0fdf4":bad||noA?"#fef2f2":i%2===0?"#fff":"#f8fafc") : i%2===0?"#fff":"#f8fafc";
          return (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"1fr 140px", alignItems:"center",
              background: bg, borderBottom: i<q.items.length-1?"1px solid #f0f4f8":"none",
              transition:"background .2s",
            }}>
              <div style={{ padding:"10px 14px", fontSize:13, color:"#334151", lineHeight:1.5 }}>
                <span style={{ fontWeight:600, color:"#64748b", marginRight:6 }}>{i+1}.</span>
                {item.desc}
              </div>
              <div style={{ padding:"8px 10px", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <select value={sel} disabled={revealed}
                  onChange={e => !revealed && setAns(p => ({ ...p, [k]: e.target.value }))}
                  style={{
                    width:90, padding:"6px 8px", borderRadius:6, fontSize:14, fontWeight:700,
                    textAlign:"center", cursor:"pointer",
                    border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                    background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
                    color:sel?"#0f172a":"#94a3b8", outline:"none",
                  }}>
                  <option value="">—</option>
                  {letters.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                {ok         && <span style={{ fontSize:13, color:"#10b981", fontWeight:700 }}>✓</span>}
                {(bad||noA) && <span style={{ fontSize:11, color:"#ef4444", fontWeight:600 }}>→ {item.correct}</span>}
                {revealed && ok && (
                  <GraphSVG letter={item.correct} path={graphs[item.correct]?.path} highlight={true} small={true} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── QUESTION BODY ────────────────────────────────────────────────────────────
function QuestionBody({ q, ans, setAns, revealed }) {
  if (q.type === "graph_match") return <GraphMatchBody q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  return null;
}

// ─── CHROME ───────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const ref = useRef(null), af = useRef(null);
  useEffect(() => {
    if (!active) return;
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width = c.parentElement.offsetWidth, H = c.height = c.parentElement.offsetHeight;
    const cols = ["#0ea5e9","#10b981","#f59e0b","#f43f5e","#a855f7","#22d3ee"];
    const ps = Array.from({length:160}, () => ({
      x:Math.random()*W, y:-Math.random()*H*.4, w:Math.random()*10+4, h:Math.random()*6+2,
      vx:(Math.random()-.5)*7, vy:Math.random()*5+1, rot:Math.random()*360,
      rv:(Math.random()-.5)*12, col:cols[~~(Math.random()*cols.length)], life:1, dec:.003,
    }));
    const go = () => {
      ctx.clearRect(0,0,W,H); let alive=false;
      ps.forEach(p => {
        if(p.life<=0)return; alive=true;
        p.x+=p.vx; p.y+=p.vy; p.vy+=.05; p.rot+=p.rv; p.life-=p.dec;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.col;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      });
      if(alive) af.current=requestAnimationFrame(go);
    };
    af.current = requestAnimationFrame(go);
    return () => cancelAnimationFrame(af.current);
  }, [active]);
  if (!active) return null;
  return <canvas ref={ref} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:50}}/>;
}

function NavRow({ questions, cur, setCur, grades }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
      background:"#f1f5f9",borderBottom:"1px solid #e2e8f0"}}>
      {questions.map((q,i) => {
        const g = grades[q.id], isCur = cur===i;
        const bg = isCur?"#fff":!g?"#64748b":g.correct===g.total?"#10b981":"#ef4444";
        return (
          <button key={q.id} onClick={()=>setCur(i)}
            style={{padding:"8px 20px",borderRadius:isCur?8:20,fontWeight:700,fontSize:13,
              background:bg,border:isCur?`2px solid ${TEAL}`:"2px solid transparent",
              color:isCur?"#0f172a":"#fff",cursor:"pointer",transition:"all .15s",
              boxShadow:isCur?`0 2px 8px ${TEAL}44`:"none",
              display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span>{q.nav}</span>
            {g && !isCur && <span style={{fontSize:9,opacity:.85}}>{g.correct}/{g.total}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ResultsScreen({ grades, onRetry }) {
  const total   = Object.values(grades).reduce((s,g)=>s+g.total,0);
  const correct = Object.values(grades).reduce((s,g)=>s+g.correct,0);
  const p = pctCalc(correct,total);
  const c = p===100?"#10b981":p>=75?"#d97706":"#ef4444";
  return (
    <div style={{position:"relative",overflow:"hidden"}}>
      <Confetti active={p===100}/>
      <div style={{textAlign:"center",padding:"48px 24px 32px"}}>
        <div style={{fontSize:50,marginBottom:8}}>{p===100?"🎉":p>=80?"🔥":"📊"}</div>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>
          Ch5 Special · Final Score
        </div>
        <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",
          padding:"20px 52px",borderRadius:12,background:"#f8fafc",border:`2px solid ${c}22`,marginBottom:20}}>
          <div style={{fontSize:54,fontWeight:800,color:c,lineHeight:1}}>
            {correct}<span style={{fontSize:26,color:"#94a3b8"}}>/{total}</span>
          </div>
          <div style={{fontSize:14,color:c,marginTop:4,fontWeight:700}}>{p}%</div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:24}}>
          {QUESTIONS.map(q=>{
            const g=grades[q.id]; if(!g)return null;
            const qp=pctCalc(g.correct,g.total),qc=qp===100?"#10b981":qp>=70?"#d97706":"#ef4444";
            return <div key={q.id} style={{padding:"4px 12px",borderRadius:20,
              background:qc+"15",border:`1px solid ${qc}33`,fontSize:12,fontWeight:600,color:qc}}>
              {q.nav}: {g.correct}/{g.total}
            </div>;
          })}
        </div>
        <button onClick={onRetry}
          style={{padding:"10px 32px",borderRadius:8,background:TEAL,border:"none",
            color:"#fff",fontSize:13.5,fontWeight:600,cursor:"pointer"}}>Try Again</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Ch05Special({ onComplete } = {}) {
  const [savedDraft] = useState(() => {
    const draft = loadQuizDraft("ch05sp");
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) return null;
    const grades = draft.graded;
    const isComplete = grades && typeof grades === "object" && QUESTIONS.every(q => grades[q.id]);
    if (isComplete) {
      clearQuizDraft("ch05sp");
      return null;
    }
    return draft;
  });
  const [cur,    setCur]    = useState(() => Number.isInteger(savedDraft?.cur) ? savedDraft.cur : 0);
  const [ans,    setAns]    = useState(() => (savedDraft?.ans && typeof savedDraft.ans === "object" && !Array.isArray(savedDraft.ans) ? savedDraft.ans : {}));
  const [graded, setGraded] = useState(() => (savedDraft?.graded && typeof savedDraft.graded === "object" && !Array.isArray(savedDraft.graded) ? savedDraft.graded : {}));
  const [screen, setScreen] = useState(() => (savedDraft?.screen === "quiz") ? savedDraft.screen : "quiz");
  const reportedResult = useRef(false);

  const q          = QUESTIONS[cur];
  const isRevealed = !!graded[q.id];
  const allGraded  = QUESTIONS.every(q => graded[q.id]);
  const filled     = allFilled(q, ans);

  const gradeThis = () => setGraded(p => ({ ...p, [q.id]: scoreQuestion(q, ans) }));
  const clearThis = () => {
    setGraded(p => { const n={...p}; delete n[q.id]; return n; });
    setAns(p => { const n={...p}; Object.keys(n).filter(k=>k.startsWith(q.id+"_")).forEach(k=>delete n[k]); return {...n}; });
  };
  const resetAll = () => { setAns({}); setGraded({}); setScreen("quiz"); setCur(0); reportedResult.current = false; };

  useEffect(() => {
    if (screen !== "results" || reportedResult.current) return;
    reportedResult.current = true;
    const totals = Object.values(graded).reduce((acc, g) => ({
      correct: acc.correct + g.correct,
      total: acc.total + g.total,
    }), { correct: 0, total: 0 });
    onComplete?.({
      chapterId: "ch05sp",
      chapterLabel: "Ch5 SP",
      ...totals,
      percent: pctCalc(totals.correct, totals.total),
      completedAt: new Date().toISOString(),
    });
  }, [screen, graded, onComplete]);

  useEffect(() => {
    if (screen === "results") clearQuizDraft("ch05sp");
  }, [screen]);

  useEffect(() => {
    if (screen === "results") return;
    saveQuizDraft("ch05sp", { cur, ans, graded, screen });
  }, [cur, ans, graded, screen]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    *,*::before,*::after{box-sizing:border-box;}
    @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    select{-webkit-appearance:auto;appearance:auto;}
    input:focus,select:focus{box-shadow:0 0 0 3px rgba(13,148,136,.18)!important;outline:none!important;}
    button:hover:not(:disabled){filter:brightness(.9);}
    ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
  `;
  const wrap = {minHeight:"100vh",background:"#e9eef5",color:"#0f172a",fontFamily:"'DM Sans',system-ui,sans-serif"};
  const inner = {maxWidth:1100,margin:"0 auto",padding:"24px 16px"};
  const card  = {background:"#f1f5f9",borderRadius:12,border:"1.5px solid #e2e8f0",overflow:"hidden",boxShadow:"0 2px 16px rgba(0,0,0,.07)"};

  const g = graded[q.id];
  const scoreBadge = isRevealed && g ? (() => {
    const p=pctCalc(g.correct,g.total), c=p===100?"#10b981":p>=70?"#d97706":"#ef4444";
    return <span style={{fontSize:13,fontWeight:700,color:c,background:c+"18",
      padding:"4px 12px",borderRadius:20,border:`1px solid ${c}33`}}>{g.correct}/{g.total} · {p}%</span>;
  })() : null;

  if (screen === "results") {
    return <div style={wrap}><style>{CSS}</style><div style={inner}><div style={card}>
      <ResultsScreen grades={graded} onRetry={resetAll}/>
    </div></div></div>;
  }

  return (
    <div style={wrap}><style>{CSS}</style><div style={inner}>
      <div style={{marginBottom:14}}>
        <h1 style={{fontWeight:800,fontSize:22,margin:0}}>Chapter 5 Special — Identifying Cost Behavior</h1>
        <p style={{fontSize:12,color:"#64748b",margin:"3px 0 0"}}>
          Graph matching: match each cost description to the graph that best illustrates its behavior.
          Adapted from Horngren, Sundem & Stratton.
        </p>
      </div>
      <div style={card}>
        <NavRow questions={QUESTIONS} cur={cur} setCur={setCur} grades={graded}/>
        <div style={{margin:"10px 16px 4px",padding:"12px 14px",background:"#fff",
          border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,lineHeight:1.7}}>
          <div style={{fontWeight:700,fontSize:13.5,marginBottom:4}}>{q.title}</div>
          <div style={{color:"#475569"}}>{q.desc}</div>
        </div>
        <div key={q.id} style={{animation:"fadein .2s ease"}}>
          <QuestionBody q={q} ans={ans} setAns={setAns} revealed={isRevealed}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"10px 16px 16px",gap:10,flexWrap:"wrap",borderTop:"1px solid #e2e8f0"}}>
          <div style={{display:"flex",gap:8}}>
            <button onClick={gradeThis} disabled={isRevealed||!filled}
              style={{padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                cursor:isRevealed||!filled?"not-allowed":"pointer",
                background:isRevealed||!filled?"#9ca3af":TEAL,color:"#fff",
                boxShadow:isRevealed||!filled?"none":`0 2px 8px ${TEAL}44`}}>
              Check Answers
            </button>
            <button onClick={clearThis}
              style={{padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                cursor:"pointer",background:"#64748b",color:"#fff"}}>Clear</button>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {scoreBadge}
            {cur < QUESTIONS.length-1
              ? <button onClick={()=>setCur(c=>c+1)}
                  style={{padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                    cursor:"pointer",background:"#10b981",color:"#fff"}}>Next →</button>
              : <button onClick={()=>{if(allGraded)setScreen("results");else{gradeThis();setTimeout(()=>setScreen("results"),100);}}}
                  style={{padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                    cursor:"pointer",background:"#10b981",color:"#fff"}}>Final Score</button>
            }
          </div>
        </div>
      </div>
    </div></div>
  );
}
