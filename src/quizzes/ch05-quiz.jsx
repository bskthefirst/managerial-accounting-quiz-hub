import { useState, useRef, useEffect } from "react";

// ─── UTILS ────────────────────────────────────────────────────────────────────
const rw      = v => (v || "").replace(/,/g, "");
const fmtNum  = v => { const s=v.replace(/[^0-9.]/g,""); if(!s) return ""; const p=s.split("."); return parseInt(p[0]||"0",10).toLocaleString()+(p.length>1?"."+p[1].slice(0,2):""); };
const fmt$    = n => "$" + n.toLocaleString();
const closeEq = (a, b, tol=1) => { const r=parseFloat(rw(a)); return !isNaN(r) && Math.abs(r-b)<=tol; };
const pct     = (a,b) => (b ? Math.round(a/b*100) : 0);
const MONO    = { fontFamily:"'JetBrains Mono','Courier New',monospace" };
const SLATE   = { background:"linear-gradient(135deg,#334155,#475569)" };
const TEAL_G  = { background:"linear-gradient(135deg,#0f766e,#0d9488)" };
const TEAL    = "#0d9488";

// ─── QUESTION DATA ────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id:"q20", nav:"Q20",
    title:"Q20 · Identifying Cost Behavior — Vasquez Inc.",
    desc:"Vasquez Incorporated tracked costs across three months:\n• Month 1 — 1,500 units: Cost A total $1,500 | Cost B total $4,500 | Cost C total $3,000\n• Month 2 — 3,000 units: Cost A total $1,500 | Cost B total $5,250 | Cost C total $6,000\n• Month 3 — 750 units: Cost A total $1,500 | Cost B total $3,750 | Cost C total $1,500\n\nCalculate cost per unit for each, then classify each cost as Fixed, Variable, or Mixed.",
    type:"cost_behavior",
    table:{
      rows:[
        { month:1, units:1500, a_total:1500, b_total:4500,  c_total:3000 },
        { month:2, units:3000, a_total:1500, b_total:5250,  c_total:6000 },
        { month:3, units:750,  a_total:1500, b_total:3750,  c_total:1500 },
      ],
    },
    behaviors:[
      { cost:"A", answer:"Fixed",    reason:"Total cost stays the same ($1,500) regardless of units produced — the definition of a fixed cost. Per-unit cost changes as volume changes." },
      { cost:"B", answer:"Mixed",    reason:"Total cost changes but not in proportion to units. Neither constant total (fixed) nor constant per-unit (variable). Must contain both fixed and variable components." },
      { cost:"C", answer:"Variable", reason:"Cost per unit is constant at $2.00 across all three months. Total cost changes in direct proportion to units — the definition of a variable cost." },
    ],
    opts:["Fixed","Variable","Mixed"],
  },

  {
    id:"q22", nav:"Q22",
    title:"Q22 · High-Low Method — Rockville Trucks",
    desc:"The city of Rockville maintenance cost data for its truck fleet (6 years).",
    type:"high_low",
    activityLabel:"Miles Driven", activityUnit:"miles",
    highPeriod:"Year 6", highCost:1550000, highActivity:710000,
    lowPeriod:"Year 1",  lowCost:750000,   lowActivity:225000,
    varCost:1.65, fixedCost:378750,
    forecastLabel:"Forecast at 500,000 miles (Year 7)",
    forecast:{ y:1203750, tol:500 },
    data:[
      { period:"Year 1", cost:750000,  activity:225000 },
      { period:"Year 2", cost:850000,  activity:240000 },
      { period:"Year 3", cost:1100000, activity:430000 },
      { period:"Year 4", cost:1150000, activity:454000 },
      { period:"Year 5", cost:1250000, activity:560000 },
      { period:"Year 6", cost:1550000, activity:710000 },
    ],
  },

  {
    id:"q24", nav:"Q24",
    title:"Q24 · Regression Analysis — Rockville Trucks",
    desc:"Regression analysis was run on the same Rockville truck maintenance data from Q22.\n\nRegression output coefficients:\n• y-intercept: 441,013\n• x variable (per mile): 1.53",
    type:"regression",
    output:{ intercept:441013, xVar:1.53, label:"Mile" },
    fixedCost:441013, varCost:1.53,
    forecastLabel:"Forecast at 500,000 miles (Year 7)",
    forecast:{ y:1206013, tol:500 },
  },

  {
    id:"q25", nav:"Q25",
    title:"Q25 · Contribution Margin IS — Pod Products, Inc.",
    desc:"Pod Products, Inc. last year:\n• Selling price: $250 per unit | Units produced and sold: 1,000\n• Production costs: $40,000 total (25% fixed, 75% variable)\n• Selling & administrative costs: $150,000 total (10% fixed, 90% variable)\n\nPrepare the contribution margin income statement.",
    type:"cm_statement",
    given:{ price:250, units:1000, prodFixed:10000, prodVar:30000, saFixed:15000, saVar:135000 },
    lines:[
      { label:"Sales revenue",                 answer:250000, indent:0, bold:false },
      { label:"Less: Variable production costs",answer:30000,  indent:1, bold:false, paren:true },
      { label:"Less: Variable S&A costs",       answer:135000, indent:1, bold:false, paren:true },
      { label:"Contribution margin",            answer:85000,  indent:0, bold:true  },
      { label:"Less: Fixed production costs",   answer:10000,  indent:1, bold:false, paren:true },
      { label:"Less: Fixed S&A costs",          answer:15000,  indent:1, bold:false, paren:true },
      { label:"Net operating income",           answer:60000,  indent:0, bold:true  },
    ],
  },

  {
    id:"q26", nav:"Q26",
    title:"Q26 · Relevant Range — Jersey Company",
    desc:"Jersey Company typically produces 1,000–5,000 jerseys annually. Management asks for a cost estimate at 9,000 units.",
    type:"mcq",
    prompt:"What is the relevant range, and why does producing 9,000 jerseys create a problem for cost estimation?",
    choices:[
      { id:"a", text:"The relevant range is any production level management chooses; 9,000 units is simply outside what they prefer to produce." },
      { id:"b", text:"The relevant range (1,000–5,000) is the activity band where the current cost equation is valid. At 9,000 units the company is outside this range, so the fixed/variable cost behavior assumptions may no longer hold — additional resources (labor, equipment) may cause step-increases in costs." },
      { id:"c", text:"The relevant range is only relevant for fixed costs; variable costs can be estimated at any volume with no problem." },
      { id:"d", text:"The relevant range means the company can only produce between 1,000 and 5,000 units by law; 9,000 units is simply not permitted." },
    ],
    answer:"b",
    explain:"The relevant range is the band of activity within which cost behavior patterns (fixed vs variable) were observed and can be reliably used. Beyond 9,000 units, fixed costs may 'step up' (new equipment, more supervisors) and variable cost rates may change — making estimates unreliable.",
  },

  {
    id:"q29", nav:"Q29",
    title:"Q29 · High-Low Method — Castanza Company",
    desc:"Castanza Company monthly production equipment costs (12 months).",
    type:"high_low",
    sticky:true,
    activityLabel:"Machine Hours", activityUnit:"MH",
    highPeriod:"November", highCost:1400000, highActivity:96000,
    lowPeriod:"March",     lowCost:500000,   lowActivity:20000,
    varCost:11.84, fixedCost:263158,
    forecastLabel:"Forecast at 50,000 machine hours",
    forecastLabel2:"Forecast at 15,000 machine hours",
    forecast:  { y:855158, tol:1000 },
    forecast2: { y:440758, tol:1000,
      warning:"15,000 MH is BELOW the observed range (20,000–96,000 MH). This is outside the relevant range, so the cost equation may not produce a reliable estimate." },
    data:[
      { period:"January",   cost:920000,  activity:45000 },
      { period:"February",  cost:600000,  activity:25000 },
      { period:"March",     cost:500000,  activity:20000 },
      { period:"April",     cost:1100000, activity:90000 },
      { period:"May",       cost:1140000, activity:95000 },
      { period:"June",      cost:620000,  activity:30000 },
      { period:"July",      cost:880000,  activity:38000 },
      { period:"August",    cost:910000,  activity:48000 },
      { period:"September", cost:1060000, activity:78000 },
      { period:"October",   cost:960000,  activity:51000 },
      { period:"November",  cost:1400000, activity:96000 },
      { period:"December",  cost:980000,  activity:54000 },
    ],
  },

  {
    id:"q31", nav:"Q31",
    title:"Q31 · Regression Analysis — Castanza Company",
    desc:"Regression was run on the same Castanza data from Q29.\n\nRegression output coefficients:\n• y-intercept: 445,639\n• x variable (per machine hour): 8.54",
    type:"regression",
    output:{ intercept:445639, xVar:8.54, label:"Machine Hour" },
    fixedCost:445639, varCost:8.54,
    forecastLabel:"Forecast at 50,000 machine hours",
    forecastLabel2:"Forecast at 15,000 machine hours",
    forecast:  { y:872639, tol:500 },
    forecast2: { y:573739, tol:500 },
  },

  {
    id:"q32", nav:"Q32",
    title:"Q32 · Traditional & CM Income Statements — Kumar Production",
    desc:"Kumar Production Company last month:\n• Selling price: $60/unit | Units produced and sold: 7,000\n• Variable production cost: $15/unit | Fixed production cost: $40,000\n• Variable S&A cost: $5/unit | Fixed S&A cost: $26,000\n\nPrepare BOTH income statements, then answer why companies use the CM format.",
    type:"dual_statement",
    given:{ price:60, units:7000, varProd:15, fixedProd:40000, varSA:5, fixedSA:26000 },
    traditional:[
      { label:"Sales revenue",                    answer:420000, indent:0, bold:false },
      { label:"Less: Cost of goods sold",         header:true,   indent:0 },
      { label:"Variable production costs",        answer:105000, indent:1, bold:false, paren:true },
      { label:"Fixed production costs",           answer:40000,  indent:1, bold:false, paren:true },
      { label:"Gross profit",                     answer:275000, indent:0, bold:true  },
      { label:"Less: Selling & administrative",   header:true,   indent:0 },
      { label:"Variable S&A costs",               answer:35000,  indent:1, bold:false, paren:true },
      { label:"Fixed S&A costs",                  answer:26000,  indent:1, bold:false, paren:true },
      { label:"Operating income",                 answer:214000, indent:0, bold:true  },
    ],
    contribution:[
      { label:"Sales revenue",                    answer:420000, indent:0, bold:false },
      { label:"Less: Variable costs",             header:true,   indent:0 },
      { label:"Variable production costs",        answer:105000, indent:1, bold:false, paren:true },
      { label:"Variable S&A costs",               answer:35000,  indent:1, bold:false, paren:true },
      { label:"Contribution margin",              answer:280000, indent:0, bold:true  },
      { label:"Less: Fixed costs",                header:true,   indent:0 },
      { label:"Fixed production costs",           answer:40000,  indent:1, bold:false, paren:true },
      { label:"Fixed S&A costs",                  answer:26000,  indent:1, bold:false, paren:true },
      { label:"Operating income",                 answer:214000, indent:0, bold:true  },
    ],
    whyMcq:{
      prompt:"Why do companies use the contribution margin income statement format?",
      choices:[
        { id:"a", text:"It is required by GAAP for external financial reporting." },
        { id:"b", text:"It separates variable and fixed costs, making it easier to calculate break-even, perform CVP analysis, and see the direct impact of volume changes on profit." },
        { id:"c", text:"It always shows higher operating income than the traditional format." },
        { id:"d", text:"It eliminates the need to track variable costs separately." },
      ],
      answer:"b",
      explain:"The CM format groups costs by behavior (variable vs. fixed) rather than function. This makes CVP analysis, break-even calculations, and sensitivity analysis straightforward — you can immediately see the contribution margin and how much fixed costs need to be covered.",
    },
  },

  {
    id:"q33", nav:"Q33",
    title:"Q33 · Regression with Excel Output — Walleye Company",
    desc:"Walleye Company production equipment costs (12 months). Excel regression was run — see output below.\n\nKey coefficients from Excel output:\n• Intercept (Fixed Cost): 534,766.55\n• Machine Hour coefficient (Variable Cost): 8.54\n\nUse the output to build the cost equation and forecast.",
    type:"regression",
    showExcel:true,
    output:{ intercept:534767, xVar:8.54, label:"Machine Hour" },
    fixedCost:534767, varCost:8.54,
    forecastLabel:"Forecast at 90,000 machine hours",
    forecast:{ y:1303366, tol:500 },
  },
];

// ─── SCORING ─────────────────────────────────────────────────────────────────
function calcScore(q, ans) {
  let total=0, correct=0;
  const chkVal = (k, exp, tol=1) => { total++; if(closeEq(ans[k],exp,tol)) correct++; };
  const chkSel = (k, exp)        => { total++; if(ans[k]===exp) correct++; };

  if (q.type==="cost_behavior") {
    q.behaviors.forEach((_,i) => chkSel(`${q.id}_${i}`, q.behaviors[i].answer));
  }
  if (q.type==="high_low") {
    chkVal(`${q.id}_var`,   q.varCost,   0.02);
    chkVal(`${q.id}_fixed`, q.fixedCost, 500);
    chkVal(`${q.id}_fc1`,   q.forecast.y,  q.forecast.tol||300);
    if (q.forecast2) chkVal(`${q.id}_fc2`, q.forecast2.y, q.forecast2.tol||300);
  }
  if (q.type==="regression") {
    chkVal(`${q.id}_fixed`, q.fixedCost, 1);
    chkVal(`${q.id}_var`,   q.varCost,   0.01);
    chkVal(`${q.id}_fc1`,   q.forecast.y, 500);
    if (q.forecast2) chkVal(`${q.id}_fc2`, q.forecast2.y, 500);
  }
  if (q.type==="cm_statement") {
    q.lines.forEach((line,i) => {
      if (!line.header) chkVal(`${q.id}_${i}`, line.answer, 1);
    });
  }
  if (q.type==="mcq") {
    chkSel(`${q.id}_mcq`, q.answer);
  }
  if (q.type==="dual_statement") {
    q.traditional.forEach((line,i) => {
      if (!line.header) chkVal(`${q.id}_t_${i}`, line.answer, 1);
    });
    q.contribution.forEach((line,i) => {
      if (!line.header) chkVal(`${q.id}_c_${i}`, line.answer, 1);
    });
    if (q.whyMcq) chkSel(`${q.id}_why`, q.whyMcq.answer);
  }
  return { total, correct };
}

function allFilled(q, ans) {
  if (q.type==="cost_behavior") return q.behaviors.every((_,i)=>!!ans[`${q.id}_${i}`]);
  if (q.type==="high_low") {
    const base = ans[`${q.id}_var`] && ans[`${q.id}_fixed`] && ans[`${q.id}_fc1`];
    return q.forecast2 ? base && !!ans[`${q.id}_fc2`] : !!base;
  }
  if (q.type==="regression") {
    const base = ans[`${q.id}_fixed`] && ans[`${q.id}_var`] && ans[`${q.id}_fc1`];
    return q.forecast2 ? base && !!ans[`${q.id}_fc2`] : !!base;
  }
  if (q.type==="cm_statement") return q.lines.every((line,i)=>line.header || !!ans[`${q.id}_${i}`]);
  if (q.type==="mcq")           return !!ans[`${q.id}_mcq`];
  if (q.type==="dual_statement") {
    const t = q.traditional.every((line,i)=>line.header || !!ans[`${q.id}_t_${i}`]);
    const c = q.contribution.every((line,i)=>line.header || !!ans[`${q.id}_c_${i}`]);
    return q.whyMcq ? t && c && !!ans[`${q.id}_why`] : t && c;
  }
  return true;
}

// ─── SHARED ATOMS ─────────────────────────────────────────────────────────────
function NumInput({ k, ans, setAns, revealed, correct, tol=1, width=110, placeholder="0" }) {
  const raw = parseFloat(rw(ans[k]||""));
  const ok  = revealed && !isNaN(raw) && Math.abs(raw-correct)<=tol;
  const bad = revealed && ans[k] && (isNaN(raw)||Math.abs(raw-correct)>tol);
  const noA = revealed && !ans[k];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <input value={ans[k]||""} disabled={revealed} placeholder={placeholder}
        onChange={e => !revealed && setAns(p=>({...p,[k]:fmtNum(e.target.value)}))}
        style={{ width, padding:"6px 8px", textAlign:"right", outline:"none",
          ...MONO, fontSize:13,
          border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
          borderRadius:6,
          background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
          color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a", transition:"all .15s" }} />
      {ok        && <span style={{ color:"#10b981", fontWeight:700, fontSize:14 }}>✓</span>}
      {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>→ {fmt$(correct)}</span>}
    </div>
  );
}

function BehaviorBtn({ label, selected, correct, revealed, onClick }) {
  const colors = { Fixed:"#6366f1", Variable:"#10b981", Mixed:"#f59e0b" };
  const base = colors[label]||"#64748b";
  let bg, border, color;
  if (revealed) {
    if (selected && correct)       { bg=base+"22"; border=`2px solid ${base}`; color=base; }
    else if (selected && !correct) { bg="#fef2f2"; border="2px solid #ef4444"; color="#ef4444"; }
    else if (!selected && correct) { bg=base+"15"; border=`2px dashed ${base}`; color=base; }
    else                           { bg="#f8fafc";  border="2px solid #e2e8f0"; color="#94a3b8"; }
  } else if (selected) { bg=base+"22"; border=`2px solid ${base}`; color=base; }
  else                 { bg="#fff"; border="2px solid #e2e8f0"; color="#475569"; }
  return (
    <button onClick={onClick} disabled={revealed}
      style={{ padding:"7px 20px", borderRadius:20, background:bg, border, color,
        cursor:revealed?"default":"pointer", fontSize:13, fontWeight:selected||correct?700:500,
        transition:"all .12s", whiteSpace:"nowrap" }}>
      {label}
    </button>
  );
}

function StepBox({ title, children, marginBottom = 0 }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom }}>
      <div style={{ padding:"8px 14px", background:"#f1f5f9", borderBottom:"1px solid #e2e8f0",
        fontSize:13, fontWeight:700, color:"#334155" }}>{title}</div>
      <div style={{ padding:"14px" }}>{children}</div>
    </div>
  );
}

// ─── COST BEHAVIOR ────────────────────────────────────────────────────────────
function CostBehaviorBody({ q, ans, setAns, revealed }) {
  return (
    <div style={{ padding:"0 16px 16px" }}>
      {/* Computed table */}
      <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom:16 }}>
        <div style={{ ...SLATE, display:"grid", gridTemplateColumns:"60px 100px 1fr 1fr 1fr" }}>
          {["Month","Units","Cost A","Cost B","Cost C"].map((h,i)=>(
            <div key={i} style={{ padding:"8px 10px", color:"#fff", fontWeight:700, fontSize:11.5,
              textAlign:i>=2?"center":"left" }}>{h}</div>
          ))}
        </div>
        {q.table.rows.map((row,i)=>(
          <div key={i} style={{ display:"grid", gridTemplateColumns:"60px 100px 1fr 1fr 1fr",
            background:i%2===0?"#fff":"#f8fafc", borderBottom:i<q.table.rows.length-1?"1px solid #f1f5f9":"none",
            alignItems:"center" }}>
            <div style={{ padding:"8px 10px", fontWeight:600, fontSize:13, color:"#374151" }}>{row.month}</div>
            <div style={{ padding:"8px 10px", fontSize:13, ...MONO, textAlign:"center" }}>{row.units.toLocaleString()}</div>
            {[["a",row.a_total],["b",row.b_total],["c",row.c_total]].map(([x,tot])=>(
              <div key={x} style={{ padding:"8px 10px", textAlign:"center", borderLeft:"1px solid #f1f5f9" }}>
                <span style={{ fontSize:13, ...MONO, color:"#0f172a" }}>{fmt$(tot)}</span>
                <span style={{ fontSize:11, color:"#94a3b8", margin:"0 3px" }}>/</span>
                <span style={{ fontSize:12, ...MONO, color:"#475569" }}>${(tot/row.units).toFixed(2)}/u</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Classification */}
      <div style={{ fontSize:13, fontWeight:700, color:"#475569", marginBottom:8 }}>
        Classify each cost as Fixed, Variable, or Mixed:
      </div>
      {q.behaviors.map((b,i)=>{
        const k=`${q.id}_${i}`;
        const ok  = revealed && ans[k]===b.answer;
        const bad = revealed && ans[k] && ans[k]!==b.answer;
        const noA = revealed && !ans[k];
        return (
          <div key={i} style={{ marginBottom:8, padding:"12px 14px",
            background:revealed?(ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff"):"#fff",
            border:`1.5px solid ${revealed?(ok?"#bbf7d0":bad||noA?"#fecaca":"#e2e8f0"):"#e2e8f0"}`,
            borderRadius:8, transition:"all .2s" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <span style={{ width:28, height:28, borderRadius:"50%", display:"flex",
                alignItems:"center", justifyContent:"center", flexShrink:0, fontWeight:700, fontSize:13,
                background:ok?"#10b981":bad||noA?"#ef4444":"#e2e8f0",
                color:ok||bad||noA?"#fff":"#64748b" }}>{b.cost}</span>
              <div style={{ flex:1, display:"flex", gap:8, flexWrap:"wrap" }}>
                {q.opts.map(o=>(
                  <BehaviorBtn key={o} label={o} selected={ans[k]===o} correct={b.answer===o}
                    revealed={revealed} onClick={()=>!revealed&&setAns(p=>({...p,[k]:o}))} />
                ))}
              </div>
              {ok && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
              {(bad||noA) && <span style={{ color:"#ef4444", fontSize:12, fontWeight:600 }}>→ {b.answer}</span>}
            </div>
            {revealed && (
              <div style={{ marginTop:8, padding:"8px 12px", borderRadius:6, fontSize:12.5, lineHeight:1.6,
                background:ok?"#ecfdf5":"#fff5f5", color:ok?"#065f46":"#7f1d1d" }}>
                💡 {b.reason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── HIGH-LOW ─────────────────────────────────────────────────────────────────
function HighLowBody({ q, ans, setAns, revealed }) {
  const [showData, setShowData] = useState(false);
  const hasFc2 = !!q.forecast2;

  return (
    <div style={{ padding:"0 16px 16px" }}>
      <button onClick={()=>setShowData(v=>!v)}
        style={{ marginBottom:12, padding:"6px 16px", borderRadius:6, border:"1.5px solid #e2e8f0",
          background:"#f8fafc", color:"#475569", fontSize:12.5, cursor:"pointer", fontWeight:600 }}>
        {showData?"▲ Hide":"▼ Show"} Data Table ({q.data.length} periods)
      </button>
      {showData && (
        <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom:12 }}>
          <div style={{ ...SLATE, display:"grid", gridTemplateColumns:"130px 1fr 1fr" }}>
            {["Period","Total Costs","Activity"].map((h,i)=>(
              <div key={i} style={{ padding:"7px 12px", color:"#fff", fontWeight:700, fontSize:11.5,
                textAlign:i>0?"right":"left" }}>{i===2?q.activityLabel:h}</div>
            ))}
          </div>
          {q.data.map((row,i)=>{
            const isHigh=row.period===q.highPeriod, isLow=row.period===q.lowPeriod;
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"130px 1fr 1fr",
                background:isHigh?"#fef2f2":isLow?"#f0fdf4":i%2===0?"#fff":"#f8fafc",
                borderBottom:i<q.data.length-1?"1px solid #f1f5f9":"none", alignItems:"center" }}>
                <div style={{ padding:"7px 12px", fontSize:12.5, fontWeight:isHigh||isLow?700:400,
                  color:isHigh?"#ef4444":isLow?"#10b981":"#334155" }}>
                  {row.period}{isHigh?" ▲":isLow?" ▼":""}
                </div>
                <div style={{ padding:"7px 12px", fontSize:12.5, ...MONO, textAlign:"right" }}>{fmt$(row.cost)}</div>
                <div style={{ padding:"7px 12px", fontSize:12.5, ...MONO, textAlign:"right", color:"#475569" }}>{row.activity.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <StepBox title={`① Identify High & Low Points`}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[{tag:"HIGH",period:q.highPeriod,cost:q.highCost,act:q.highActivity},
              {tag:"LOW", period:q.lowPeriod, cost:q.lowCost, act:q.lowActivity}].map(pt=>(
              <div key={pt.tag} style={{ padding:"10px 14px", borderRadius:8,
                background:pt.tag==="HIGH"?"#fef2f2":"#f0fdf4",
                border:`1.5px solid ${pt.tag==="HIGH"?"#fecaca":"#bbf7d0"}` }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:.5, marginBottom:5,
                  color:pt.tag==="HIGH"?"#ef4444":"#10b981" }}>{pt.tag} — {pt.period}</div>
                <div style={{ fontSize:13, color:"#334155" }}>Cost: <strong style={MONO}>{fmt$(pt.cost)}</strong></div>
                <div style={{ fontSize:13, color:"#334155", marginTop:2 }}>
                  {q.activityLabel}: <strong style={MONO}>{pt.act.toLocaleString()} {q.activityUnit}</strong>
                </div>
              </div>
            ))}
          </div>
        </StepBox>

        <StepBox title="② Variable Cost per Unit">
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, color:"#334155" }}>Variable cost per {q.activityUnit.toLowerCase().replace("mh","machine hour")} = $</span>
            <NumInput k={`${q.id}_var`} ans={ans} setAns={setAns} revealed={revealed}
              correct={q.varCost} tol={0.02} width={90} placeholder="0.00" />
            {revealed && (
              <div style={{ width:"100%", marginTop:8, padding:"7px 12px", borderRadius:6,
                background:"#eff6ff", fontSize:12.5, color:"#1e40af", ...MONO }}>
                v = ({fmt$(q.highCost)} − {fmt$(q.lowCost)}) ÷ ({q.highActivity.toLocaleString()} − {q.lowActivity.toLocaleString()}) = ${q.varCost} per {q.activityUnit}
              </div>
            )}
          </div>
        </StepBox>

        <StepBox title="③ Total Fixed Costs">
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, color:"#334155" }}>Fixed costs per period = $</span>
            <NumInput k={`${q.id}_fixed`} ans={ans} setAns={setAns} revealed={revealed}
              correct={q.fixedCost} tol={500} width={110} />
          </div>
          {revealed && (
            <div style={{ marginTop:10, padding:"8px 12px", borderRadius:6,
              background:"#eff6ff", fontSize:13, color:"#1e40af", fontWeight:700, ...MONO }}>
              ∴ Cost Equation: Y = {fmt$(q.fixedCost)} + ${q.varCost}X
            </div>
          )}
        </StepBox>

        <StepBox title={`④ Forecast: ${q.forecastLabel}`}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13, color:"#334155" }}>Estimated costs = $</span>
            <NumInput k={`${q.id}_fc1`} ans={ans} setAns={setAns} revealed={revealed}
              correct={q.forecast.y} tol={q.forecast.tol||300} width={120} />
          </div>
        </StepBox>

        {hasFc2 && (
          <StepBox title={`⑤ Forecast: ${q.forecastLabel2}`}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: q.forecast2.warning ? 10 : 0 }}>
              <span style={{ fontSize:13, color:"#334155" }}>Estimated costs = $</span>
              <NumInput k={`${q.id}_fc2`} ans={ans} setAns={setAns} revealed={revealed}
                correct={q.forecast2.y} tol={q.forecast2.tol||300} width={120} />
            </div>
            {revealed && q.forecast2.warning && (
              <div style={{ padding:"8px 12px", background:"#fff7ed", border:"1.5px solid #fed7aa",
                borderRadius:8, fontSize:12.5, color:"#92400e", lineHeight:1.6 }}>
                ⚠️ {q.forecast2.warning}
              </div>
            )}
          </StepBox>
        )}
      </div>
    </div>
  );
}

// ─── REGRESSION ───────────────────────────────────────────────────────────────
function RegressionBody({ q, ans, setAns, revealed }) {
  const hasFc2 = !!q.forecast2;
  return (
    <div style={{ padding:"0 16px 16px" }}>
      {/* Excel output card */}
      {q.showExcel && (
        <div style={{ border:"1.5px solid #c7d2fe", borderRadius:8, overflow:"hidden", marginBottom:14 }}>
          <div style={{ padding:"8px 14px", background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",
            fontSize:13, fontWeight:700, color:"#fff" }}>📊 Excel Regression Summary Output</div>
          <div style={{ padding:"14px", overflowX:"auto" }}>
            <table style={{ fontSize:12, borderCollapse:"collapse", width:"100%", ...MONO }}>
              <tbody>
                {[
                  ["Multiple R","0.922"],["R Square","0.850"],["Adjusted R Square","0.835"],
                  ["Standard Error","123,526.71"],["Observations","12"],
                ].map(([k,v],i)=>(
                  <tr key={i} style={{ background:i%2===0?"#f8fafc":"#fff" }}>
                    <td style={{ padding:"4px 12px", color:"#374151", fontWeight:600 }}>{k}</td>
                    <td style={{ padding:"4px 12px", color:"#0f172a" }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop:12, border:"1px solid #e2e8f0", borderRadius:6, overflow:"hidden" }}>
              <table style={{ fontSize:12, borderCollapse:"collapse", width:"100%", ...MONO }}>
                <thead>
                  <tr style={{ background:"#e0e7ff" }}>
                    {["","Coefficients","Std Error","t Stat","P-value"].map((h,i)=>(
                      <th key={i} style={{ padding:"5px 10px", textAlign:i===0?"left":"right",
                        color:"#3730a3", fontWeight:700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Intercept","534,766.55","83,965.17","6.369","8.15E-05"],
                    ["Machine Hours","8.54","1.135","7.528","1.998E-05"],
                  ].map((row,i)=>(
                    <tr key={i} style={{ background:i%2===0?"#f5f3ff":"#fafafa" }}>
                      {row.map((cell,j)=>(
                        <td key={j} style={{ padding:"5px 10px", textAlign:j===0?"left":"right",
                          color:j===1?"#4f46e5":"#374151", fontWeight:j===1?700:400 }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Standard regression output card */}
      {!q.showExcel && (
        <div style={{ border:"1.5px solid #c7d2fe", borderRadius:8, overflow:"hidden", marginBottom:14 }}>
          <div style={{ padding:"8px 14px", background:"linear-gradient(135deg,#4f46e5,#6366f1)",
            fontSize:13, fontWeight:700, color:"#fff" }}>Regression Output</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
            {[
              { label:`y-intercept (Fixed Cost)`, value:q.output.intercept },
              { label:`x variable (per ${q.output.label})`, value:q.output.xVar },
            ].map((item,i)=>(
              <div key={i} style={{ padding:"16px 18px", background:i===0?"#f5f3ff":"#fafafa",
                borderRight:i===0?"1px solid #e0e7ff":"none", textAlign:"center" }}>
                <div style={{ fontSize:11.5, color:"#6b7280", fontWeight:600, marginBottom:6 }}>{item.label}</div>
                <div style={{ fontSize:24, fontWeight:800, color:"#4f46e5", ...MONO }}>{item.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <StepBox title="① Build Cost Equation: Y = f + vX" marginBottom={10}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:10 }}>
          <span style={{ fontSize:13, color:"#334155" }}>Fixed cost (f) = $</span>
          <NumInput k={`${q.id}_fixed`} ans={ans} setAns={setAns} revealed={revealed}
            correct={q.fixedCost} tol={1} width={110} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, color:"#334155" }}>Variable cost per {q.output.label.toLowerCase()} (v) = $</span>
          <NumInput k={`${q.id}_var`} ans={ans} setAns={setAns} revealed={revealed}
            correct={q.varCost} tol={0.01} width={80} />
        </div>
        {revealed && (
          <div style={{ marginTop:12, padding:"8px 14px", background:"#eff6ff", borderRadius:6,
            fontSize:13, color:"#1e40af", fontWeight:700, ...MONO }}>
            ∴ Y = {fmt$(q.fixedCost)} + ${q.varCost}X
          </div>
        )}
      </StepBox>

      <StepBox title={`② Forecast: ${q.forecastLabel}`} marginBottom={10}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, color:"#334155" }}>Estimated costs = $</span>
          <NumInput k={`${q.id}_fc1`} ans={ans} setAns={setAns} revealed={revealed}
            correct={q.forecast.y} tol={q.forecast.tol||300} width={120} />
        </div>
      </StepBox>

      {hasFc2 && (
        <StepBox title={`③ Forecast: ${q.forecastLabel2}`} marginBottom={10}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13, color:"#334155" }}>Estimated costs = $</span>
            <NumInput k={`${q.id}_fc2`} ans={ans} setAns={setAns} revealed={revealed}
              correct={q.forecast2.y} tol={q.forecast2.tol||300} width={120} />
          </div>
        </StepBox>
      )}
    </div>
  );
}

// ─── MCQ ──────────────────────────────────────────────────────────────────────
function MCQBody({ q, ans, setAns, revealed, prompt, choices, answer, explain, stateKey }) {
  const k = stateKey || `${q.id}_mcq`;
  const ch = choices || q.choices;
  const ans_ = answer || q.answer;
  const exp  = explain || q.explain;
  const pr   = prompt  || q.prompt;
  const sel  = ans[k]||"";
  return (
    <div style={{ padding:"0 16px 16px" }}>
      <div style={{ fontSize:14, color:"#0f172a", lineHeight:1.5, margin:"8px 0 12px" }}>{pr}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {ch.map(c=>{
          const isSel=sel===c.id;
          const isCorrect=revealed&&c.id===ans_;
          const isWrong=revealed&&isSel&&c.id!==ans_;
          const border=revealed?(isCorrect?"#10b981":isWrong?"#ef4444":isSel?"#2563eb":"#e2e8f0"):isSel?"#2563eb":"#e2e8f0";
          const bg=revealed?(isCorrect?"#f0fdf4":isWrong?"#fef2f2":isSel?"#eff6ff":"#fff"):isSel?"#eff6ff":"#fff";
          const color=revealed?(isCorrect?"#065f46":isWrong?"#7f1d1d":"#0f172a"):"#0f172a";
          return (
            <button key={c.id} disabled={revealed} onClick={()=>!revealed&&setAns(p=>({...p,[k]:c.id}))}
              style={{ textAlign:"left", padding:"11px 14px", borderRadius:10,
                border:`1.5px solid ${border}`, background:bg, cursor:revealed?"default":"pointer",
                display:"flex", gap:10, alignItems:"flex-start", transition:"all .15s" }}>
              <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, marginTop:1,
                border:`2px solid ${isSel?"#2563eb":"#cbd5e1"}`,
                background:isSel?"#2563eb":"transparent" }} />
              <div style={{ fontSize:13.5, lineHeight:1.4, color }}>
                <span style={{ fontWeight:700, marginRight:6 }}>{c.id.toUpperCase()}.</span>{c.text}
              </div>
              {isCorrect && <span style={{ marginLeft:"auto", color:"#10b981", fontWeight:700, flexShrink:0 }}>✓</span>}
              {isWrong   && <span style={{ marginLeft:"auto", color:"#ef4444", fontWeight:700, flexShrink:0 }}>✗</span>}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div style={{ marginTop:12, padding:"12px 14px", borderRadius:8, border:"1px solid #e2e8f0",
          background:"#f8fafc", fontSize:13, lineHeight:1.6 }}>
          <strong>Explanation: </strong>{exp}
        </div>
      )}
    </div>
  );
}

// ─── IS LINE (for income statements) ─────────────────────────────────────────
function ISLine({ label, answer, indent=0, bold, paren, header, k, ans, setAns, revealed, tol=1 }) {
  if (header) {
    return (
      <div style={{ padding:"7px 14px", paddingLeft:14+indent*18,
        background:"#f1f5f9", borderBottom:"1px solid #e2e8f0",
        fontSize:12.5, fontWeight:700, color:"#475569" }}>{label}</div>
    );
  }
  const raw = parseFloat(rw(ans[k]||""));
  const ok  = revealed && !isNaN(raw) && Math.abs(raw-answer)<=tol;
  const bad = revealed && ans[k] && (isNaN(raw)||Math.abs(raw-answer)>tol);
  const noA = revealed && !ans[k];
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:`${bold?8:6}px 14px`, paddingLeft:14+indent*18,
      background:revealed?(ok?"#f0fdf4":bad||noA?"#fef2f2":bold?"#f1f5f9":"#fff"):bold?"#f1f5f9":"#fff",
      borderBottom:"1px solid #f1f5f9",
      borderTop:bold?"1px solid #e2e8f0":"none", transition:"background .2s" }}>
      <span style={{ fontSize:13, color:bold?"#0f172a":"#334155", fontWeight:bold?700:400 }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        {paren && <span style={{ color:"#94a3b8" }}>(</span>}
        <input value={ans[k]||""} disabled={revealed} placeholder="0"
          onChange={e=>!revealed&&setAns(p=>({...p,[k]:fmtNum(e.target.value)}))}
          style={{ width:100, padding:"4px 8px", textAlign:"right", outline:"none",
            ...MONO, fontSize:13, fontWeight:bold?700:400,
            border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#e2e8f0"}`,
            borderRadius:5,
            background:ok?"#dcfce7":bad||noA?"#fee2e2":"transparent",
            color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a" }} />
        {paren && <span style={{ color:"#94a3b8" }}>)</span>}
        {ok        && <span style={{ color:"#10b981", fontWeight:700, width:14 }}>✓</span>}
        {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600, minWidth:70 }}>→ {fmt$(answer)}</span>}
      </div>
    </div>
  );
}

// ─── CM STATEMENT ─────────────────────────────────────────────────────────────
function CMStatementBody({ q, ans, setAns, revealed }) {
  return (
    <div style={{ padding:"0 16px 16px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
        {[
          { label:"Selling Price",      value:`$${q.given.price}/unit` },
          { label:"Units Sold",         value:q.given.units.toLocaleString() },
          { label:"Production (Fixed)", value:fmt$(q.given.prodFixed) },
          { label:"Production (Var.)",  value:fmt$(q.given.prodVar) },
          { label:"S&A (Fixed)",        value:fmt$(q.given.saFixed) },
          { label:"S&A (Variable)",     value:fmt$(q.given.saVar) },
        ].map((item,i)=>(
          <div key={i} style={{ padding:"8px 12px", background:"#f0f9ff", border:"1.5px solid #bae6fd",
            borderRadius:7, textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#0369a1", fontWeight:600, marginBottom:3 }}>{item.label}</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#0c4a6e", ...MONO }}>{item.value}</div>
          </div>
        ))}
      </div>
      <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
        <div style={{ ...TEAL_G, padding:"10px 14px", fontSize:13, fontWeight:700, color:"#fff" }}>
          Contribution Margin Income Statement — Pod Products, Inc.
        </div>
        {q.lines.map((line,i)=>(
          <ISLine key={i} {...line} k={`${q.id}_${i}`} ans={ans} setAns={setAns} revealed={revealed} />
        ))}
      </div>
    </div>
  );
}

// ─── DUAL STATEMENT ───────────────────────────────────────────────────────────
function DualStatementBody({ q, ans, setAns, revealed }) {
  // Index offset for contribution lines (skipping header rows in traditional)
  const tLines = q.traditional;
  const cLines = q.contribution;
  return (
    <div style={{ padding:"0 16px 16px" }}>
      {/* Given info */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
        {[
          { label:"Price",          value:`$${q.given.price}/unit` },
          { label:"Units",          value:q.given.units.toLocaleString() },
          { label:"Var. Production",value:`$${q.given.varProd}/unit` },
          { label:"Fixed Production",value:fmt$(q.given.fixedProd) },
          { label:"Var. S&A",       value:`$${q.given.varSA}/unit` },
          { label:"Fixed S&A",      value:fmt$(q.given.fixedSA) },
        ].map((item,i)=>(
          <div key={i} style={{ padding:"8px 12px", background:"#f0f9ff", border:"1.5px solid #bae6fd",
            borderRadius:7, textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#0369a1", fontWeight:600, marginBottom:3 }}>{item.label}</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#0c4a6e", ...MONO }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Two statements */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:14 }}>
        {/* Traditional */}
        <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", flex:"1 1 300px", minWidth:280 }}>
          <div style={{ ...SLATE, padding:"10px 14px", fontSize:12.5, fontWeight:700, color:"#fff" }}>
            Traditional Income Statement
          </div>
          {tLines.map((line,i)=>(
            <ISLine key={i} {...line} k={`${q.id}_t_${i}`} ans={ans} setAns={setAns} revealed={revealed} />
          ))}
        </div>
        {/* Contribution Margin */}
        <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", flex:"1 1 300px", minWidth:280 }}>
          <div style={{ ...TEAL_G, padding:"10px 14px", fontSize:12.5, fontWeight:700, color:"#fff" }}>
            Contribution Margin Income Statement
          </div>
          {cLines.map((line,i)=>(
            <ISLine key={i} {...line} k={`${q.id}_c_${i}`} ans={ans} setAns={setAns} revealed={revealed} />
          ))}
        </div>
      </div>

      {/* Why MCQ */}
      {q.whyMcq && (
        <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
          <div style={{ padding:"8px 14px", background:"#f1f5f9", borderBottom:"1px solid #e2e8f0",
            fontSize:13, fontWeight:700, color:"#334155" }}>
            Why use the contribution margin income statement format?
          </div>
          <MCQBody q={q} ans={ans} setAns={setAns} revealed={revealed}
            prompt={q.whyMcq.prompt} choices={q.whyMcq.choices}
            answer={q.whyMcq.answer} explain={q.whyMcq.explain}
            stateKey={`${q.id}_why`} />
        </div>
      )}
    </div>
  );
}

// ─── QUESTION BODY DISPATCHER ─────────────────────────────────────────────────
function QuestionBody({ q, ans, setAns, revealed }) {
  if (q.type==="cost_behavior")  return <CostBehaviorBody  q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type==="high_low")       return <HighLowBody       q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type==="regression")     return <RegressionBody    q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type==="cm_statement")   return <CMStatementBody   q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type==="dual_statement") return <DualStatementBody q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type==="mcq")            return <MCQBody           q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  return null;
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const ref=useRef(null), af=useRef(null);
  useEffect(()=>{
    if(!active) return;
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d");
    const W=c.width=c.parentElement.offsetWidth, H=c.height=c.parentElement.offsetHeight;
    const cols=["#0ea5e9","#10b981","#f59e0b","#f43f5e","#a855f7","#22d3ee","#84cc16"];
    const ps=Array.from({length:200},()=>({
      x:Math.random()*W, y:-Math.random()*H*.5, w:Math.random()*10+4, h:Math.random()*6+2,
      vx:(Math.random()-.5)*7, vy:Math.random()*5+1, rot:Math.random()*360,
      rv:(Math.random()-.5)*12, col:cols[~~(Math.random()*cols.length)], life:1, dec:.002+Math.random()*.003,
    }));
    const go=()=>{
      ctx.clearRect(0,0,W,H); let alive=false;
      ps.forEach(p=>{
        if(p.life<=0)return; alive=true;
        p.x+=p.vx; p.y+=p.vy; p.vy+=.05; p.rot+=p.rv; p.life-=p.dec;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.col;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      });
      if(alive) af.current=requestAnimationFrame(go);
    };
    af.current=requestAnimationFrame(go);
    return ()=>cancelAnimationFrame(af.current);
  },[active]);
  if(!active) return null;
  return <canvas ref={ref} style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:50 }} />;
}

// ─── NAV ROW ─────────────────────────────────────────────────────────────────
function NavRow({ questions, cur, setCur, grades }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px",
      flexWrap:"wrap", background:"#f1f5f9", borderBottom:"1px solid #e2e8f0" }}>
      <button onClick={()=>setCur(c=>Math.max(0,c-1))} disabled={cur===0}
        style={{ width:28, height:28, borderRadius:"50%", border:"1.5px solid #d1d5db",
          background:cur===0?"#f9fafb":"#fff", color:cur===0?"#d1d5db":"#374151",
          fontSize:16, cursor:cur===0?"default":"pointer", flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
      {questions.map((q,i)=>{
        const g=grades[q.id], isCur=cur===i;
        const bg=isCur?"#fff":!g?"#64748b":g.correct===g.total?"#10b981":"#ef4444";
        return (
          <button key={q.id} onClick={()=>setCur(i)}
            style={{ minWidth:isCur?72:54, height:36, padding:"0 10px", borderRadius:isCur?8:20,
              background:bg, border:isCur?`2px solid ${TEAL}`:"2px solid transparent",
              color:isCur?"#0f172a":"#fff", cursor:"pointer",
              fontSize:isCur?12.5:11.5, fontWeight:700, transition:"all .15s",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              boxShadow:isCur?`0 2px 8px ${TEAL}44`:"none", lineHeight:1.2 }}>
            <span>{q.nav}</span>
            {g&&!isCur&&<span style={{ fontSize:9, opacity:.85 }}>{g.correct}/{g.total}</span>}
          </button>
        );
      })}
      <button onClick={()=>setCur(c=>Math.min(questions.length-1,c+1))} disabled={cur===questions.length-1}
        style={{ width:28, height:28, borderRadius:"50%", border:"1.5px solid #d1d5db",
          background:cur===questions.length-1?"#f9fafb":"#fff",
          color:cur===questions.length-1?"#d1d5db":"#374151",
          fontSize:16, cursor:cur===questions.length-1?"default":"pointer", flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
    </div>
  );
}

function ProgressBar({ questions, grades }) {
  const total   = questions.reduce((s,q)=>s+(grades[q.id]?.total||0),0);
  const correct = questions.reduce((s,q)=>s+(grades[q.id]?.correct||0),0);
  const p = total>0?Math.round(correct/total*100):0;
  const c = p>=80?"#10b981":p>=60?"#f59e0b":"#ef4444";
  return (
    <div style={{ margin:"0 16px", padding:"8px 14px", background:"#f8fafc",
      borderRadius:8, border:"1px solid #e2e8f0", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ flex:1, height:6, background:"#e2e8f0", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${p}%`, background:c, borderRadius:3, transition:"width .4s" }} />
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:"#374151" }}>{correct}/{total} · {p}%</span>
    </div>
  );
}

function ResultsScreen({ grades, onRetry, onReview }) {
  const total   = Object.values(grades).reduce((s,g)=>s+g.total,0);
  const correct = Object.values(grades).reduce((s,g)=>s+g.correct,0);
  const p = pct(correct,total);
  const c = p===100?"#10b981":p>=80?"#d97706":p>=60?TEAL:"#ef4444";
  const wrongCount = QUESTIONS.filter(q=>grades[q.id]&&grades[q.id].correct<grades[q.id].total).length;
  return (
    <div style={{ position:"relative", overflow:"hidden" }}>
      <Confetti active={p===100} />
      <div style={{ textAlign:"center", padding:"48px 24px 32px" }}>
        <div style={{ fontSize:50, marginBottom:8 }}>
          {p===100?"🎉":p>=80?"🔥":p>=60?"👍":"💪"}
        </div>
        <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", letterSpacing:1.5,
          textTransform:"uppercase", marginBottom:12 }}>Chapter 5 · Final Score</div>
        <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center",
          padding:"20px 52px", borderRadius:12, background:"#f8fafc", border:`2px solid ${c}22`, marginBottom:20 }}>
          <div style={{ fontSize:54, fontWeight:800, color:c, lineHeight:1 }}>
            {correct}<span style={{ fontSize:26, color:"#94a3b8" }}>/{total}</span>
          </div>
          <div style={{ fontSize:14, color:c, marginTop:4, fontWeight:700 }}>{p}%</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:24 }}>
          {QUESTIONS.map(q=>{
            const g=grades[q.id]; if(!g) return null;
            const qp=pct(g.correct,g.total), qc=qp===100?"#10b981":qp>=70?"#d97706":"#ef4444";
            return (
              <div key={q.id} style={{ padding:"4px 12px", borderRadius:20,
                background:qc+"15", border:`1px solid ${qc}33`, fontSize:12, fontWeight:600, color:qc }}>
                {q.nav}: {g.correct}/{g.total}
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={onRetry}
            style={{ padding:"10px 28px", borderRadius:8, background:TEAL, border:"none",
              color:"#fff", fontSize:13.5, fontWeight:600, cursor:"pointer" }}>Try Again</button>
          {wrongCount>0 && (
            <button onClick={onReview}
              style={{ padding:"10px 28px", borderRadius:8, background:"#ef4444", border:"none",
                color:"#fff", fontSize:13.5, fontWeight:600, cursor:"pointer",
                display:"flex", alignItems:"center", gap:8 }}>
              Review Wrong
              <span style={{ background:"rgba(255,255,255,.25)", borderRadius:20,
                padding:"1px 9px", fontSize:12, fontWeight:700 }}>{wrongCount}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Ch05Quiz({ onComplete } = {}) {
  const [cur,        setCur]        = useState(0);
  const [ans,        setAns]        = useState({});
  const [graded,     setGraded]     = useState({});
  const [screen,     setScreen]     = useState("quiz");
  const [revIdx,     setRevIdx]     = useState(0);
  const [stickyOpen, setStickyOpen] = useState(true);
  const reportedResult = useRef(false);

  const q          = QUESTIONS[cur];
  const isRevealed = !!graded[q.id];
  const allGraded  = QUESTIONS.every(q=>graded[q.id]);
  const wrongQs    = QUESTIONS.filter(q=>graded[q.id]&&graded[q.id].correct<graded[q.id].total);
  const filled     = allFilled(q, ans);
  const needsSticky = q.sticky === true;

  useEffect(()=>{ setStickyOpen(true); },[cur]);

  const gradeThis = () => setGraded(p=>({...p,[q.id]:calcScore(q,ans)}));
  const clearThis = () => {
    setGraded(p=>{const n={...p};delete n[q.id];return n;});
    setAns(p=>{const n={...p};Object.keys(n).forEach(k=>{if(k.startsWith(q.id+"_"))delete n[k];});return n;});
  };
  const resetAll = ()=>{ setAns({}); setGraded({}); setScreen("quiz"); setCur(0); setRevIdx(0); reportedResult.current = false; };

  useEffect(() => {
    if (screen !== "results" || reportedResult.current) return;
    reportedResult.current = true;
    const totals = Object.values(graded).reduce((acc, g) => ({
      correct: acc.correct + g.correct,
      total: acc.total + g.total,
    }), { correct: 0, total: 0 });
    onComplete?.({
      chapterId: "ch05",
      chapterLabel: "Chapter 5",
      ...totals,
      percent: pct(totals.correct, totals.total),
      completedAt: new Date().toISOString(),
    });
  }, [screen, graded, onComplete]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing:border-box; }
    @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    select { -webkit-appearance:auto; appearance:auto; }
    input:focus,select:focus { box-shadow:0 0 0 3px rgba(13,148,136,.18)!important; outline:none!important; }
    button:hover:not(:disabled) { filter:brightness(.9); }
    ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
  `;
  const wrap  = { minHeight:"100vh", background:"#e9eef5", color:"#0f172a", fontFamily:"'DM Sans',system-ui,sans-serif" };
  const inner = { maxWidth:1060, margin:"0 auto", padding:"24px 16px" };
  const card  = { background:"#f1f5f9", borderRadius:12, border:"1.5px solid #e2e8f0", overflow:"hidden", boxShadow:"0 2px 16px rgba(0,0,0,.07)" };

  const Desc = ({rq}) => (
    <div style={{ margin:"10px 16px 4px", padding:"12px 14px", background:"#fff",
      border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, lineHeight:1.7 }}>
      <div style={{ fontWeight:700, fontSize:13.5, marginBottom:4 }}>{rq.title}</div>
      <div style={{ color:"#475569" }}>{rq.desc.split("\n").map((l,i)=><div key={i}>{l}</div>)}</div>
    </div>
  );

  if (screen==="review" && wrongQs.length>0) {
    const rq=wrongQs[revIdx];
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={{ marginBottom:14, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <h1 style={{ fontWeight:800, fontSize:20, margin:0 }}>Review — Wrong Answers</h1>
          <span style={{ fontSize:12, background:"#fff", padding:"2px 10px", borderRadius:20,
            border:"1.5px solid #e2e8f0", fontWeight:600, color:"#6b7280" }}>{revIdx+1}/{wrongQs.length}</span>
          <button onClick={()=>setScreen("results")}
            style={{ marginLeft:"auto", padding:"7px 16px", borderRadius:8, background:"#10b981",
              border:"none", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>← Results</button>
        </div>
        <div style={card}>
          <NavRow questions={wrongQs} cur={revIdx} setCur={setRevIdx} grades={graded} />
          <div style={{ margin:"10px 16px 4px", padding:"8px 12px", background:"#fefce8",
            border:"1.5px solid #fde047", borderRadius:7, fontSize:12.5, color:"#854d0e", fontWeight:500 }}>
            Review mode — correct answers shown
          </div>
          <Desc rq={rq} />
          <div style={{ animation:"fadein .2s ease" }}>
            <QuestionBody q={rq} ans={ans} setAns={setAns} revealed={true} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 16px", borderTop:"1px solid #e2e8f0" }}>
            <button onClick={()=>setRevIdx(i=>Math.max(0,i-1))} disabled={revIdx===0}
              style={{ padding:"8px 20px", borderRadius:8, background:revIdx===0?"#9ca3af":TEAL,
                border:"none", color:"#fff", fontSize:13, fontWeight:600, cursor:revIdx===0?"not-allowed":"pointer" }}>← Prev</button>
            <button onClick={()=>setRevIdx(i=>Math.min(wrongQs.length-1,i+1))} disabled={revIdx===wrongQs.length-1}
              style={{ padding:"8px 20px", borderRadius:8, background:revIdx===wrongQs.length-1?"#9ca3af":TEAL,
                border:"none", color:"#fff", fontSize:13, fontWeight:600, cursor:revIdx===wrongQs.length-1?"not-allowed":"pointer" }}>Next →</button>
          </div>
        </div>
      </div></div>
    );
  }

  if (screen==="results") {
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={card}>
          <ResultsScreen grades={graded} onRetry={resetAll}
            onReview={()=>{ setRevIdx(0); setScreen("review"); }} />
        </div>
      </div></div>
    );
  }

  const g = graded[q.id];
  const scoreBadge = isRevealed && g ? (()=>{
    const p=pct(g.correct,g.total), c=p===100?"#10b981":p>=70?"#d97706":"#ef4444";
    return <span style={{ fontSize:13, fontWeight:700, color:c, background:c+"18",
      padding:"4px 12px", borderRadius:20, border:`1px solid ${c}33` }}>{g.correct}/{g.total} · {p}%</span>;
  })() : null;

  return (
    <div style={wrap}><style>{CSS}</style><div style={inner}>
      <div style={{ marginBottom:14 }}>
        <h1 style={{ fontWeight:800, fontSize:22, margin:0 }}>Chapter 5 — How Do Organizations Identify Cost Behavior?</h1>
        <p style={{ fontSize:12, color:"#64748b", margin:"3px 0 0" }}>
          Q20 · Q22 · Q24 · Q25 · Q26 · Q29 · Q31 · Q32 · Q33 — Cost Classification, High-Low Method, Regression, Contribution Margin
        </p>
      </div>

      {/* Sticky scenario bar for Q29 */}
      {needsSticky && (
        <div style={{ position:"sticky", top:72, zIndex:100, background:"#1e293b",
          borderBottom:"2px solid #0d9488", boxShadow:"0 3px 14px rgba(0,0,0,.3)",
          marginBottom:8, borderRadius:"0 0 8px 8px" }}>
          <div style={{ padding:"0 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"9px 0", cursor:"pointer", userSelect:"none" }}
              onClick={()=>setStickyOpen(o=>!o)}>
              <span style={{ fontSize:11.5, fontWeight:700, color:"#94a3b8",
                letterSpacing:.8, textTransform:"uppercase" }}>
                📋 {q.title}
              </span>
              <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600, background:"#334155",
                borderRadius:20, padding:"2px 12px", border:"1px solid #475569" }}>
                {stickyOpen?"Hide ▲":"Show ▼"}
              </span>
            </div>
            {stickyOpen && (
              <div style={{ fontSize:12.5, color:"#cbd5e1", lineHeight:1.75,
                paddingBottom:12, borderTop:"1px solid #334155", paddingTop:8 }}>
                {q.desc.split("\n").map((l,i)=><div key={i}>{l}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={card}>
        <NavRow questions={QUESTIONS} cur={cur} setCur={setCur} grades={graded} />
        {Object.keys(graded).length>0 && <div style={{paddingTop:10}}><ProgressBar questions={QUESTIONS} grades={graded} /></div>}
        {!needsSticky && <Desc rq={q} />}
        <div key={q.id} style={{ animation:"fadein .2s ease" }}>
          <QuestionBody q={q} ans={ans} setAns={setAns} revealed={isRevealed} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"10px 16px 18px", gap:10, flexWrap:"wrap", borderTop:"1px solid #e2e8f0" }}>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={gradeThis} disabled={isRevealed||!filled}
              style={{ padding:"9px 22px", borderRadius:8, fontSize:13.5, fontWeight:600, border:"none",
                cursor:isRevealed||!filled?"not-allowed":"pointer",
                background:isRevealed||!filled?"#9ca3af":TEAL, color:"#fff",
                boxShadow:isRevealed||!filled?"none":`0 2px 8px ${TEAL}44` }}>
              Check Answers
            </button>
            <button onClick={clearThis}
              style={{ padding:"9px 22px", borderRadius:8, fontSize:13.5, fontWeight:600, border:"none",
                cursor:"pointer", background:"#64748b", color:"#fff" }}>Clear</button>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {scoreBadge}
            {cur<QUESTIONS.length-1
              ? <button onClick={()=>setCur(c=>c+1)}
                  style={{ padding:"9px 22px", borderRadius:8, fontSize:13.5, fontWeight:600, border:"none",
                    cursor:"pointer", background:"#10b981", color:"#fff" }}>Next →</button>
              : <button onClick={()=>{ if(allGraded) setScreen("results"); else { gradeThis(); setTimeout(()=>setScreen("results"),100); } }}
                  style={{ padding:"9px 22px", borderRadius:8, fontSize:13.5, fontWeight:600, border:"none",
                    cursor:"pointer", background:"#10b981", color:"#fff" }}>Final Score</button>
            }
          </div>
        </div>
      </div>
      {allGraded && screen==="quiz" && (
        <div style={{ marginTop:14, textAlign:"center" }}>
          <button onClick={()=>setScreen("results")}
            style={{ padding:"10px 40px", borderRadius:8, fontSize:14, fontWeight:600,
              border:"none", cursor:"pointer", background:"#10b981", color:"#fff" }}>See Final Score</button>
        </div>
      )}
    </div></div>
  );
}
