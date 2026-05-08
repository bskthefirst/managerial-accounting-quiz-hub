import { useState, useRef, useEffect, useMemo } from "react";

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const fmtDisplay = (n) => {
  if (n === null || n === undefined || n === "") return "";
  const num = typeof n === "string"
    ? parseFloat(n.replace(/[$,()]/g, "")) * (n.includes("(") ? -1 : 1) : n;
  if (isNaN(num)) return "";
  const abs = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: num % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: num % 1 !== 0 ? 2 : 0,
  });
  return num < 0 ? `(${abs})` : abs;
};
const parseInput = (s) => {
  if (!s || s.trim() === "") return null;
  const neg = s.includes("(") || s.trim().startsWith("-");
  const num = parseFloat(s.replace(/[$,()\-\s]/g, ""));
  return isNaN(num) ? null : (neg ? -num : num);
};
const fmtNum = (v) => {
  const neg = v.trim().startsWith("-");
  const s = v.replace(/[^0-9.]/g, "");
  if (!s) return neg ? "-" : "";
  const p = s.split(".");
  const i = parseInt(p[0] || "0", 10).toLocaleString();
  return (neg ? "-" : "") + (p.length > 1 ? i + "." + p[1].slice(0, 4) : i);
};
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const MONO  = { fontFamily: "'JetBrains Mono','Courier New',monospace" };
const SLATE = { background: "linear-gradient(135deg,#334155,#475569)" };
const TEAL  = "#0d9488";

// ─── QUESTIONS ────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: "q26", nav: "Q26",
    title: "Q26 · Cost Drivers — Ehrman Company",
    desc: "Ehrman Company identified six activity cost pools (Steps 1–2 of ABC). Perform Step 3: match each activity to its most appropriate cost driver.",
    type: "matching",
    items: [
      { given: "Purchasing raw materials",                           correct: "Number of purchase orders processed" },
      { given: "Inspecting raw materials",                          correct: "Number of inspections performed"     },
      { given: "Storing raw materials",                             correct: "Days in storage"                     },
      { given: "Maintaining production equipment",                  correct: "Maintenance hours"                   },
      { given: "Setting up machines to produce batches of product", correct: "Number of machine setups"           },
      { given: "Testing finished products",                         correct: "Number of tests performed"           },
    ],
    descriptions: [
      "Number of tests performed",
      "Maintenance hours",
      "Number of purchase orders processed",
      "Days in storage",
      "Number of machine setups",
      "Number of inspections performed",
    ],
  },

  {
    id: "q28", nav: "Q28",
    title: "Q28 · Value-Added vs. Non-Value-Added — Novak Corporation",
    desc: "Novak Corporation manufactures custom-made kayaks. Classify each activity as Value-Added or Non-Value-Added.",
    type: "single_classifier",
    options: ["Value-Added", "Non-Value-Added"],
    items: [
      { label: "Storing parts and materials",                          correct: "Non-Value-Added" },
      { label: "Queuing orders before beginning production",           correct: "Non-Value-Added" },
      { label: "Assembling kayaks",                                    correct: "Value-Added"     },
      { label: "Waiting for materials to arrive to continue production", correct: "Non-Value-Added" },
      { label: "Painting kayaks",                                      correct: "Value-Added"     },
      { label: "Designing kayaks to maximize comfort",                 correct: "Value-Added"     },
      { label: "Scrapping defective materials",                        correct: "Non-Value-Added" },
    ],
  },

  {
    id: "q30", nav: "Q30",
    title: "Q30 · Overhead Allocation Rates — San Juan Company",
    desc: "San Juan Company overhead budget: Cutting dept $100,000 | Assembly dept $300,000 | Finishing dept $200,000 | Total $600,000.\nAllocation bases: Plantwide = 40,000 total DL hours | Cutting = 20,000 machine hours | Assembly = 25,000 DL hours | Finishing = $100,000 DL cost.",
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Plantwide Predetermined Overhead Rate",
        type: "single_calc",
        rows: [
          { label: "Total estimated manufacturing overhead",         value: { answer: 600000 } },
          { label: "Total estimated direct labor hours",             value: { answer: 40000  } },
          { label: "Predetermined overhead rate ($ per DL hour)",   value: { answer: 15     }, tol: 0.01, total: true },
        ],
      },
      {
        partLabel: "(b) Department Predetermined Overhead Rates",
        type: "dept_rates_table",
        depts: [
          { name: "Cutting",   rate: 5,  tol: 0.01, correct: "Machine hours"     },
          { name: "Assembly",  rate: 12, tol: 0.01, correct: "Direct labor hours" },
          { name: "Finishing", rate: 2,  tol: 0.01, correct: "Direct labor cost"  },
        ],
        baseOptions: ["Machine hours", "Direct labor hours", "Direct labor cost"],
      },
    ],
  },

  {
    id: "q31", nav: "Q31",
    title: "Q31 · ABC Product Cost — Stillwater Company",
    desc: "Stillwater Company — Annual activity pool estimates:\n• Ordering parts: $400,000 estimated OH | 5,000 purchase requisitions\n• Tracking inventory of parts: $560,000 estimated OH | 80,000 parts purchased\n• Running machines: $350,000 estimated OH | 7,000 machine hours\n• Inspecting finished products: $200,000 estimated OH | 1,000 inspection hours\n\nProduct data (January):\n• Z1: DM $100/unit | DL $35/unit | 250 units produced\n• Z2: DM $75/unit | DL $25/unit | 500 units produced\n• Z3: DM $200/unit | DL $70/unit | 700 units produced\n\nActual cost driver activity (January):\n• Purchase requisitions: Z1 = 50 | Z2 = 70 | Z3 = 100\n• Parts purchased: Z1 = 4,000 | Z2 = 3,300 | Z3 = 3,600\n• Machine hours: Z1 = 330 | Z2 = 240 | Z3 = 310\n• Inspection hours: Z1 = 10 | Z2 = 50 | Z3 = 30",
    type: "multi_part",
    sticky: true,
    parts: [
      {
        partLabel: "(a) Predetermined Overhead Rate per Activity (Step 4)",
        type: "abc_rate_table",
        activities: [
          { name: "Ordering parts",               driver: "Purchase requisitions", rate: 80,  tol: 0.01 },
          { name: "Tracking inventory of parts",  driver: "Parts purchased",       rate: 7,   tol: 0.01 },
          { name: "Running machines",             driver: "Machine hours",         rate: 50,  tol: 0.01 },
          { name: "Inspecting finished products", driver: "Inspection hours",      rate: 200, tol: 0.01 },
        ],
      },
      {
        partLabel: "(b) Overhead Allocated to Each Product — January (Step 5)",
        type: "abc_allocation_grid",
        activities: ["Ordering parts", "Tracking inventory of parts", "Running machines", "Inspecting finished products"],
        products: ["Z1", "Z2", "Z3"],
        grid: [
          [4000, 5600, 8000],
          [28000, 23100, 25200],
          [16500, 12000, 15500],
          [2000, 10000, 6000],
        ],
        totals: [50500, 50700, 54700],
      },
      {
        partLabel: "(c) Overhead Cost per Unit — January",
        type: "product_unit_cost",
        tol: 0.05,
        products: [
          { name: "Z1", answer: 202.00 },
          { name: "Z2", answer: 101.40 },
          { name: "Z3", answer: 78.14  },
        ],
      },
      {
        partLabel: "(d) Product Cost per Unit — January",
        type: "product_unit_cost",
        tol: 0.05,
        products: [
          { name: "Z1", answer: 337.00  },
          { name: "Z2", answer: 201.40  },
          { name: "Z3", answer: 348.14  },
        ],
      },
    ],
  },

  {
    id: "q32", nav: "Q32",
    title: "Q32 · Journal Entries for Applied Overhead — Caspian Company",
    desc: "Caspian Company overhead rates:\n• Plantwide: 150% of direct labor cost\n• Dept rates: Machining dept = $55/machine hour | Assembly dept = $35/direct labor hour\n• ABC rates: Purchase requisitions = $15/requisition | Production setup = $50/setup | Quality control = $70/inspection\n\nActual activity for the year:\n• Direct labor costs: $80,000\n• Machining dept: 1,000 machine hours | Assembly dept: 1,200 direct labor hours\n• Purchase requisitions processed: 900 | Production setups: 1,300 | Products inspected: 400",
    type: "multi_part",
    sticky: true,
    parts: [
      {
        partLabel: "(a) Plantwide Method — Calculate overhead applied and record the journal entry",
        type: "multi_calc_je",
        calcRows: [
          { label: "Total overhead applied",  answer: 120000, tol: 1, total: true },
        ],
        accountPool: ["Work-in-Process Inventory","Manufacturing Overhead","Raw Materials Inventory","Finished Goods Inventory","Cost of Goods Sold"],
        entries: [{
          label: "Record overhead applied to production",
          rows: [
            { side: "Dr", account: "Work-in-Process Inventory", amount: 120000 },
            { side: "Cr", account: "Manufacturing Overhead",    amount: 120000 },
          ],
        }],
      },
      {
        partLabel: "(b) Department Method — Calculate overhead applied and record the journal entry",
        type: "multi_calc_je",
        calcRows: [
          { label: "Machining department overhead applied",  answer: 55000, tol: 1 },
          { label: "Assembly department overhead applied",   answer: 42000, tol: 1 },
          { label: "Total overhead applied",                 answer: 97000, tol: 1, total: true },
        ],
        accountPool: ["Work-in-Process Inventory","Manufacturing Overhead","Raw Materials Inventory","Finished Goods Inventory","Cost of Goods Sold"],
        entries: [{
          label: "Record overhead applied to production",
          rows: [
            { side: "Dr", account: "Work-in-Process Inventory", amount: 97000 },
            { side: "Cr", account: "Manufacturing Overhead",    amount: 97000 },
          ],
        }],
      },
      {
        partLabel: "(c) Activity-Based Costing Method — Calculate overhead applied and record the journal entry",
        type: "multi_calc_je",
        calcRows: [
          { label: "Purchase requisitions overhead",  answer: 13500,  tol: 1 },
          { label: "Production setup overhead",       answer: 65000,  tol: 1 },
          { label: "Quality control overhead",        answer: 28000,  tol: 1 },
          { label: "Total overhead applied",          answer: 106500, tol: 1, total: true },
        ],
        accountPool: ["Work-in-Process Inventory","Manufacturing Overhead","Raw Materials Inventory","Finished Goods Inventory","Cost of Goods Sold"],
        entries: [{
          label: "Record overhead applied to production",
          rows: [
            { side: "Dr", account: "Work-in-Process Inventory", amount: 106500 },
            { side: "Cr", account: "Manufacturing Overhead",    amount: 106500 },
          ],
        }],
      },
    ],
  },

  {
    id: "q34", nav: "Q34",
    title: "Q34 · Cost Hierarchy — Tanaka Company",
    desc: "Tanaka Company activities and costs. Complete both parts for all eight items.",
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Classify each item in the cost hierarchy",
        type: "hierarchy_classifier",
        options: ["Unit-level", "Batch-level", "Product/Customer-level", "Facility-level"],
        items: [
          { label: "Direct materials used by workers to assemble products", correct: "Unit-level"             },
          { label: "Purchase requisitions issued for raw materials",        correct: "Batch-level"            },
          { label: "Machines set up to produce groups of products",         correct: "Batch-level"            },
          { label: "New product research and development",                  correct: "Product/Customer-level" },
          { label: "Maintenance performed on the factory building",         correct: "Facility-level"         },
          { label: "Direct labor assembling products",                      correct: "Unit-level"             },
          { label: "Product designed for a specific customer",              correct: "Product/Customer-level" },
          { label: "Factory building rent",                                 correct: "Facility-level"         },
        ],
      },
      {
        partLabel: "(b) Identify an appropriate allocation base for each item",
        type: "matching",
        items: [
          { given: "Direct materials used by workers to assemble products", correct: "Quantity of direct materials used"  },
          { given: "Purchase requisitions issued for raw materials",        correct: "Number of purchase requisitions"   },
          { given: "Machines set up to produce groups of products",         correct: "Number of setups"                  },
          { given: "New product research and development",                  correct: "R&D hours per product"             },
          { given: "Maintenance performed on the factory building",         correct: "Maintenance hours"                 },
          { given: "Direct labor assembling products",                      correct: "Direct labor hours"                },
          { given: "Product designed for a specific customer",              correct: "Design hours per customer"         },
          { given: "Factory building rent",                                 correct: "Machine hours"                     },
        ],
        descriptions: [
          "Machine hours",
          "Direct labor hours",
          "Number of setups",
          "Quantity of direct materials used",
          "Design hours per customer",
          "Maintenance hours",
          "R&D hours per product",
          "Number of purchase requisitions",
        ],
      },
    ],
  },
];

// ─── SCORING ──────────────────────────────────────────────────────────────────
function scoreMatchingPart(part, ans, pfx) {
  let total = 0, correct = 0;
  part.items.forEach((it, i) => {
    total++;
    if (ans[`${pfx}m${i}`] === it.correct) correct++;
  });
  return { total, correct };
}
function scoreClassifierPart(part, ans, pfx) {
  let total = 0, correct = 0;
  part.items.forEach((it, i) => {
    total++;
    if (ans[`${pfx}c${i}`] === it.correct) correct++;
  });
  return { total, correct };
}
function scoreSingleCalcPart(part, ans, pfx) {
  let total = 0, correct = 0;
  part.rows.forEach((row, ri) => {
    if (row.value?.answer !== undefined) {
      total++;
      const r = parseInput(ans[`${pfx}r${ri}`] || "");
      if (r !== null && Math.abs(r - row.value.answer) < (row.tol || 1)) correct++;
    }
  });
  return { total, correct };
}
function scoreJEPart(part, ans, pfx) {
  let total = 0, correct = 0;
  (part.entries || []).forEach((entry, ei) => {
    entry.rows.forEach((row, ri) => {
      total += 2;
      if (ans[`${pfx}e${ei}_r${ri}_acct`] === row.account) correct++;
      const r = parseInput(ans[`${pfx}e${ei}_r${ri}_amt`] || "");
      if (r !== null && Math.abs(r - row.amount) < 1) correct++;
    });
  });
  return { total, correct };
}
function scoreQuestion(q, ans) {
  let total = 0, correct = 0;
  const add = r => { total += r.total; correct += r.correct; };
  if (q.type === "matching")           add(scoreMatchingPart(q, ans, ""));
  if (q.type === "single_classifier")  add(scoreClassifierPart(q, ans, ""));
  if (q.type === "multi_part") {
    q.parts.forEach((part, pi) => {
      const pfx = `p${pi}_`;
      if (part.type === "single_calc")         add(scoreSingleCalcPart(part, ans, pfx));
      if (part.type === "dept_rates_table") {
        part.depts.forEach((d, di) => {
          total += 2;
          const r = parseInput(ans[`${pfx}dr_rate_${di}`] || "");
          if (r !== null && Math.abs(r - d.rate) < (d.tol || 0.01)) correct++;
          if (ans[`${pfx}dr_base_${di}`] === d.correct) correct++;
        });
      }
      if (part.type === "abc_rate_table") {
        part.activities.forEach((a, ai) => {
          total++;
          const r = parseInput(ans[`${pfx}rate_${ai}`] || "");
          if (r !== null && Math.abs(r - a.rate) < (a.tol || 0.01)) correct++;
        });
      }
      if (part.type === "abc_allocation_grid") {
        part.grid.forEach((row, ai) => {
          row.forEach((cell, pi2) => {
            total++;
            const r = parseInput(ans[`${pfx}g_${ai}_${pi2}`] || "");
            if (r !== null && Math.abs(r - cell) < 1) correct++;
          });
        });
        part.totals.forEach((tot, pi2) => {
          total++;
          const r = parseInput(ans[`${pfx}tot_${pi2}`] || "");
          if (r !== null && Math.abs(r - tot) < 1) correct++;
        });
      }
      if (part.type === "product_unit_cost") {
        part.products.forEach((p2, i) => {
          total++;
          const r = parseInput(ans[`${pfx}puc_${i}`] || "");
          if (r !== null && Math.abs(r - p2.answer) < (part.tol || 0.05)) correct++;
        });
      }
      if (part.type === "multi_calc_je") {
        part.calcRows.forEach((row, ri) => {
          total++;
          const r = parseInput(ans[`${pfx}calc_${ri}`] || "");
          if (r !== null && Math.abs(r - row.answer) < (row.tol || 1)) correct++;
        });
        add(scoreJEPart(part, ans, pfx));
      }
      if (part.type === "hierarchy_classifier") add(scoreClassifierPart(part, ans, pfx));
      if (part.type === "matching")             add(scoreMatchingPart(part, ans, pfx));
    });
  }
  return { total, correct };
}

function allFilled(q, ans) {
  if (q.type === "matching")           return q.items.every((_, i) => !!ans[`m${i}`]);
  if (q.type === "single_classifier")  return q.items.every((_, i) => !!ans[`c${i}`]);
  if (q.type === "multi_part") {
    return q.parts.every((part, pi) => {
      const pfx = `p${pi}_`;
      if (part.type === "single_calc")
        return part.rows.every((row, ri) => row.value?.answer === undefined || !!ans[`${pfx}r${ri}`]);
      if (part.type === "dept_rates_table")
        return part.depts.every((_, di) => ans[`${pfx}dr_rate_${di}`] && ans[`${pfx}dr_base_${di}`]);
      if (part.type === "abc_rate_table")
        return part.activities.every((_, ai) => !!ans[`${pfx}rate_${ai}`]);
      if (part.type === "abc_allocation_grid")
        return part.grid.every((row, ai) => row.every((_, pi2) => !!ans[`${pfx}g_${ai}_${pi2}`]))
          && part.totals.every((_, pi2) => !!ans[`${pfx}tot_${pi2}`]);
      if (part.type === "product_unit_cost")
        return part.products.every((_, i) => !!ans[`${pfx}puc_${i}`]);
      if (part.type === "multi_calc_je")
        return part.calcRows.every((_, ri) => !!ans[`${pfx}calc_${ri}`])
          && (part.entries || []).every((entry, ei) =>
              entry.rows.every((_, ri) => ans[`${pfx}e${ei}_r${ri}_acct`] && ans[`${pfx}e${ei}_r${ri}_amt`]));
      if (part.type === "hierarchy_classifier")
        return part.items.every((_, i) => !!ans[`${pfx}c${i}`]);
      if (part.type === "matching")
        return part.items.every((_, i) => !!ans[`${pfx}m${i}`]);
      return true;
    });
  }
  return true;
}

// ─── SHARED ATOMS ─────────────────────────────────────────────────────────────
function NumInput({ sk, ans, setAns, correct, tol = 1, checked, width = 120, align = "right" }) {
  const raw = parseInput(ans[sk] || "");
  const ok  = checked && raw !== null && Math.abs(raw - correct) < tol;
  const bad = checked && ans[sk]  && (raw === null || Math.abs(raw - correct) >= tol);
  const noA = checked && !ans[sk];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <input value={ans[sk] || ""} disabled={checked} placeholder="0"
        onChange={e => !checked && setAns(p => ({ ...p, [sk]: fmtNum(e.target.value) }))}
        style={{
          width, padding:"6px 8px", textAlign:align, outline:"none",
          ...MONO, fontSize:13,
          border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
          borderRadius:6,
          background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
          color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a",
          transition:"all .15s",
        }}
      />
      {ok        && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
      {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>→ {fmtDisplay(correct)}</span>}
    </div>
  );
}

// ─── MATCHING (shuffled) ──────────────────────────────────────────────────────
function MatchingBody({ q, ans, setAns, checked, prefix = "" }) {
  const shuffled = useMemo(() => [...q.descriptions].sort(() => 0.5 - Math.random()), [q.id || prefix]);
  return (
    <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8 }}>
      {q.items.map((item, i) => {
        const k = `${prefix}m${i}`;
        const ok  = checked && ans[k] === item.correct;
        const bad = checked && ans[k] && ans[k] !== item.correct;
        const noA = checked && !ans[k];
        return (
          <div key={i} style={{
            padding:"10px 14px",
            background:checked?(ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff"):"#fff",
            border:`1.5px solid ${checked?(ok?"#10b981":bad||noA?"#ef4444":"#e2e8f0"):"#e2e8f0"}`,
            borderRadius:8, transition:"all .2s",
          }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6 }}>
              <span style={{ background:TEAL, color:"#fff", borderRadius:5, padding:"2px 8px",
                fontSize:11, fontWeight:700, flexShrink:0, marginTop:1 }}>ACTIVITY</span>
              <span style={{ fontSize:13, color:"#0f172a", fontWeight:600 }}>{item.given}</span>
            </div>
            <select value={ans[k] || ""} disabled={checked}
              onChange={e => !checked && setAns(p => ({ ...p, [k]: e.target.value }))}
              style={{
                width:"100%", padding:"7px 10px", borderRadius:6, fontSize:12.5, cursor:"pointer",
                border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
                color:ans[k]?"#0f172a":"#94a3b8", outline:"none",
              }}>
              <option value="">— Select cost driver —</option>
              {shuffled.map((d, di) => <option key={di} value={d}>{d}</option>)}
            </select>
            {ok        && <div style={{ marginTop:4, fontSize:12, color:"#065f46", fontWeight:600 }}>✓ Correct</div>}
            {(bad||noA)&& <div style={{ marginTop:4, fontSize:11.5, color:"#ef4444", fontWeight:600 }}>→ {item.correct}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── SINGLE CLASSIFIER ────────────────────────────────────────────────────────
function ClassifierBody({ q, ans, setAns, checked, prefix = "", colW = 220 }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", margin:"0 16px 16px" }}>
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:`1fr ${colW}px` }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Activity</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Classification</div>
      </div>
      {q.items.map((item, i) => {
        const k  = `${prefix}c${i}`;
        const ok  = checked && ans[k] === item.correct;
        const bad = checked && ans[k] && ans[k] !== item.correct;
        const noA = checked && !ans[k];
        return (
          <div key={i} style={{
            display:"grid", gridTemplateColumns:`1fr ${colW}px`,
            background:checked?(ok?"#f0fdf4":bad||noA?"#fef2f2":i%2===0?"#fff":"#f8fafc"):i%2===0?"#fff":"#f8fafc",
            borderBottom:i<q.items.length-1?"1px solid #f0f4f8":"none",
            alignItems:"center", transition:"background .2s",
          }}>
            <div style={{ padding:"9px 12px", fontSize:13, color:"#374151", lineHeight:1.45 }}>{item.label}</div>
            <div style={{ padding:"5px 8px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <select value={ans[k] || ""} disabled={checked}
                  onChange={e => !checked && setAns(p => ({ ...p, [k]: e.target.value }))}
                  style={{
                    flex:1, padding:"5px 6px", borderRadius:6, fontSize:12, cursor:"pointer",
                    border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                    background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
                    color:ans[k]?"#0f172a":"#94a3b8", outline:"none",
                  }}>
                  <option value="">—</option>
                  {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {ok && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
              </div>
              {(bad||noA) && <div style={{ fontSize:10.5, color:"#ef4444", fontWeight:600, marginTop:2 }}>→ {item.correct}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SINGLE CALC ──────────────────────────────────────────────────────────────
function SingleCalcBody({ part, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      {part.rows.map((row, i) => {
        const k = `${prefix}r${i}`;
        const isTotal = !!row.total;
        const bg = isTotal ? "#f1f5f9" : i%2===0?"#fff":"#f8fafc";
        if (row.value?.given !== undefined) {
          return (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"8px 14px", background:bg, borderBottom:"1px solid #f0f4f8",
              borderTop:isTotal?"1.5px solid #cbd5e1":"none" }}>
              <span style={{ fontSize:13, color:"#374151" }}>{row.label}</span>
              <span style={{ ...MONO, fontSize:13, color:"#64748b" }}>{fmtDisplay(row.value.given)}</span>
            </div>
          );
        }
        const raw = parseInput(ans[k] || "");
        const tol = row.tol || 1;
        const ok  = checked && raw !== null && Math.abs(raw - row.value.answer) < tol;
        const bad = checked && ans[k] && (raw === null || Math.abs(raw - row.value.answer) >= tol);
        const noA = checked && !ans[k];
        return (
          <div key={i} style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:`${isTotal?7:5}px 14px`,
            background:checked?(ok?"#f0fdf4":bad||noA?"#fef2f2":bg):bg,
            borderBottom:"1px solid #f0f4f8",
            borderTop:isTotal?"1.5px solid #cbd5e1":"none", transition:"background .2s",
          }}>
            <span style={{ fontSize:13, color:isTotal?"#0f172a":"#374151", fontWeight:isTotal?700:400 }}>{row.label}</span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input value={ans[k] || ""} disabled={checked} placeholder="0"
                onChange={e => !checked && setAns(p => ({ ...p, [k]: fmtNum(e.target.value) }))}
                style={{
                  width:130, padding:"5px 8px", textAlign:"right", outline:"none",
                  ...MONO, fontSize:13, fontWeight:isTotal?700:400,
                  border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                  borderRadius:6,
                  background:ok?"#dcfce7":bad||noA?"#fee2e2":"#fff",
                  color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a", transition:"all .15s",
                }}
              />
              {ok        && <span style={{ color:"#10b981", fontWeight:700, minWidth:14 }}>✓</span>}
              {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600, minWidth:80 }}>→ {fmtDisplay(row.value.answer)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DEPT RATES TABLE (NEW) ───────────────────────────────────────────────────
function DeptRatesTableBody({ part, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:"140px 1fr 1fr" }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Department</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5, textAlign:"right" }}>Rate (per unit of base)</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Allocation Base</div>
      </div>
      {part.depts.map((dept, di) => {
        const kRate = `${prefix}dr_rate_${di}`;
        const kBase = `${prefix}dr_base_${di}`;
        const rawRate = parseInput(ans[kRate] || "");
        const okRate  = checked && rawRate !== null && Math.abs(rawRate - dept.rate) < (dept.tol || 0.01);
        const badRate = checked && ans[kRate] && !okRate;
        const noRate  = checked && !ans[kRate];
        const okBase  = checked && ans[kBase] === dept.correct;
        const badBase = checked && ans[kBase] && !okBase;
        const noBase  = checked && !ans[kBase];
        const bg = di%2===0?"#fff":"#f8fafc";
        return (
          <div key={di} style={{
            display:"grid", gridTemplateColumns:"140px 1fr 1fr",
            background:checked?((okRate&&okBase)?"#f0fdf4":(badRate||badBase||noRate||noBase)?"#fef2f2":bg):bg,
            borderBottom:di<part.depts.length-1?"1px solid #f0f4f8":"none",
            alignItems:"center", transition:"background .2s",
          }}>
            <div style={{ padding:"10px 12px", fontSize:13, fontWeight:600, color:"#374151" }}>{dept.name}</div>
            <div style={{ padding:"6px 10px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end" }}>
                <span style={{ fontSize:11, color:"#64748b" }}>$</span>
                <NumInput sk={kRate} ans={ans} setAns={setAns} correct={dept.rate} tol={dept.tol||0.01} checked={checked} width={90} />
              </div>
            </div>
            <div style={{ padding:"5px 10px" }}>
              <select value={ans[kBase] || ""} disabled={checked}
                onChange={e => !checked && setAns(p => ({ ...p, [kBase]: e.target.value }))}
                style={{
                  width:"100%", padding:"5px 8px", borderRadius:6, fontSize:12, cursor:"pointer",
                  border:`1.5px solid ${okBase?"#10b981":badBase||noBase?"#ef4444":"#cbd5e1"}`,
                  background:okBase?"#f0fdf4":badBase||noBase?"#fef2f2":"#fff",
                  color:ans[kBase]?"#0f172a":"#94a3b8", outline:"none",
                }}>
                <option value="">— Select base —</option>
                {part.baseOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {(badBase||noBase) && <div style={{ fontSize:10.5, color:"#ef4444", fontWeight:600, marginTop:2 }}>→ {dept.correct}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ABC RATE TABLE (NEW) ─────────────────────────────────────────────────────
function ABCRateTableBody({ part, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:"1fr 200px 150px" }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Activity</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Cost Driver</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5, textAlign:"right" }}>Rate ($)</div>
      </div>
      {part.activities.map((act, ai) => {
        const k = `${prefix}rate_${ai}`;
        const raw = parseInput(ans[k] || "");
        const ok  = checked && raw !== null && Math.abs(raw - act.rate) < (act.tol || 0.01);
        const bad = checked && ans[k] && !ok;
        const noA = checked && !ans[k];
        const bg = ai%2===0?"#fff":"#f8fafc";
        return (
          <div key={ai} style={{
            display:"grid", gridTemplateColumns:"1fr 200px 150px",
            background:checked?(ok?"#f0fdf4":bad||noA?"#fef2f2":bg):bg,
            borderBottom:ai<part.activities.length-1?"1px solid #f0f4f8":"none",
            alignItems:"center", transition:"background .2s",
          }}>
            <div style={{ padding:"9px 12px", fontSize:13, color:"#374151" }}>{act.name}</div>
            <div style={{ padding:"9px 12px", fontSize:12.5, color:"#64748b" }}>{act.driver}</div>
            <div style={{ padding:"5px 10px" }}>
              <NumInput sk={k} ans={ans} setAns={setAns} correct={act.rate} tol={act.tol||0.01} checked={checked} width={110} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ABC ALLOCATION GRID (NEW) ────────────────────────────────────────────────
function ABCAllocationGridBody({ part, ans, setAns, checked, prefix = "" }) {
  const products = part.products;
  const activities = part.activities;
  const cols = `1fr ${products.map(() => "140px").join(" ")}`;
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", overflowX:"auto" }}>
      {/* Header */}
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:cols, minWidth:560 }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Activity</div>
        {products.map(p => (
          <div key={p} style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:12,
            textAlign:"right" }}>{p}</div>
        ))}
      </div>
      {/* Data rows */}
      {activities.map((act, ai) => (
        <div key={ai} style={{
          display:"grid", gridTemplateColumns:cols, minWidth:560,
          background:ai%2===0?"#fff":"#f8fafc",
          borderBottom:"1px solid #f0f4f8", alignItems:"center",
        }}>
          <div style={{ padding:"8px 12px", fontSize:12.5, color:"#374151" }}>{act}</div>
          {products.map((p, pi2) => {
            const k = `${prefix}g_${ai}_${pi2}`;
            const correct = part.grid[ai][pi2];
            const raw = parseInput(ans[k] || "");
            const ok  = checked && raw !== null && Math.abs(raw - correct) < 1;
            const bad = checked && ans[k] && !ok;
            const noA = checked && !ans[k];
            return (
              <div key={pi2} style={{ padding:"4px 8px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                  {(bad||noA) && <span style={{ color:"#ef4444", fontSize:10, fontWeight:600 }}>→{fmtDisplay(correct)}</span>}
                  <input value={ans[k] || ""} disabled={checked} placeholder="0"
                    onChange={e => !checked && setAns(p2 => ({ ...p2, [k]: fmtNum(e.target.value) }))}
                    style={{
                      width:120, padding:"5px 8px", textAlign:"right", outline:"none",
                      ...MONO, fontSize:12.5,
                      border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                      borderRadius:6,
                      background:ok?"#dcfce7":bad||noA?"#fee2e2":"#fff",
                      color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a", transition:"all .15s",
                    }}
                  />
                  {ok && <span style={{ color:"#10b981", fontWeight:700, fontSize:12 }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {/* Total row */}
      <div style={{
        display:"grid", gridTemplateColumns:cols, minWidth:560,
        background:"#f1f5f9", borderTop:"2px solid #cbd5e1",
      }}>
        <div style={{ padding:"9px 12px", fontSize:13, fontWeight:700, color:"#0f172a" }}>
          Total overhead allocated
        </div>
        {products.map((p, pi2) => {
          const k = `${prefix}tot_${pi2}`;
          const correct = part.totals[pi2];
          const raw = parseInput(ans[k] || "");
          const ok  = checked && raw !== null && Math.abs(raw - correct) < 1;
          const bad = checked && ans[k] && !ok;
          const noA = checked && !ans[k];
          return (
            <div key={pi2} style={{ padding:"4px 8px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                {(bad||noA) && <span style={{ color:"#ef4444", fontSize:10, fontWeight:600 }}>→{fmtDisplay(correct)}</span>}
                <input value={ans[k] || ""} disabled={checked} placeholder="0"
                  onChange={e => !checked && setAns(p2 => ({ ...p2, [k]: fmtNum(e.target.value) }))}
                  style={{
                    width:120, padding:"5px 8px", textAlign:"right", outline:"none",
                    ...MONO, fontSize:13, fontWeight:700,
                    border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                    borderRadius:6,
                    background:ok?"#dcfce7":bad||noA?"#fee2e2":"#fff",
                    color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a", transition:"all .15s",
                  }}
                />
                {ok && <span style={{ color:"#10b981", fontWeight:700, fontSize:12 }}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PRODUCT UNIT COST ────────────────────────────────────────────────────────
function ProductUnitCostBody({ part, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:`1fr ${part.products.map(()=>"160px").join(" ")}` }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}></div>
        {part.products.map(p => (
          <div key={p.name} style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:12, textAlign:"right" }}>{p.name}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`1fr ${part.products.map(()=>"160px").join(" ")}`,
        background:"#f1f5f9", borderTop:"1.5px solid #cbd5e1", alignItems:"center" }}>
        <div style={{ padding:"10px 14px", fontSize:13, fontWeight:700, color:"#0f172a" }}>
          {part.partLabel?.replace(/^\([a-d]\)\s*/,"").replace("Overhead Cost per Unit — January","Overhead cost per unit").replace("Product Cost per Unit — January","Product cost per unit") || "Cost per unit"}
        </div>
        {part.products.map((p, i) => {
          const k = `${prefix}puc_${i}`;
          const raw = parseInput(ans[k] || "");
          const ok  = checked && raw !== null && Math.abs(raw - p.answer) < (part.tol || 0.05);
          const bad = checked && ans[k] && !ok;
          const noA = checked && !ans[k];
          return (
            <div key={p.name} style={{ padding:"5px 8px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                {(bad||noA) && <span style={{ color:"#ef4444", fontSize:10.5, fontWeight:600 }}>→{fmtDisplay(p.answer)}</span>}
                <input value={ans[k] || ""} disabled={checked} placeholder="0"
                  onChange={e => !checked && setAns(prev => ({ ...prev, [k]: fmtNum(e.target.value) }))}
                  style={{
                    width:130, padding:"5px 8px", textAlign:"right", outline:"none",
                    ...MONO, fontSize:13, fontWeight:700,
                    border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                    borderRadius:6,
                    background:ok?"#dcfce7":bad||noA?"#fee2e2":"#fff",
                    color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a", transition:"all .15s",
                  }}
                />
                {ok && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── JOURNAL ENTRY ROWS ───────────────────────────────────────────────────────
function JournalEntryRows({ entry, ei, ans, setAns, checked, prefix = "", accountPool }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      <div style={{ padding:"7px 12px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0",
        fontSize:12, fontWeight:700, color:"#475569" }}>{entry.label}</div>
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:"44px 1fr 150px" }}>
        <div style={{ padding:"5px 10px", fontSize:10.5, fontWeight:700, color:"#cbd5e1" }}>Dr/Cr</div>
        <div style={{ padding:"5px 10px", fontSize:10.5, fontWeight:700, color:"#cbd5e1" }}>Account</div>
        <div style={{ padding:"5px 10px", fontSize:10.5, fontWeight:700, color:"#cbd5e1", textAlign:"right" }}>Amount</div>
      </div>
      {entry.rows.map((row, ri) => {
        const aK = `${prefix}e${ei}_r${ri}_acct`;
        const mK = `${prefix}e${ei}_r${ri}_amt`;
        const av = ans[aK] || "", raw = parseInput(ans[mK] || "");
        const okA  = checked && av === row.account;
        const badA = checked && av && !okA;
        const noA2 = checked && !av;
        const okM  = checked && raw !== null && Math.abs(raw - row.amount) < 1;
        const badM = checked && ans[mK] && !okM;
        const noM  = checked && !ans[mK];
        const isCr = row.side === "Cr";
        return (
          <div key={ri} style={{
            display:"grid", gridTemplateColumns:"44px 1fr 150px", alignItems:"center",
            background:ri%2===0?"#fff":"#f9fafb",
            borderBottom:ri<entry.rows.length-1?"1px solid #f0f4f8":"none",
          }}>
            <div style={{ padding:"6px 10px" }}>
              <span style={{ display:"inline-block", padding:"2px 7px", borderRadius:5, fontSize:11.5, fontWeight:700,
                background:isCr?"#e0f2fe":"#dcfce7", color:isCr?"#0284c7":"#16a34a",
                marginLeft:isCr?10:0 }}>{row.side}</span>
            </div>
            <div style={{ padding:"4px 8px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <select value={av} disabled={checked}
                  onChange={e => !checked && setAns(p => ({ ...p, [aK]: e.target.value }))}
                  style={{
                    flex:1, padding:"5px 8px", borderRadius:6, fontSize:12, cursor:"pointer",
                    border:`1.5px solid ${okA?"#10b981":badA||noA2?"#ef4444":"#cbd5e1"}`,
                    background:okA?"#f0fdf4":badA||noA2?"#fef2f2":"#fff",
                    color:av?"#0f172a":"#94a3b8", outline:"none",
                  }}>
                  <option value="">— Account —</option>
                  {accountPool.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                {okA && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
              </div>
              {(badA||noA2) && <div style={{ fontSize:10.5, color:"#ef4444", fontWeight:600, mt:2 }}>→ {row.account}</div>}
            </div>
            <div style={{ padding:"4px 8px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                {(badM||noM) && <span style={{ fontSize:10.5, color:"#ef4444", fontWeight:600 }}>→{fmtDisplay(row.amount)}</span>}
                <input value={ans[mK] || ""} disabled={checked} placeholder="0"
                  onChange={e => !checked && setAns(p => ({ ...p, [mK]: fmtNum(e.target.value) }))}
                  style={{
                    width:110, padding:"5px 8px", textAlign:"right", outline:"none",
                    ...MONO, fontSize:12.5,
                    border:`1.5px solid ${okM?"#10b981":badM||noM?"#ef4444":"#cbd5e1"}`,
                    borderRadius:6,
                    background:okM?"#dcfce7":badM||noM?"#fee2e2":"#fff",
                    color:okM?"#065f46":badM||noM?"#7f1d1d":"#0f172a", transition:"all .15s",
                  }}
                />
                {okM && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MULTI CALC + JE (NEW) ────────────────────────────────────────────────────
function MultiCalcJEBody({ part, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Calc rows */}
      <div style={{ border:"1.5px solid #fde68a", borderRadius:8, overflow:"hidden",
        background:"#fffbeb" }}>
        <div style={{ padding:"7px 12px", background:"#fef3c7", borderBottom:"1px solid #fde68a",
          fontSize:12, fontWeight:700, color:"#92400e" }}>Calculate overhead applied</div>
        {part.calcRows.map((row, ri) => {
          const k = `${prefix}calc_${ri}`;
          const isTotal = !!row.total;
          const raw = parseInput(ans[k] || "");
          const ok  = checked && raw !== null && Math.abs(raw - row.answer) < (row.tol || 1);
          const bad = checked && ans[k] && !ok;
          const noA = checked && !ans[k];
          return (
            <div key={ri} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:`${isTotal?8:6}px 14px`,
              background:checked?(ok?"#f0fdf4":bad||noA?"#fef2f2":isTotal?"#fef9ee":"#fffbeb"):isTotal?"#fef9ee":"#fffbeb",
              borderBottom:ri<part.calcRows.length-1?"1px solid #fde68a":"none",
              borderTop:isTotal?"1.5px solid #fbbf24":"none",
              transition:"background .2s",
            }}>
              <span style={{ fontSize:13, color:isTotal?"#0f172a":"#374151", fontWeight:isTotal?700:400 }}>
                {row.label}
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input value={ans[k] || ""} disabled={checked} placeholder="0"
                  onChange={e => !checked && setAns(p => ({ ...p, [k]: fmtNum(e.target.value) }))}
                  style={{
                    width:130, padding:"5px 8px", textAlign:"right", outline:"none",
                    ...MONO, fontSize:13, fontWeight:isTotal?700:400,
                    border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#d97706"}`,
                    borderRadius:6,
                    background:ok?"#dcfce7":bad||noA?"#fee2e2":"#fff",
                    color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a", transition:"all .15s",
                  }}
                />
                {ok        && <span style={{ color:"#10b981", fontWeight:700, minWidth:14 }}>✓</span>}
                {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600, minWidth:80 }}>→ {fmtDisplay(row.answer)}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {/* Journal entries */}
      <div>
        <div style={{ fontSize:12.5, fontWeight:700, color:"#475569", marginBottom:6 }}>Journal entry:</div>
        {(part.entries || []).map((entry, ei) => (
          <JournalEntryRows key={ei} entry={entry} ei={ei}
            ans={ans} setAns={setAns} checked={checked}
            prefix={prefix} accountPool={part.accountPool || []} />
        ))}
      </div>
    </div>
  );
}

// ─── MULTI PART WRAPPER ───────────────────────────────────────────────────────
function MultiPartBody({ q, ans, setAns, checked }) {
  return (
    <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:14 }}>
      {q.parts.map((part, pi) => {
        const pfx  = `p${pi}_`;
        const pSet = fn => setAns(fn);
        return (
          <div key={pi} style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
            <div style={{ ...SLATE, padding:"8px 12px" }}>
              <span style={{ fontSize:12.5, fontWeight:700, color:"#fff" }}>{part.partLabel}</span>
            </div>
            <div style={{ padding:"12px" }}>
              {part.type === "single_calc"           && <SingleCalcBody part={part} ans={ans} setAns={pSet} checked={checked} prefix={pfx} />}
              {part.type === "dept_rates_table"      && <DeptRatesTableBody part={part} ans={ans} setAns={pSet} checked={checked} prefix={pfx} />}
              {part.type === "abc_rate_table"        && <ABCRateTableBody part={part} ans={ans} setAns={pSet} checked={checked} prefix={pfx} />}
              {part.type === "abc_allocation_grid"   && <ABCAllocationGridBody part={part} ans={ans} setAns={pSet} checked={checked} prefix={pfx} />}
              {part.type === "product_unit_cost"     && <ProductUnitCostBody part={part} ans={ans} setAns={pSet} checked={checked} prefix={pfx} />}
              {part.type === "multi_calc_je"         && <MultiCalcJEBody part={part} ans={ans} setAns={pSet} checked={checked} prefix={pfx} />}
              {part.type === "hierarchy_classifier"  && <ClassifierBody q={part} ans={ans} setAns={pSet} checked={checked} prefix={pfx} colW={180} />}
              {part.type === "matching"              && <MatchingBody q={part} ans={ans} setAns={pSet} checked={checked} prefix={pfx} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── QUESTION BODY DISPATCHER ─────────────────────────────────────────────────
function QuestionBody({ q, ans, setAns, checked }) {
  if (q.type === "matching")          return <MatchingBody q={q} ans={ans} setAns={setAns} checked={checked} />;
  if (q.type === "single_classifier") return <ClassifierBody q={q} ans={ans} setAns={setAns} checked={checked} />;
  if (q.type === "multi_part")        return <MultiPartBody q={q} ans={ans} setAns={setAns} checked={checked} />;
  return null;
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const ref = useRef(null), af = useRef(null);
  useEffect(() => {
    if (!active) return;
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width = c.parentElement.offsetWidth;
    const H = c.height = c.parentElement.offsetHeight;
    const cols = ["#0ea5e9","#10b981","#f59e0b","#f43f5e","#a855f7","#22d3ee"];
    const ps = Array.from({ length: 160 }, () => ({
      x:Math.random()*W, y:-Math.random()*H*.4, w:Math.random()*10+4, h:Math.random()*6+2,
      vx:(Math.random()-.5)*6, vy:Math.random()*4+1, rot:Math.random()*360,
      rv:(Math.random()-.5)*10, col:cols[~~(Math.random()*cols.length)], life:1,
      dec:.002+Math.random()*.003,
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
    af.current=requestAnimationFrame(go);
    return () => cancelAnimationFrame(af.current);
  },[active]);
  if(!active) return null;
  return <canvas ref={ref} style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:50 }} />;
}

// ─── NAV ROW ─────────────────────────────────────────────────────────────────
function NavRow({ questions, current, setCurrent, grades }) {
  return (
    <div style={{ display:"flex", gap:6, padding:"12px 16px 4px", flexWrap:"wrap" }}>
      {questions.map((q, i) => {
        const g = grades[i];
        const p = g ? pct(g.correct, g.total) : null;
        const active = current === i;
        const dot = p===null?null:p===100?"#10b981":p>=60?"#d97706":"#ef4444";
        return (
          <button key={i} onClick={() => setCurrent(i)}
            style={{
              padding:"5px 14px", borderRadius:20, cursor:"pointer", fontSize:12.5, fontWeight:600,
              border:`1.5px solid ${active?TEAL:"#e2e8f0"}`,
              background:active?TEAL+"18":"#fff", color:active?TEAL:"#64748b",
              display:"flex", alignItems:"center", gap:6, transition:"all .12s",
            }}>
            {q.nav}
            {dot && <span style={{ width:7, height:7, borderRadius:4, background:dot, display:"block" }} />}
          </button>
        );
      })}
    </div>
  );
}

function ProgressBar({ grades }) {
  const total   = Object.values(grades).reduce((s,g)=>s+g.total,0);
  const correct = Object.values(grades).reduce((s,g)=>s+g.correct,0);
  const p = pct(correct, total);
  const c = p===100?"#10b981":p>=70?"#d97706":"#ef4444";
  return (
    <div style={{ padding:"8px 16px 2px" }}>
      <div style={{ height:5, background:"#e2e8f0", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${p}%`, background:c, transition:"width .4s", borderRadius:3 }} />
      </div>
      <div style={{ fontSize:11, color:c, fontWeight:600, textAlign:"right", marginTop:2 }}>
        {correct}/{total} · {p}%
      </div>
    </div>
  );
}

function ResultsScreen({ grades, onRetry, onReview }) {
  const total   = Object.values(grades).reduce((s,g)=>s+g.total,0);
  const correct = Object.values(grades).reduce((s,g)=>s+g.correct,0);
  const p = pct(correct, total);
  const c = p===100?"#10b981":p>=70?"#d97706":"#ef4444";
  const wrongCount = QUESTIONS.filter((_,i)=>grades[i]&&grades[i].correct<grades[i].total).length;
  return (
    <div style={{ position:"relative", overflow:"hidden" }}>
      <Confetti active={p===100} />
      <div style={{ textAlign:"center", padding:"40px 20px 24px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", letterSpacing:1.5,
          textTransform:"uppercase", marginBottom:16 }}>Chapter 3 · Final Score</div>
        <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center",
          padding:"20px 52px", borderRadius:12, background:"#f8fafc", border:`2px solid ${c}22`, marginBottom:20 }}>
          <div style={{ fontSize:56, fontWeight:800, color:c, lineHeight:1 }}>
            {correct}<span style={{ fontSize:28, color:"#94a3b8" }}>/{total}</span>
          </div>
          <div style={{ fontSize:14, color:c, marginTop:4, fontWeight:700 }}>{p}%</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:24 }}>
          {QUESTIONS.map((q,i) => {
            const g=grades[i]; if(!g) return null;
            const qp=pct(g.correct,g.total), qc=qp===100?"#10b981":qp>=70?"#d97706":"#ef4444";
            return (
              <div key={i} style={{ padding:"4px 12px", borderRadius:20,
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
          {wrongCount > 0 && (
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
export default function Ch03Quiz({ onComplete } = {}) {
  const [current,    setCurrent]    = useState(0);
  const [answers,    setAnswers]    = useState(QUESTIONS.map(() => ({})));
  const [checked,    setChecked]    = useState(QUESTIONS.map(() => false));
  const [grades,     setGrades]     = useState({});
  const [screen,     setScreen]     = useState("quiz");
  const [revIdx,     setRevIdx]     = useState(0);
  const [stickyOpen, setStickyOpen] = useState(true);
  const reportedResult = useRef(false);

  const q         = QUESTIONS[current];
  const ans       = answers[current];
  const isChkd    = checked[current];
  const setAns    = fn => setAnswers(prev => { const n=[...prev]; n[current]=fn(n[current]); return n; });
  const filled    = allFilled(q, ans);
  const allDone   = QUESTIONS.every((_,i) => checked[i]);
  const wrongQs   = QUESTIONS.filter((_,i) => grades[i] && grades[i].correct < grades[i].total);
  const needsSticky = q.sticky === true;

  useEffect(() => { setStickyOpen(true); }, [current]);

  const gradeThis = () => {
    const g = scoreQuestion(q, ans);
    setGrades(prev => ({ ...prev, [current]: g }));
    setChecked(prev => { const n=[...prev]; n[current]=true; return n; });
  };
  const clearThis = () => {
    setAnswers(prev => { const n=[...prev]; n[current]={}; return n; });
    setChecked(prev => { const n=[...prev]; n[current]=false; return n; });
    setGrades(prev => { const n={...prev}; delete n[current]; return n; });
  };
  const resetAll = () => {
    setAnswers(QUESTIONS.map(() => ({})));
    setChecked(QUESTIONS.map(() => false));
    setGrades({}); setScreen("quiz"); setCurrent(0); setRevIdx(0);
    reportedResult.current = false;
  };

  useEffect(() => {
    if (screen !== "results" || reportedResult.current) return;
    reportedResult.current = true;
    const totals = Object.values(grades).reduce((acc, g) => ({
      correct: acc.correct + g.correct,
      total: acc.total + g.total,
    }), { correct: 0, total: 0 });
    onComplete?.({
      chapterId: "ch03",
      chapterLabel: "Chapter 3",
      ...totals,
      percent: pct(totals.correct, totals.total),
      completedAt: new Date().toISOString(),
    });
  }, [screen, grades, onComplete]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing:border-box; }
    @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    select { -webkit-appearance:auto; appearance:auto; }
    input:focus,select:focus { box-shadow:0 0 0 3px rgba(13,148,136,.18)!important; outline:none!important; }
    button:hover:not(:disabled) { filter:brightness(.92); }
    ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
  `;
  const wrap  = { minHeight:"100vh", background:"#e9eef5", color:"#0f172a", fontFamily:"'DM Sans',system-ui,sans-serif" };
  const inner = { maxWidth:900, margin:"0 auto", padding:"24px 14px" };
  const card  = { background:"#f1f5f9", borderRadius:12, border:"1.5px solid #e2e8f0", overflow:"hidden", boxShadow:"0 2px 16px rgba(0,0,0,.07)" };

  const Desc = ({ rq }) => (
    <div style={{ margin:"10px 16px 4px", padding:"12px 14px", background:"#fff",
      border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, lineHeight:1.7 }}>
      <div style={{ fontWeight:700, fontSize:13.5, marginBottom:4, color:"#0f172a" }}>{rq.title}</div>
      <div style={{ color:"#475569" }}>
        {rq.desc.split("\n").map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  );

  if (screen === "review" && wrongQs.length > 0) {
    const rq = wrongQs[revIdx], rIdx = QUESTIONS.indexOf(rq);
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={{ marginBottom:14, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <h1 style={{ fontWeight:800, fontSize:19, margin:0 }}>Review — Wrong Answers</h1>
          <span style={{ fontSize:12, background:"#fff", padding:"2px 10px", borderRadius:20,
            border:"1.5px solid #e2e8f0", fontWeight:600, color:"#6b7280" }}>{revIdx+1}/{wrongQs.length}</span>
          <button onClick={()=>setScreen("results")}
            style={{ marginLeft:"auto", padding:"7px 16px", borderRadius:8, background:"#10b981",
              border:"none", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>← Results</button>
        </div>
        <div style={card}>
          <div style={{ margin:"10px 16px 4px", padding:"8px 12px", background:"#fefce8",
            border:"1.5px solid #fde047", borderRadius:7, fontSize:12.5, color:"#854d0e", fontWeight:500 }}>
            Review mode — correct answers shown
          </div>
          <Desc rq={rq} />
          <div style={{ animation:"fadein .2s ease" }}>
            <QuestionBody q={rq} ans={answers[rIdx]} setAns={()=>{}} checked={true} />
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

  if (screen === "results") {
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={card}>
          <ResultsScreen grades={grades} onRetry={resetAll}
            onReview={()=>{setRevIdx(0);setScreen("review");}} />
        </div>
      </div></div>
    );
  }

  const g = grades[current];
  const scoreBadge = isChkd && g ? (() => {
    const p = pct(g.correct,g.total), c = p===100?"#10b981":p>=70?"#d97706":"#ef4444";
    return <span style={{ fontSize:13, fontWeight:700, color:c, background:c+"18",
      padding:"4px 12px", borderRadius:20, border:`1px solid ${c}33` }}>{g.correct}/{g.total} · {p}%</span>;
  })() : null;

  return (
    <div style={wrap}><style>{CSS}</style><div style={inner}>
      <div style={{ marginBottom:14 }}>
        <h1 style={{ fontWeight:800, fontSize:22, margin:0 }}>Chapter 3 — Activity-Based Costing</h1>
        <p style={{ fontSize:12, color:"#64748b", margin:"3px 0 0" }}>
          Q26 · Q28 · Q30 · Q31 · Q32 · Q34 — Cost Drivers, VA/NVA, Overhead Rates, ABC Allocation & Journal Entries
        </p>
      </div>

      {/* ── Sticky scenario bar for long questions ── */}
      {needsSticky && (
        <div style={{
          position:"sticky", top:0, zIndex:100,
          background:"#1e293b", borderBottom:"2px solid #0d9488",
          boxShadow:"0 3px 14px rgba(0,0,0,.3)",
          marginBottom:8, borderRadius:"0 0 8px 8px",
        }}>
          <div style={{ padding:"0 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"9px 0", cursor:"pointer", userSelect:"none" }}
              onClick={() => setStickyOpen(o => !o)}>
              <span style={{ fontSize:11.5, fontWeight:700, color:"#94a3b8",
                letterSpacing:.8, textTransform:"uppercase" }}>
                📋 Question Data — {q.title}
              </span>
              <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600,
                background:"#334155", borderRadius:20, padding:"2px 12px", border:"1px solid #475569" }}>
                {stickyOpen ? "Hide ▲" : "Show ▼"}
              </span>
            </div>
            {stickyOpen && (
              <div style={{ fontSize:12.5, color:"#cbd5e1", lineHeight:1.75,
                paddingBottom:12, borderTop:"1px solid #334155", paddingTop:8 }}>
                {q.desc.split("\n").map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={card}>
        <NavRow questions={QUESTIONS} current={current} setCurrent={setCurrent} grades={grades} />
        {Object.keys(grades).length > 0 && <ProgressBar grades={grades} />}
        {!needsSticky && <Desc rq={q} />}
        <div key={q.id} style={{ animation:"fadein .2s ease" }}>
          <QuestionBody q={q} ans={ans} setAns={setAns} checked={isChkd} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"10px 16px 16px", gap:10, flexWrap:"wrap", borderTop:"1px solid #e2e8f0" }}>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={gradeThis} disabled={isChkd||!filled}
              style={{ padding:"9px 22px", borderRadius:8, fontSize:13.5, fontWeight:600, border:"none",
                cursor:isChkd||!filled?"not-allowed":"pointer",
                background:isChkd||!filled?"#9ca3af":TEAL, color:"#fff",
                boxShadow:isChkd||!filled?"none":`0 2px 8px ${TEAL}44` }}>
              Check Answers
            </button>
            <button onClick={clearThis}
              style={{ padding:"9px 22px", borderRadius:8, fontSize:13.5, fontWeight:600, border:"none",
                cursor:"pointer", background:"#64748b", color:"#fff" }}>Clear</button>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {scoreBadge}
            {current < QUESTIONS.length-1
              ? <button onClick={()=>setCurrent(c=>c+1)}
                  style={{ padding:"9px 22px", borderRadius:8, fontSize:13.5, fontWeight:600, border:"none",
                    cursor:"pointer", background:"#10b981", color:"#fff" }}>Next →</button>
              : <button onClick={()=>{ if(allDone) setScreen("results"); else { gradeThis(); setTimeout(()=>setScreen("results"),100); } }}
                  style={{ padding:"9px 22px", borderRadius:8, fontSize:13.5, fontWeight:600, border:"none",
                    cursor:"pointer", background:"#10b981", color:"#fff" }}>Final Score</button>
            }
          </div>
        </div>
      </div>
      {allDone && screen==="quiz" && (
        <div style={{ marginTop:14, textAlign:"center" }}>
          <button onClick={()=>setScreen("results")}
            style={{ padding:"10px 40px", borderRadius:8, fontSize:14, fontWeight:600, border:"none",
              cursor:"pointer", background:"#10b981", color:"#fff" }}>See Final Score</button>
        </div>
      )}
    </div></div>
  );
}
