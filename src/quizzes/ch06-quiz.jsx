import { useState, useRef, useEffect } from "react";
import { loadQuizDraft, saveQuizDraft, clearQuizDraft } from "./quiz-progress.js";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
const rw       = v => (v || "").replace(/,/g, "");
const fmtNum   = v => { const s = v.replace(/[^0-9.]/g, ""); if (!s) return ""; const p = s.split("."); return parseInt(p[0]||"0",10).toLocaleString()+(p.length>1?"."+p[1].slice(0,4):""); };
const fmt$     = n => "$"+Number(n).toLocaleString();
const closeEq  = (a, b, tol=1) => { const r=parseFloat(rw(a)); return !isNaN(r)&&Math.abs(r-b)<=tol; };
const pctCalc  = (a,b) => b ? Math.round(a/b*100) : 0;
const MONO     = { fontFamily:"'JetBrains Mono','Courier New',monospace" };
const SLATE    = { background:"linear-gradient(135deg,#334155,#475569)" };
const TEAL_G   = { background:"linear-gradient(135deg,#0f766e,#0d9488)" };
const TEAL     = "#0d9488";

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION DATA
// ─────────────────────────────────────────────────────────────────────────────
const QUESTIONS = [

  // ── Q19 ──────────────────────────────────────────────────────────────────
  {
    id:"q19", nav:"Q19",
    title:"Q19 · Contribution Margin — Ace Company",
    desc:"Ace Company: selling price = $200/unit | variable cost per unit = $40 | fixed costs = $4,000\n\nCalculate (a) the contribution margin per unit and (b) the contribution margin ratio.",
    type:"calc_steps",
    steps:[
      { label:"Selling price per unit",                             ans:"answer", correct:200 },
      { label:"Less: Variable cost per unit",                       ans:"answer", correct:40  },
      { label:"(a) Contribution margin per unit",                   ans:"answer", correct:160, total:true },
      { label:"(b) Contribution margin ratio",                      ans:"answer", correct:80,  unit:"%", tol:0.5, total:true },
    ],
  },

  // ── Q20 ──────────────────────────────────────────────────────────────────
  {
    id:"q20", nav:"Q20",
    title:"Q20 · Weighted Average Contribution Margin — Radio Control, Inc.",
    desc:"Radio Control, Inc.: Cars = $300/unit (80% of sales), variable cost $150 | Boats = $400/unit (20% of sales), variable cost $300\n\nCalculate (a) CM per unit for each product and (b) the weighted average CM per unit.",
    type:"calc_steps",
    steps:[
      { label:"(a) CM per unit — Cars ($300 − $150)",                ans:"answer", correct:150, section:"Product Contribution Margins" },
      { label:"(a) CM per unit — Boats ($400 − $300)",               ans:"answer", correct:100 },
      { label:"(b) Weighted average CM per unit",                    ans:"answer", correct:140, total:true, section:"Weighted Average" },
    ],
  },

  // ── Q24 ──────────────────────────────────────────────────────────────────
  {
    id:"q24", nav:"Q24",
    title:"Q24 · CM per Unit of Constraint — Paint Toys Company",
    desc:"Paint Toys Company: selling price = $100/unit | variable cost = $60/unit\nEach unit requires 1.25 machine hours and 2.00 direct labor hours.\n\nCalculate (a) CM per unit, (b) CM per machine hour, and (c) CM per direct labor hour.",
    type:"calc_steps",
    steps:[
      { label:"Selling price per unit",                             ans:"answer", correct:100 },
      { label:"Less: Variable cost per unit",                       ans:"answer", correct:60  },
      { label:"(a) Contribution margin per unit",                   ans:"answer", correct:40,  total:true },
      { label:"Machine hours per unit",                             ans:"answer", correct:1.25, tol:0.01, section:"Per Unit of Constraint" },
      { label:"(b) CM per machine hour",                            ans:"answer", correct:32,  tol:0.05, total:true },
      { label:"Direct labor hours per unit",                        ans:"answer", correct:2,   tol:0.01 },
      { label:"(c) CM per direct labor hour",                       ans:"answer", correct:20,  total:true },
    ],
  },

  // ── Q27 ──────────────────────────────────────────────────────────────────
  {
    id:"q27", nav:"Q27",
    title:"Q27 · Break-Even & Target Profit in Units — Nellie Company",
    desc:"Nellie Company: monthly fixed costs = $100,000 | variable cost = $20/unit | selling price = $25/unit\n\nCalculate (a) CM per unit, (b) break-even in units, and (c) units to earn $40,000 monthly profit.",
    type:"calc_steps",
    steps:[
      { label:"Selling price per unit",                             ans:"answer", correct:25 },
      { label:"Less: Variable cost per unit",                       ans:"answer", correct:20 },
      { label:"(a) Contribution margin per unit",                   ans:"answer", correct:5,       total:true, section:"Contribution Margin" },
      { label:"Total monthly fixed costs",                          ans:"answer", correct:100000, section:"Break-Even" },
      { label:"(b) Break-even point in units",                      ans:"answer", correct:20000,   total:true },
      { label:"Target monthly profit",                              ans:"answer", correct:40000,   section:"Target Profit" },
      { label:"(c) Units required to earn target profit",           ans:"answer", correct:28000,   total:true },
    ],
  },

  // ── Q28 ──────────────────────────────────────────────────────────────────
  {
    id:"q28", nav:"Q28",
    title:"Q28 · Break-Even & Target Profit in Sales Dollars — Nellie Company",
    desc:"Nellie Company: monthly fixed costs = $100,000 | variable cost = $20/unit | selling price = $25/unit\n\nCalculate (a) CM ratio, (b) break-even in sales dollars, and (c) sales dollars for $60,000 monthly profit.",
    type:"calc_steps",
    steps:[
      { label:"Contribution margin per unit",                       ans:"answer", correct:5  },
      { label:"Selling price per unit",                             ans:"answer", correct:25 },
      { label:"(a) Contribution margin ratio",                      ans:"answer", correct:20, unit:"%", tol:0.5, total:true, section:"CM Ratio" },
      { label:"Total monthly fixed costs",                          ans:"answer", correct:100000, section:"Break-Even" },
      { label:"(b) Break-even point in sales dollars",              ans:"answer", correct:500000,  total:true },
      { label:"Target monthly profit",                              ans:"answer", correct:60000,   section:"Target Profit" },
      { label:"(c) Sales dollars required for target profit",       ans:"answer", correct:800000,  total:true },
    ],
  },

  // ── Q29 ──────────────────────────────────────────────────────────────────
  {
    id:"q29", nav:"Q29",
    title:"Q29 · Margin of Safety — Nellie Company",
    desc:"Nellie Company: monthly fixed costs = $100,000 | variable cost = $20/unit | selling price = $25/unit | expected sales = 24,000 units | break-even = 20,000 units\n\nCalculate (a) margin of safety in units and (b) margin of safety in sales dollars.",
    type:"calc_steps",
    steps:[
      { label:"Expected unit sales",                                ans:"answer", correct:24000, section:"Margin of Safety" },
      { label:"Break-even unit sales",                              ans:"answer", correct:20000 },
      { label:"(a) Margin of safety in units",                      ans:"answer", correct:4000,  total:true },
      { label:"Selling price per unit",                             ans:"answer", correct:25 },
      { label:"(b) Margin of safety in sales dollars",              ans:"answer", correct:100000, total:true },
    ],
  },

  // ── Q30 ──────────────────────────────────────────────────────────────────
  {
    id:"q30", nav:"Q30",
    title:"Q30 · Multi-Product Break-Even — Hi-Tech Inc.",
    desc:"Hi-Tech Inc. monthly data:\n• Cell phone: selling price $100 | variable cost $40 | expected sales 21,000 units | sales mix 70%\n• GPS unit: selling price $400 | variable cost $240 | expected sales 9,000 units | sales mix 30%\n• Total fixed costs: $1,800,000",
    type:"multi_part",
    sticky:true,
    parts:[
      {
        partLabel:"(a) Weighted Average Contribution Margin per Unit",
        type:"calc_steps",
        steps:[
          { label:"CM per unit — Cell phone",               ans:"answer", correct:60  },
          { label:"CM per unit — GPS",                      ans:"answer", correct:160 },
          { label:"Weighted average CM per unit",           ans:"answer", correct:90,      total:true },
        ],
      },
      {
        partLabel:"(b) Break-Even Total Units",
        type:"calc_steps",
        steps:[
          { label:"Total fixed costs",                      ans:"answer", correct:1800000 },
          { label:"Weighted average CM per unit",           ans:"answer", correct:90 },
          { label:"Break-even total units",                 ans:"answer", correct:20000, total:true },
        ],
      },
      {
        partLabel:"(c) Break-Even Units per Product",
        type:"two_col_grid",
        colA:"Cell Phone", colB:"GPS",
        rows:[
          { label:"Sales mix percentage",  correctA:70,    correctB:30,    unit:"%", tol:0.5 },
          { label:"Break-even units",      correctA:14000, correctB:6000  },
        ],
      },
      {
        partLabel:"(d) Total Units to Earn $180,000 Monthly Profit",
        type:"calc_steps",
        steps:[
          { label:"Total fixed costs",                      ans:"answer", correct:1800000 },
          { label:"Target monthly profit",                  ans:"answer", correct:180000  },
          { label:"Weighted average CM per unit",           ans:"answer", correct:90 },
          { label:"Total units required",                   ans:"answer", correct:22000, total:true },
        ],
      },
      {
        partLabel:"(e) Units per Product to Earn $180,000 Profit",
        type:"two_col_grid",
        colA:"Cell Phone", colB:"GPS",
        rows:[
          { label:"Sales mix percentage",  correctA:70,    correctB:30,    unit:"%", tol:0.5 },
          { label:"Units required",        correctA:15400, correctB:6600  },
        ],
      },
    ],
  },

  // ── Q33 ──────────────────────────────────────────────────────────────────
  {
    id:"q33", nav:"Q33",
    title:"Q33 · CVP Sensitivity Analysis — Bridgeport Company",
    desc:"Bridgeport Company base case: selling price = $50/unit | variable cost = $40/unit | fixed costs = $200,000/month | expected unit sales = 30,000\n\nFor (b)–(d): units sold remains 30,000. Each scenario is independent of the others.",
    type:"multi_part",
    sticky:true,
    parts:[
      {
        partLabel:"(a) Base Case — Contribution Margin Income Statement",
        type:"cm_is",
        title:"Bridgeport Company — Contribution Margin Income Statement",
        lines:[
          { label:"Sales revenue",                  ans:"answer", correct:1500000 },
          { label:"Less: Total variable costs",     ans:"answer", correct:1200000, indent:1, paren:true },
          { label:"Contribution margin",            ans:"answer", correct:300000,  total:true },
          { label:"Less: Total fixed costs",        ans:"answer", correct:200000,  indent:1, paren:true },
          { label:"Operating income",               ans:"answer", correct:100000,  total:true, bold:true },
        ],
      },
      {
        partLabel:"(b) Sensitivity — Selling Price Increases 10%",
        type:"sensitivity_steps",
        scenario:"Price increases 10% (units held at 30,000)",
        steps:[
          { label:"New selling price per unit",     ans:"answer", correct:55 },
          { label:"Variable cost per unit",         ans:"answer", correct:40 },
          { label:"New CM per unit",                ans:"answer", correct:15, total:true },
          { label:"Total new CM (× 30,000 units)",  ans:"answer", correct:450000 },
          { label:"Fixed costs",                    ans:"answer", correct:200000 },
          { label:"New operating income",           ans:"answer", correct:250000, total:true, bold:true },
        ],
      },
      {
        partLabel:"(c) Sensitivity — Variable Cost Decreases 20%",
        type:"sensitivity_steps",
        scenario:"Variable cost decreases 20% (units held at 30,000)",
        steps:[
          { label:"New variable cost per unit",     ans:"answer", correct:32 },
          { label:"Selling price per unit",         ans:"answer", correct:50 },
          { label:"New CM per unit",                ans:"answer", correct:18, total:true },
          { label:"Total new CM (× 30,000 units)",  ans:"answer", correct:540000 },
          { label:"Fixed costs",                    ans:"answer", correct:200000 },
          { label:"New operating income",           ans:"answer", correct:340000, total:true, bold:true },
        ],
      },
      {
        partLabel:"(d) Sensitivity — Fixed Costs Decrease 20%",
        type:"sensitivity_steps",
        scenario:"Fixed costs decrease 20% (units held at 30,000)",
        steps:[
          { label:"Total contribution margin",      ans:"answer", correct:300000 },
          { label:"New fixed costs",                ans:"answer", correct:160000 },
          { label:"New operating income",           ans:"answer", correct:140000, total:true, bold:true },
        ],
      },
    ],
  },

  // ── Q35 ──────────────────────────────────────────────────────────────────
  {
    id:"q35", nav:"Q35",
    title:"Q35 · CM with Resource Constraints — CyclePath Company",
    desc:"CyclePath Company: 50,000 labor hours available annually. All units produced are sold.\n• Bicycle: selling price $200 | variable cost $120 | requires 4 labor hours per unit\n• Tricycle: selling price $100 | variable cost $50 | requires 2 labor hours per unit",
    type:"multi_part",
    parts:[
      {
        partLabel:"(a) Contribution Margin per Unit of Constrained Resource",
        type:"two_col_grid",
        colA:"Bicycle", colB:"Tricycle",
        rows:[
          { label:"Selling price per unit",          correctA:200,  correctB:100  },
          { label:"Variable cost per unit",          correctA:120,  correctB:50   },
          { label:"CM per unit",                     correctA:80,   correctB:50,  total:true },
          { label:"Labor hours per unit",            correctA:4,    correctB:2    },
          { label:"CM per labor hour",               correctA:20,   correctB:25,  total:true },
        ],
      },
      {
        partLabel:"(b) Which Product Should CyclePath Prioritize?",
        type:"mcq",
        prompt:"Which product should CyclePath prefer to sell in order to maximize total company profit?",
        choices:[
          { id:"a", text:"Bicycle — it has the higher contribution margin per unit ($80), so each unit sold generates more profit." },
          { id:"b", text:"Tricycle — it generates a higher contribution margin per labor hour ($25 vs $20), which is the binding constraint. With only 50,000 hours available, profit is maximized by producing the product that contributes most per constrained hour." },
          { id:"c", text:"Both products should be produced equally, since the company has enough capacity to make both." },
          { id:"d", text:"Bicycle — because its selling price is higher, it will generate more total revenue for the company." },
        ],
        answer:"b",
        explain:"When a resource is constrained, the decision rule is to maximize contribution margin per unit of the constrained resource — not CM per product unit. Tricycle yields $25/labor hour vs Bicycle's $20/labor hour. Given 50,000 labor hours, Tricycle maximizes total profit.",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────────────────────────────────────
function scoreCalcSteps(steps, ans, prefix) {
  let total=0, correct=0;
  steps.forEach((step, i) => {
    if (step.ans !== "answer") return;
    total++;
    if (closeEq(ans[`${prefix}s${i}`], step.correct, step.tol ?? 1)) correct++;
  });
  return { total, correct };
}

function scoreTwoColGrid(rows, ans, prefix) {
  let total=0, correct=0;
  rows.forEach((row, ri) => {
    const tolA = row.tol ?? 1, tolB = row.tol ?? 1;
    total += 2;
    if (closeEq(ans[`${prefix}a${ri}`], row.correctA, tolA)) correct++;
    if (closeEq(ans[`${prefix}b${ri}`], row.correctB, tolB)) correct++;
  });
  return { total, correct };
}

function scoreCMIS(lines, ans, prefix) {
  let total=0, correct=0;
  lines.forEach((line, i) => {
    if (line.ans !== "answer") return;
    total++;
    if (closeEq(ans[`${prefix}l${i}`], line.correct, line.tol ?? 1)) correct++;
  });
  return { total, correct };
}

function scoreQuestion(q, ans) {
  let total=0, correct=0;
  const add = r => { total+=r.total; correct+=r.correct; };

  if (q.type === "calc_steps") {
    add(scoreCalcSteps(q.steps, ans, `${q.id}_`));
  }
  if (q.type === "multi_part") {
    q.parts.forEach((part, pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type === "calc_steps")       add(scoreCalcSteps(part.steps, ans, pfx));
      if (part.type === "two_col_grid")     add(scoreTwoColGrid(part.rows,  ans, pfx));
      if (part.type === "cm_is")            add(scoreCMIS(part.lines, ans, pfx));
      if (part.type === "sensitivity_steps") add(scoreCalcSteps(part.steps, ans, pfx));
      if (part.type === "mcq") {
        total++;
        if (ans[`${pfx}mcq`] === part.answer) correct++;
      }
    });
  }
  return { total, correct };
}

function allFilled(q, ans) {
  const checkSteps = (steps, pfx) => steps.every((s,i) => s.ans !== "answer" || !!ans[`${pfx}s${i}`]);
  const checkGrid  = (rows,  pfx) => rows.every((_, ri) => ans[`${pfx}a${ri}`] && ans[`${pfx}b${ri}`]);
  const checkIS    = (lines, pfx) => lines.every((l, i) => l.ans !== "answer" || !!ans[`${pfx}l${i}`]);

  if (q.type === "calc_steps") return checkSteps(q.steps, `${q.id}_`);
  if (q.type === "multi_part") {
    return q.parts.every((part, pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type === "calc_steps")        return checkSteps(part.steps, pfx);
      if (part.type === "two_col_grid")      return checkGrid(part.rows, pfx);
      if (part.type === "cm_is")             return checkIS(part.lines, pfx);
      if (part.type === "sensitivity_steps") return checkSteps(part.steps, pfx);
      if (part.type === "mcq")               return !!ans[`${pfx}mcq`];
      return true;
    });
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS  (ALL at module scope — never inside a render function)
// ─────────────────────────────────────────────────────────────────────────────

// NumInput — standalone, module scope
function NumInput({ stateKey, ans, setAns, correct, tol=1, revealed, width=120, unit="" }) {
  const raw = parseFloat(rw(ans[stateKey]||""));
  const ok  = revealed && !isNaN(raw) && Math.abs(raw-correct) <= tol;
  const bad = revealed && ans[stateKey] && (isNaN(raw) || Math.abs(raw-correct) > tol);
  const noA = revealed && !ans[stateKey];
  const showCorrect = unit === "%" ? `${correct}%` : fmt$(correct);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <input
        value={ans[stateKey]||""}
        disabled={revealed}
        placeholder="0"
        onChange={e => !revealed && setAns(p => ({ ...p, [stateKey]: fmtNum(e.target.value) }))}
        style={{
          width, padding:"6px 8px", textAlign:"right", outline:"none", ...MONO, fontSize:13,
          border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
          borderRadius:6,
          background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
          color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a", transition:"all .15s",
        }}
      />
      {unit && <span style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>{unit}</span>}
      {ok        && <span style={{ color:"#10b981", fontWeight:700, fontSize:14 }}>✓</span>}
      {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>→ {showCorrect}</span>}
    </div>
  );
}

// StepBox — module scope titled section wrapper
function StepBox({ title, accent, children }) {
  const bg     = accent === "amber"  ? "#fffbeb" : accent === "teal" ? "#f0fdfa" : "#f8fafc";
  const border = accent === "amber"  ? "#fde68a" : accent === "teal" ? "#99f6e4" : "#e2e8f0";
  const hdrBg  = accent === "amber"  ? "#fef3c7" : accent === "teal" ? "#ccfbf1" : "#f1f5f9";
  const hdrC   = accent === "amber"  ? "#92400e" : accent === "teal" ? "#134e4a" : "#334155";
  return (
    <div style={{ border:`1.5px solid ${border}`, borderRadius:8, overflow:"hidden", marginBottom:10 }}>
      {title && (
        <div style={{ padding:"8px 14px", background:hdrBg, borderBottom:`1px solid ${border}`,
          fontSize:13, fontWeight:700, color:hdrC }}>{title}</div>
      )}
      <div style={{ padding:"12px 14px", background:bg }}>{children}</div>
    </div>
  );
}

// SectionDivider — module scope section header inside a step list
function SectionDivider({ label }) {
  return (
    <div style={{ padding:"6px 14px", background:"#f1f5f9", borderBottom:"1px solid #e2e8f0",
      borderTop:"1px solid #e2e8f0", fontSize:11.5, fontWeight:700, color:"#475569",
      letterSpacing:.5, textTransform:"uppercase", marginTop:4 }}>
      {label}
    </div>
  );
}

// StepRow — single calc row (given span OR answer input), module scope
function StepRow({ step, idx, ans, setAns, revealed, prefix, isLast }) {
  const k = `${prefix}s${idx}`;
  const isTotal = !!step.total;
  const isBold  = !!step.bold || isTotal;
  const bg = isTotal ? "#f1f5f9" : idx%2===0 ? "#fff" : "#f8fafc";
  return (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:`${isTotal?8:6}px 14px`,
      background:bg,
      borderBottom: isLast ? "none" : "1px solid #f1f5f9",
      borderTop: isTotal ? "1.5px solid #cbd5e1" : "none",
      transition:"background .15s",
    }}>
      <span style={{ fontSize:13, color:isBold?"#0f172a":"#374151", fontWeight:isBold?700:400 }}>
        {step.label}
      </span>
      <NumInput
        stateKey={k}
        ans={ans}
        setAns={setAns}
        correct={step.correct}
        tol={step.tol ?? 1}
        revealed={revealed}
        width={step.unit==="%"?80:130}
        unit={step.unit||""}
      />
    </div>
  );
}

// CalcStepsBody — module scope
function CalcStepsBody({ steps, ans, setAns, revealed, prefix }) {
  const rows = [];
  let currentSection = null;
  steps.forEach((step, i) => {
    if (step.section && step.section !== currentSection) {
      currentSection = step.section;
      rows.push({ type:"divider", label:step.section, key:`div_${i}` });
    }
    rows.push({ type:"step", step, idx:i, key:`step_${i}` });
  });

  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      {rows.map((row, ri) => {
        if (row.type === "divider") {
          return <SectionDivider key={row.key} label={row.label} />;
        }
        return (
          <StepRow
            key={row.key}
            step={row.step}
            idx={row.idx}
            ans={ans}
            setAns={setAns}
            revealed={revealed}
            prefix={prefix}
            isLast={ri === rows.length-1}
          />
        );
      })}
    </div>
  );
}

// TwoColGridBody — module scope (Q30c, Q30e, Q35a)
function TwoColGridBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:"1fr 150px 150px" }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}></div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:12, textAlign:"right" }}>{part.colA}</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:12, textAlign:"right" }}>{part.colB}</div>
      </div>
      {/* Rows */}
      {part.rows.map((row, ri) => {
        const kA = `${prefix}a${ri}`, kB = `${prefix}b${ri}`;
        const tol = row.tol ?? 1;
        const isTotal = !!row.total;
        const bg = isTotal ? "#f1f5f9" : ri%2===0 ? "#fff" : "#f8fafc";
        return (
          <div key={ri} style={{
            display:"grid", gridTemplateColumns:"1fr 150px 150px",
            background:bg,
            borderBottom: ri<part.rows.length-1 ? "1px solid #f1f5f9" : "none",
            borderTop: isTotal ? "1.5px solid #cbd5e1" : "none",
            alignItems:"center",
          }}>
            <div style={{ padding:"8px 12px", fontSize:13, color:isTotal?"#0f172a":"#374151",
              fontWeight:isTotal?700:400 }}>{row.label}</div>
            <div style={{ padding:"5px 8px", display:"flex", justifyContent:"flex-end" }}>
              <NumInput stateKey={kA} ans={ans} setAns={setAns}
                correct={row.correctA} tol={tol} revealed={revealed}
                width={120} unit={row.unit||""} />
            </div>
            <div style={{ padding:"5px 8px", display:"flex", justifyContent:"flex-end" }}>
              <NumInput stateKey={kB} ans={ans} setAns={setAns}
                correct={row.correctB} tol={tol} revealed={revealed}
                width={120} unit={row.unit||""} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ISLine — single income statement row, module scope
function ISLine({ line, idx, ans, setAns, revealed, prefix }) {
  const k = `${prefix}l${idx}`;
  const isTotal = !!line.total;
  const isBold  = !!line.bold || isTotal;
  const indent  = line.indent || 0;
  const bg      = isTotal ? "#f1f5f9" : idx%2===0 ? "#fff" : "#f8fafc";
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:`${isTotal?8:6}px 14px`, paddingLeft: 14+indent*18,
      background:bg,
      borderBottom:"1px solid #f1f5f9",
      borderTop: isTotal ? "1.5px solid #cbd5e1" : "none",
      transition:"background .15s",
    }}>
      <span style={{ fontSize:13, color:isBold?"#0f172a":"#334155", fontWeight:isBold?700:400 }}>
        {line.paren ? <span>({line.label})</span> : line.label}
      </span>
      <NumInput
        stateKey={k}
        ans={ans}
        setAns={setAns}
        correct={line.correct}
        tol={line.tol ?? 1}
        revealed={revealed}
        width={130}
      />
    </div>
  );
}

// CMISBody — contribution margin income statement, module scope
function CMISBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      <div style={{ ...TEAL_G, padding:"10px 14px", fontSize:13, fontWeight:700, color:"#fff" }}>
        {part.title}
      </div>
      {part.lines.map((line, i) => (
        <ISLine key={i} line={line} idx={i} ans={ans} setAns={setAns}
          revealed={revealed} prefix={prefix} />
      ))}
    </div>
  );
}

// SensitivityStepsBody — sensitivity scenario with step chain, module scope
function SensitivityStepsBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div>
      {/* Scenario badge */}
      <div style={{ padding:"8px 12px", marginBottom:10, borderRadius:7,
        background:"#fef3c7", border:"1.5px solid #fde68a",
        fontSize:12.5, color:"#92400e", fontWeight:600 }}>
        📌 Scenario: {part.scenario}
      </div>
      <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
        {part.steps.map((step, i) => (
          <StepRow key={i} step={step} idx={i} ans={ans} setAns={setAns}
            revealed={revealed} prefix={prefix} isLast={i===part.steps.length-1} />
        ))}
      </div>
    </div>
  );
}

// MCQBody — module scope
function MCQBody({ part, ans, setAns, revealed, stateKey }) {
  const k = stateKey;
  const sel = ans[k] || "";
  return (
    <div>
      <div style={{ fontSize:13.5, color:"#0f172a", lineHeight:1.5, marginBottom:12 }}>{part.prompt}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {part.choices.map(ch => {
          const isSel      = sel === ch.id;
          const isCorrect  = revealed && ch.id === part.answer;
          const isWrong    = revealed && isSel && !isCorrect;
          const border = isCorrect?"#10b981":isWrong?"#ef4444":isSel?"#2563eb":"#e2e8f0";
          const bg     = isCorrect?"#f0fdf4":isWrong?"#fef2f2":isSel?"#eff6ff":"#fff";
          const color  = isCorrect?"#065f46":isWrong?"#7f1d1d":"#0f172a";
          return (
            <button key={ch.id} disabled={revealed}
              onClick={() => !revealed && setAns(p => ({ ...p, [k]: ch.id }))}
              style={{ textAlign:"left", padding:"11px 14px", borderRadius:10,
                border:`1.5px solid ${border}`, background:bg, cursor:revealed?"default":"pointer",
                display:"flex", gap:10, alignItems:"flex-start", transition:"all .15s" }}>
              <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, marginTop:1,
                border:`2px solid ${isSel?"#2563eb":"#cbd5e1"}`,
                background:isSel?"#2563eb":"transparent" }} />
              <span style={{ fontSize:13, lineHeight:1.4, color }}>
                <span style={{ fontWeight:700, marginRight:6 }}>{ch.id.toUpperCase()}.</span>{ch.text}
              </span>
              {isCorrect && <span style={{ marginLeft:"auto", color:"#10b981", fontWeight:700, flexShrink:0 }}>✓</span>}
              {isWrong   && <span style={{ marginLeft:"auto", color:"#ef4444", fontWeight:700, flexShrink:0 }}>✗</span>}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div style={{ marginTop:10, padding:"12px 14px", borderRadius:8, border:"1px solid #e2e8f0",
          background:"#f8fafc", fontSize:13, lineHeight:1.6 }}>
          <strong>Explanation: </strong>{part.explain}
        </div>
      )}
    </div>
  );
}

// MultiPartBody — module scope
function MultiPartBody({ q, ans, setAns, revealed }) {
  return (
    <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:12 }}>
      {q.parts.map((part, pi) => {
        const pfx = `${q.id}_p${pi}_`;
        return (
          <div key={pi} style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
            <div style={{ ...SLATE, padding:"8px 12px" }}>
              <span style={{ fontSize:12.5, fontWeight:700, color:"#fff" }}>{part.partLabel}</span>
            </div>
            <div style={{ padding:"12px" }}>
              {part.type === "calc_steps" && (
                <CalcStepsBody steps={part.steps} ans={ans} setAns={setAns}
                  revealed={revealed} prefix={pfx} />
              )}
              {part.type === "two_col_grid" && (
                <TwoColGridBody part={part} ans={ans} setAns={setAns}
                  revealed={revealed} prefix={pfx} />
              )}
              {part.type === "cm_is" && (
                <CMISBody part={part} ans={ans} setAns={setAns}
                  revealed={revealed} prefix={pfx} />
              )}
              {part.type === "sensitivity_steps" && (
                <SensitivityStepsBody part={part} ans={ans} setAns={setAns}
                  revealed={revealed} prefix={pfx} />
              )}
              {part.type === "mcq" && (
                <MCQBody part={part} ans={ans} setAns={setAns}
                  revealed={revealed} stateKey={`${pfx}mcq`} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// QuestionBody — dispatcher, module scope
function QuestionBody({ q, ans, setAns, revealed }) {
  if (q.type === "calc_steps") {
    return (
      <div style={{ padding:"0 16px 16px" }}>
        <CalcStepsBody steps={q.steps} ans={ans} setAns={setAns}
          revealed={revealed} prefix={`${q.id}_`} />
      </div>
    );
  }
  if (q.type === "multi_part") {
    return <MultiPartBody q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHROME COMPONENTS  (also module scope)
// ─────────────────────────────────────────────────────────────────────────────

function Confetti({ active }) {
  const ref = useRef(null), af = useRef(null);
  useEffect(() => {
    if (!active) return;
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width = c.parentElement.offsetWidth;
    const H = c.height = c.parentElement.offsetHeight;
    const cols = ["#0ea5e9","#10b981","#f59e0b","#f43f5e","#a855f7","#22d3ee","#84cc16"];
    const ps = Array.from({ length:200 }, () => ({
      x:Math.random()*W, y:-Math.random()*H*.5,
      w:Math.random()*10+4, h:Math.random()*6+2,
      vx:(Math.random()-.5)*7, vy:Math.random()*5+1,
      rot:Math.random()*360, rv:(Math.random()-.5)*12,
      col:cols[~~(Math.random()*cols.length)], life:1, dec:.002+Math.random()*.003,
    }));
    const go = () => {
      ctx.clearRect(0,0,W,H); let alive=false;
      ps.forEach(p => {
        if(p.life<=0) return; alive=true;
        p.x+=p.vx; p.y+=p.vy; p.vy+=.05; p.rot+=p.rv; p.life-=p.dec;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.col;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      });
      if (alive) af.current = requestAnimationFrame(go);
    };
    af.current = requestAnimationFrame(go);
    return () => cancelAnimationFrame(af.current);
  }, [active]);
  if (!active) return null;
  return <canvas ref={ref} style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:50 }} />;
}

function NavRow({ questions, cur, setCur, grades }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px",
      flexWrap:"wrap", background:"#f1f5f9", borderBottom:"1px solid #e2e8f0" }}>
      <button onClick={() => setCur(c => Math.max(0,c-1))} disabled={cur===0}
        style={{ width:28,height:28,borderRadius:"50%",border:"1.5px solid #d1d5db",
          background:cur===0?"#f9fafb":"#fff",color:cur===0?"#d1d5db":"#374151",
          fontSize:16,cursor:cur===0?"default":"pointer",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
      {questions.map((q, i) => {
        const g = grades[q.id], isCur = cur===i;
        const bg = isCur?"#fff":!g?"#64748b":g.correct===g.total?"#10b981":"#ef4444";
        return (
          <button key={q.id} onClick={() => setCur(i)}
            style={{ minWidth:isCur?72:54,height:36,padding:"0 10px",borderRadius:isCur?8:20,
              background:bg,border:isCur?`2px solid ${TEAL}`:"2px solid transparent",
              color:isCur?"#0f172a":"#fff",cursor:"pointer",
              fontSize:isCur?12.5:11.5,fontWeight:700,transition:"all .15s",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              boxShadow:isCur?`0 2px 8px ${TEAL}44`:"none",lineHeight:1.2 }}>
            <span>{q.nav}</span>
            {g && !isCur && <span style={{ fontSize:9,opacity:.85 }}>{g.correct}/{g.total}</span>}
          </button>
        );
      })}
      <button onClick={() => setCur(c => Math.min(questions.length-1,c+1))} disabled={cur===questions.length-1}
        style={{ width:28,height:28,borderRadius:"50%",border:"1.5px solid #d1d5db",
          background:cur===questions.length-1?"#f9fafb":"#fff",
          color:cur===questions.length-1?"#d1d5db":"#374151",
          fontSize:16,cursor:cur===questions.length-1?"default":"pointer",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
    </div>
  );
}

function ProgressBar({ questions, grades }) {
  const total   = questions.reduce((s,q) => s+(grades[q.id]?.total||0), 0);
  const correct = questions.reduce((s,q) => s+(grades[q.id]?.correct||0), 0);
  const p = total>0 ? Math.round(correct/total*100) : 0;
  const c = p>=80?"#10b981":p>=60?"#f59e0b":"#ef4444";
  return (
    <div style={{ margin:"0 16px 4px",padding:"8px 14px",background:"#f8fafc",
      borderRadius:8,border:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:14 }}>
      <div style={{ flex:1,height:6,background:"#e2e8f0",borderRadius:3,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${p}%`,background:c,borderRadius:3,transition:"width .4s" }} />
      </div>
      <span style={{ fontSize:12,fontWeight:700,color:"#374151",whiteSpace:"nowrap" }}>{correct}/{total} · {p}%</span>
    </div>
  );
}

function StickyBar({ q, open, setOpen }) {
  return (
    <div style={{ position:"sticky",top:0,zIndex:100,background:"#1e293b",
      borderBottom:"2px solid #0d9488",boxShadow:"0 3px 14px rgba(0,0,0,.3)",
      marginBottom:8,borderRadius:"0 0 8px 8px" }}>
      <div style={{ padding:"0 16px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"9px 0",cursor:"pointer",userSelect:"none" }}
          onClick={() => setOpen(o => !o)}>
          <span style={{ fontSize:11.5,fontWeight:700,color:"#94a3b8",
            letterSpacing:.8,textTransform:"uppercase" }}>
            📋 {q.title}
          </span>
          <span style={{ fontSize:11,color:"#94a3b8",fontWeight:600,
            background:"#334155",borderRadius:20,padding:"2px 12px",border:"1px solid #475569" }}>
            {open?"Hide ▲":"Show ▼"}
          </span>
        </div>
        {open && (
          <div style={{ fontSize:12.5,color:"#cbd5e1",lineHeight:1.75,
            paddingBottom:12,borderTop:"1px solid #334155",paddingTop:8 }}>
            {q.desc.split("\n").map((l,i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function DescCard({ q }) {
  return (
    <div style={{ margin:"10px 16px 4px",padding:"12px 14px",background:"#fff",
      border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,lineHeight:1.7 }}>
      <div style={{ fontWeight:700,fontSize:13.5,marginBottom:4,color:"#0f172a" }}>{q.title}</div>
      <div style={{ color:"#475569" }}>{q.desc.split("\n").map((l,i) => <div key={i}>{l}</div>)}</div>
    </div>
  );
}

function ResultsScreen({ grades, onRetry, onReview }) {
  const total   = Object.values(grades).reduce((s,g) => s+g.total,  0);
  const correct = Object.values(grades).reduce((s,g) => s+g.correct,0);
  const p = pctCalc(correct,total);
  const c = p===100?"#10b981":p>=80?"#d97706":p>=60?TEAL:"#ef4444";
  const wrongCount = QUESTIONS.filter(q => grades[q.id]&&grades[q.id].correct<grades[q.id].total).length;
  return (
    <div style={{ position:"relative",overflow:"hidden" }}>
      <Confetti active={p===100} />
      <div style={{ textAlign:"center",padding:"48px 24px 32px" }}>
        <div style={{ fontSize:50,marginBottom:8 }}>{p===100?"🎉":p>=80?"🔥":p>=60?"👍":"💪"}</div>
        <div style={{ fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1.5,
          textTransform:"uppercase",marginBottom:12 }}>Chapter 6 · Final Score</div>
        <div style={{ display:"inline-flex",flexDirection:"column",alignItems:"center",
          padding:"20px 52px",borderRadius:12,background:"#f8fafc",border:`2px solid ${c}22`,marginBottom:20 }}>
          <div style={{ fontSize:54,fontWeight:800,color:c,lineHeight:1 }}>
            {correct}<span style={{ fontSize:26,color:"#94a3b8" }}>/{total}</span>
          </div>
          <div style={{ fontSize:14,color:c,marginTop:4,fontWeight:700 }}>{p}%</div>
        </div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:24 }}>
          {QUESTIONS.map(q => {
            const g=grades[q.id]; if(!g) return null;
            const qp=pctCalc(g.correct,g.total), qc=qp===100?"#10b981":qp>=70?"#d97706":"#ef4444";
            return (
              <div key={q.id} style={{ padding:"4px 12px",borderRadius:20,
                background:qc+"15",border:`1px solid ${qc}33`,fontSize:12,fontWeight:600,color:qc }}>
                {q.nav}: {g.correct}/{g.total}
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
          <button onClick={onRetry}
            style={{ padding:"10px 28px",borderRadius:8,background:TEAL,border:"none",
              color:"#fff",fontSize:13.5,fontWeight:600,cursor:"pointer" }}>Try Again</button>
          {wrongCount>0 && (
            <button onClick={onReview}
              style={{ padding:"10px 28px",borderRadius:8,background:"#ef4444",border:"none",
                color:"#fff",fontSize:13.5,fontWeight:600,cursor:"pointer",
                display:"flex",alignItems:"center",gap:8 }}>
              Review Wrong
              <span style={{ background:"rgba(255,255,255,.25)",borderRadius:20,
                padding:"1px 9px",fontSize:12,fontWeight:700 }}>{wrongCount}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP  (only state + handlers defined here — zero component definitions)
// ─────────────────────────────────────────────────────────────────────────────
export default function Ch06Quiz({ onComplete } = {}) {
  const [savedDraft] = useState(() => {
    const draft = loadQuizDraft("ch06");
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) return null;
    const grades = draft.graded;
    const isComplete = grades && typeof grades === "object" && QUESTIONS.every(q => grades[q.id]);
    if (isComplete) {
      clearQuizDraft("ch06");
      return null;
    }
    return draft;
  });
  const [cur,        setCur]        = useState(() => Number.isInteger(savedDraft?.cur) ? savedDraft.cur : 0);
  const [ans,        setAns]        = useState(() => (savedDraft?.ans && typeof savedDraft.ans === "object" && !Array.isArray(savedDraft.ans) ? savedDraft.ans : {}));
  const [graded,     setGraded]     = useState(() => (savedDraft?.graded && typeof savedDraft.graded === "object" && !Array.isArray(savedDraft.graded) ? savedDraft.graded : {}));
  const [screen,     setScreen]     = useState(() => (savedDraft?.screen === "quiz" || savedDraft?.screen === "review") ? savedDraft.screen : "quiz");
  const [revIdx,     setRevIdx]     = useState(() => Number.isInteger(savedDraft?.revIdx) ? savedDraft.revIdx : 0);
  const [stickyOpen, setStickyOpen] = useState(() => savedDraft?.stickyOpen !== false);
  const reportedResult = useRef(false);

  const q          = QUESTIONS[cur];
  const isRevealed = !!graded[q.id];
  const allGraded  = QUESTIONS.every(q => graded[q.id]);
  const wrongQs    = QUESTIONS.filter(q => graded[q.id] && graded[q.id].correct < graded[q.id].total);
  const filled     = allFilled(q, ans);
  const needsSticky = q.sticky === true;

  useEffect(() => { setStickyOpen(true); }, [cur]);

  const gradeThis = () => setGraded(p => ({ ...p, [q.id]: scoreQuestion(q, ans) }));
  const clearThis = () => {
    setGraded(p => { const n={...p}; delete n[q.id]; return n; });
    setAns(p => { const n={...p}; Object.keys(n).filter(k => k.startsWith(q.id+"_")).forEach(k=>delete n[k]); return n; });
  };
  const resetAll = () => { setAns({}); setGraded({}); setScreen("quiz"); setCur(0); setRevIdx(0); reportedResult.current = false; };

  useEffect(() => {
    if (screen !== "results" || reportedResult.current) return;
    reportedResult.current = true;
    const totals = Object.values(graded).reduce((acc, g) => ({
      correct: acc.correct + g.correct,
      total: acc.total + g.total,
    }), { correct: 0, total: 0 });
    onComplete?.({
      chapterId: "ch06",
      chapterLabel: "Chapter 6",
      ...totals,
      percent: pctCalc(totals.correct, totals.total),
      completedAt: new Date().toISOString(),
    });
  }, [screen, graded, onComplete]);

  useEffect(() => {
    if (screen === "results") clearQuizDraft("ch06");
  }, [screen]);

  useEffect(() => {
    if (screen === "results") return;
    saveQuizDraft("ch06", { cur, ans, graded, screen, revIdx, stickyOpen });
  }, [cur, ans, graded, screen, revIdx, stickyOpen]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing:border-box; }
    @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    input:focus,select:focus { box-shadow:0 0 0 3px rgba(13,148,136,.18)!important; outline:none!important; }
    button:hover:not(:disabled) { filter:brightness(.9); }
    ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
  `;
  const wrap  = { minHeight:"100vh", background:"#e9eef5", color:"#0f172a", fontFamily:"'DM Sans',system-ui,sans-serif" };
  const inner = { maxWidth:980, margin:"0 auto", padding:"24px 16px" };
  const card  = { background:"#f1f5f9", borderRadius:12, border:"1.5px solid #e2e8f0", overflow:"hidden", boxShadow:"0 2px 16px rgba(0,0,0,.07)" };

  const g = graded[q.id];
  const scoreBadge = isRevealed && g ? (() => {
    const p=pctCalc(g.correct,g.total), c=p===100?"#10b981":p>=70?"#d97706":"#ef4444";
    return <span style={{ fontSize:13,fontWeight:700,color:c,background:c+"18",
      padding:"4px 12px",borderRadius:20,border:`1px solid ${c}33` }}>{g.correct}/{g.total} · {p}%</span>;
  })() : null;

  // ── REVIEW ────────────────────────────────────────────────────────────────
  if (screen==="review" && wrongQs.length>0) {
    const rq = wrongQs[revIdx];
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={{ marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
          <h1 style={{ fontWeight:800,fontSize:20,margin:0 }}>Review — Wrong Answers</h1>
          <span style={{ fontSize:12,background:"#fff",padding:"2px 10px",borderRadius:20,
            border:"1.5px solid #e2e8f0",fontWeight:600,color:"#6b7280" }}>{revIdx+1}/{wrongQs.length}</span>
          <button onClick={() => setScreen("results")}
            style={{ marginLeft:"auto",padding:"7px 16px",borderRadius:8,background:"#10b981",
              border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer" }}>← Results</button>
        </div>
        <div style={card}>
          <div style={{ margin:"10px 16px 4px",padding:"8px 12px",background:"#fefce8",
            border:"1.5px solid #fde047",borderRadius:7,fontSize:12.5,color:"#854d0e",fontWeight:500 }}>
            Review mode — correct answers shown
          </div>
          <DescCard q={rq} />
          <div style={{ animation:"fadein .2s ease" }}>
            <QuestionBody q={rq} ans={ans} setAns={() => {}} revealed={true} />
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid #e2e8f0" }}>
            <button onClick={() => setRevIdx(i => Math.max(0,i-1))} disabled={revIdx===0}
              style={{ padding:"8px 20px",borderRadius:8,background:revIdx===0?"#9ca3af":TEAL,
                border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:revIdx===0?"not-allowed":"pointer" }}>← Prev</button>
            <button onClick={() => setRevIdx(i => Math.min(wrongQs.length-1,i+1))} disabled={revIdx===wrongQs.length-1}
              style={{ padding:"8px 20px",borderRadius:8,background:revIdx===wrongQs.length-1?"#9ca3af":TEAL,
                border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:revIdx===wrongQs.length-1?"not-allowed":"pointer" }}>Next →</button>
          </div>
        </div>
      </div></div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  if (screen==="results") {
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={card}>
          <ResultsScreen grades={graded} onRetry={resetAll}
            onReview={() => { setRevIdx(0); setScreen("review"); }} />
        </div>
      </div></div>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  return (
    <div style={wrap}><style>{CSS}</style><div style={inner}>
      <div style={{ marginBottom:14 }}>
        <h1 style={{ fontWeight:800,fontSize:22,margin:0 }}>Chapter 6 — How Is Cost-Volume-Profit Analysis Used?</h1>
        <p style={{ fontSize:12,color:"#64748b",margin:"3px 0 0" }}>
          Q19 · Q20 · Q24 · Q27 · Q28 · Q29 · Q30 · Q33 · Q35 — CM Calculations, Break-Even, Target Profit, Sensitivity & Constraints
        </p>
      </div>

      {needsSticky && (
        <StickyBar q={q} open={stickyOpen} setOpen={setStickyOpen} />
      )}

      <div style={card}>
        <NavRow questions={QUESTIONS} cur={cur} setCur={setCur} grades={graded} />
        {Object.keys(graded).length>0 && (
          <div style={{ paddingTop:8 }}>
            <ProgressBar questions={QUESTIONS} grades={graded} />
          </div>
        )}

        {!needsSticky && <DescCard q={q} />}

        <div key={q.id} style={{ animation:"fadein .2s ease" }}>
          <QuestionBody q={q} ans={ans} setAns={setAns} revealed={isRevealed} />
        </div>

        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"10px 16px 18px",gap:10,flexWrap:"wrap",borderTop:"1px solid #e2e8f0" }}>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={gradeThis} disabled={isRevealed||!filled}
              style={{ padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                cursor:isRevealed||!filled?"not-allowed":"pointer",
                background:isRevealed||!filled?"#9ca3af":TEAL,color:"#fff",
                boxShadow:isRevealed||!filled?"none":`0 2px 8px ${TEAL}44` }}>
              Check Answers
            </button>
            <button onClick={clearThis}
              style={{ padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                cursor:"pointer",background:"#64748b",color:"#fff" }}>Clear</button>
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
            {scoreBadge}
            {cur < QUESTIONS.length-1
              ? <button onClick={() => setCur(c => c+1)}
                  style={{ padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                    cursor:"pointer",background:"#10b981",color:"#fff" }}>Next →</button>
              : <button onClick={() => { if(allGraded) setScreen("results"); else { gradeThis(); setTimeout(()=>setScreen("results"),100); } }}
                  style={{ padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                    cursor:"pointer",background:"#10b981",color:"#fff" }}>Final Score</button>
            }
          </div>
        </div>
      </div>

      {allGraded && screen==="quiz" && (
        <div style={{ marginTop:14,textAlign:"center" }}>
          <button onClick={() => setScreen("results")}
            style={{ padding:"10px 40px",borderRadius:8,fontSize:14,fontWeight:600,
              border:"none",cursor:"pointer",background:"#10b981",color:"#fff" }}>See Final Score</button>
        </div>
      )}
    </div></div>
  );
}
