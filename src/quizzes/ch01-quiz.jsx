import { useState, useRef, useEffect } from "react";

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
  return (neg ? "-" : "") + (p.length > 1 ? i + "." + p[1].slice(0, 2) : i);
};
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const MONO = { fontFamily: "'JetBrains Mono','Courier New',monospace" };
const SLATE = { background: "linear-gradient(135deg,#334155,#475569)" };
const TEAL  = "#0d9488";

// ─── QUESTIONS ────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: "q28", nav: "Q28",
    title: "Q28 · Finance & Accounting Personnel",
    desc: "Select which role performs each task. Roles: CFO, Controller, Treasurer, Internal Auditor, Managerial Accountant, Financial Accountant, or Tax Accountant. Some titles may be used more than once; some may not be used.",
    type: "role_assignment",
    roles: ["CFO","Controller","Treasurer","Internal Auditor","Managerial Accountant","Financial Accountant","Tax Accountant"],
    tasks: [
      { label: "Prepares annual reports for shareholders and creditors",                 correct: "Financial Accountant"  },
      { label: "Provides quarterly summary of financial results to the CEO and board",   correct: "Controller"            },
      { label: "Provides profit and loss reports by product line",                       correct: "Managerial Accountant" },
      { label: "Calculates estimated quarterly tax payments",                            correct: "Tax Accountant"        },
      { label: "Oversees the treasurer and internal auditor",                            correct: "CFO"                   },
      { label: "Obtains sources of financing and manages short-term investments",        correct: "Treasurer"             },
      { label: "Verifies that annual report financial information is accurate",          correct: "Internal Auditor"      },
    ],
  },

  {
    id: "q30", nav: "Q30",
    title: "Q30 · Manufacturing Cost Terms",
    desc: "Classify each production cost as Direct Materials (DM), Direct Labor (DL), or Manufacturing Overhead (MOH).",
    type: "single_classifier",
    options: ["Direct Materials","Direct Labor","Manufacturing Overhead"],
    items: [
      { label: "Salaried supervisor responsible for several product lines", correct: "Manufacturing Overhead" },
      { label: "Hourly workers assembling goods",                          correct: "Direct Labor"           },
      { label: "Grease used to maintain machines",                        correct: "Manufacturing Overhead" },
      { label: "Maintenance personnel",                                   correct: "Manufacturing Overhead" },
      { label: "Bike frame used to build a racing bike",                  correct: "Direct Materials"       },
      { label: "Factory property taxes",                                  correct: "Manufacturing Overhead" },
      { label: "Glue used to assemble toys",                              correct: "Manufacturing Overhead" },
    ],
  },

  {
    id: "q32", nav: "Q32",
    title: "Q32 · Product vs. Period Cost Classification — Burns Company",
    desc: "For each cost, select (1) Product Cost or Period Cost, then (2) the subcategory. Product subcategories: Direct Materials, Direct Labor, Manufacturing Overhead. Period subcategories: Selling, General & Administrative.",
    type: "dual_classifier",
    items: [
      { label: "Salary of chief financial officer",                               d1: "Period",  d2: "General & Administrative" },
      { label: "Factory insurance",                                               d1: "Product", d2: "Manufacturing Overhead"    },
      { label: "Salary for salespeople",                                          d1: "Period",  d2: "Selling"                   },
      { label: "Raw materials used in production, easily traced to the product",  d1: "Product", d2: "Direct Materials"          },
      { label: "Computer equipment depreciation for accounting department",       d1: "Period",  d2: "General & Administrative" },
      { label: "Insurance for headquarters building",                             d1: "Period",  d2: "General & Administrative" },
      { label: "Production line workers",                                         d1: "Product", d2: "Direct Labor"              },
      { label: "Clerical support for production supervisors",                     d1: "Product", d2: "Manufacturing Overhead"    },
    ],
  },

  {
    id: "q34", nav: "Q34",
    title: "Q34 · Accounts Used to Record Product Costs",
    desc: "Match each account with the description that best explains its purpose in a manufacturing company.",
    type: "matching",
    items: [
      { given: "Raw materials inventory",    correct: "Records the cost of materials not yet put into production"                },
      { given: "Work-in-process inventory",  correct: "Records product costs for incomplete goods still in production"          },
      { given: "Finished goods inventory",   correct: "Records product costs for completed goods that are ready to sell"        },
      { given: "Cost of goods sold",         correct: "Records product costs transferred to expense when goods are sold"        },
    ],
    descriptions: [
      "Records the cost of materials not yet put into production",
      "Records product costs for incomplete goods still in production",
      "Records product costs for completed goods that are ready to sell",
      "Records product costs transferred to expense when goods are sold",
    ],
  },

  {
    id: "q38", nav: "Q38",
    title: "Q38 · Schedule of Raw Materials — Sedona Company",
    desc: "Sedona Company, September: RM inventory beginning = $110,000 | RM inventory ending = $135,000 | Raw materials purchased = $50,000 | Indirect materials used = $8,000.\n\nPrepare the schedule of raw materials placed in production.",
    type: "fill_statement",
    scheduleTitle: "Schedule of Raw Materials Placed in Production\nFor the Month Ended September 30",
    rows: [
      { label: "Raw materials inventory, beginning",          value: { given: 110000 } },
      { label: "Add: Raw materials purchased",                value: { given: 50000  } },
      { label: "Raw materials available for use",             value: { answer: 160000 }, total: true },
      { label: "Less: Raw materials inventory, ending",       value: { given: 135000 } },
      { label: "Total raw materials placed in production",    value: { answer: 25000  }, total: true },
      { label: "Less: Indirect materials",                    value: { given: 8000   } },
      { label: "Direct materials placed in production",       value: { answer: 17000  }, total: true, bold: true },
    ],
  },

  {
    id: "q39", nav: "Q39",
    title: "Q39 · Schedule of Cost of Goods Manufactured — Reid Company",
    desc: "Reid Company, March: WIP beginning = $300,000 | WIP ending = $320,000 | Direct materials = $40,000 | Direct labor = $70,000 | Manufacturing overhead = $200,000.\n\nPrepare the schedule of cost of goods manufactured.",
    type: "fill_statement",
    scheduleTitle: "Schedule of Cost of Goods Manufactured\nFor the Month Ended March 31",
    rows: [
      { label: "Work-in-process inventory, beginning",          value: { given: 300000  } },
      { label: "Add: Current period manufacturing costs",       header: true },
      { label: "Direct materials",                              value: { given: 40000   }, indent: 1 },
      { label: "Direct labor",                                  value: { given: 70000   }, indent: 1 },
      { label: "Manufacturing overhead",                        value: { given: 200000  }, indent: 1 },
      { label: "Total current period manufacturing costs",      value: { answer: 310000 }, total: true },
      { label: "Total cost of work in process",                 value: { answer: 610000 }, total: true },
      { label: "Less: Work-in-process inventory, ending",       value: { given: 320000  } },
      { label: "Cost of goods manufactured",                    value: { answer: 290000 }, total: true, bold: true },
    ],
  },

  {
    id: "q40", nav: "Q40",
    title: "Q40 · Schedule of Cost of Goods Sold — Blue Oak Company",
    desc: "Blue Oak Company, September: FG inventory beginning = $25,000 | FG inventory ending = $28,000 | Cost of goods manufactured = $17,000.\n\nPrepare the schedule of cost of goods sold.",
    type: "fill_statement",
    scheduleTitle: "Schedule of Cost of Goods Sold\nFor the Month Ended September 30",
    rows: [
      { label: "Finished goods inventory, beginning",     value: { given: 25000  } },
      { label: "Add: Cost of goods manufactured",         value: { given: 17000  } },
      { label: "Cost of goods available for sale",        value: { answer: 42000  }, total: true },
      { label: "Less: Finished goods inventory, ending",  value: { given: 28000  } },
      { label: "Cost of goods sold",                      value: { answer: 14000  }, total: true, bold: true },
    ],
  },

  {
    id: "q51", nav: "Q51",
    title: "Q51 · Full Schedules & Income Statement — Ciena, Inc.",
    desc: "Ciena, Inc. — Year ended December 31, 2011:\n• RM inventory: beginning $15,000 | ending $12,000\n• WIP inventory: beginning $825,000 | ending $900,000\n• FG inventory: beginning $615,000 | ending $525,000\n• RM purchases: $150,000 | Direct labor: $187,500 | Manufacturing overhead: $945,000\n• Selling costs: $135,000 | G&A: $360,000 | Sales revenue: $1,897,500\n• Indirect materials (portion of RM placed in production): $18,000\n\nPrepare all four schedules and statements in order.",
    type: "chained_schedules",
    chain: [
      {
        label: "(a) Schedule of Raw Materials Placed in Production",
        rows: [
          { label: "Raw materials inventory, beginning",        value: { given: 15000   } },
          { label: "Add: Raw materials purchases",              value: { given: 150000  } },
          { label: "Raw materials available for use",           value: { answer: 165000  }, total: true },
          { label: "Less: Raw materials inventory, ending",     value: { given: 12000   } },
          { label: "Raw materials placed in production",        value: { answer: 153000  }, total: true },
          { label: "Less: Indirect materials",                  value: { given: 18000   } },
          { label: "Direct materials placed in production",     value: { answer: 135000  }, total: true, bold: true },
        ],
      },
      {
        label: "(b) Schedule of Cost of Goods Manufactured",
        rows: [
          { label: "Work-in-process inventory, beginning",       value: { given: 825000  } },
          { label: "Add: Current period manufacturing costs",    header: true },
          { label: "Direct materials placed in production",      value: { given: 135000  }, indent: 1 },
          { label: "Direct labor",                               value: { given: 187500  }, indent: 1 },
          { label: "Manufacturing overhead",                     value: { given: 945000  }, indent: 1 },
          { label: "Total current period manufacturing costs",   value: { answer: 1267500 }, total: true },
          { label: "Total cost of work in process",              value: { answer: 2092500 }, total: true },
          { label: "Less: Work-in-process inventory, ending",    value: { given: 900000  } },
          { label: "Cost of goods manufactured",                 value: { answer: 1192500 }, total: true, bold: true },
        ],
      },
      {
        label: "(c) Schedule of Cost of Goods Sold",
        rows: [
          { label: "Finished goods inventory, beginning",     value: { given: 615000  } },
          { label: "Add: Cost of goods manufactured",         value: { given: 1192500 } },
          { label: "Cost of goods available for sale",        value: { answer: 1807500 }, total: true },
          { label: "Less: Finished goods inventory, ending",  value: { given: 525000  } },
          { label: "Cost of goods sold",                      value: { answer: 1282500 }, total: true, bold: true },
        ],
      },
      {
        label: "(d) Income Statement",
        rows: [
          { label: "Sales revenue",                       value: { given: 1897500  } },
          { label: "Less: Cost of goods sold",            value: { given: 1282500  } },
          { label: "Gross profit",                        value: { answer: 615000   }, total: true },
          { label: "Less: Nonmanufacturing expenses",     header: true },
          { label: "Selling costs",                       value: { given: 135000   }, indent: 1 },
          { label: "General and administrative",          value: { given: 360000   }, indent: 1 },
          { label: "Operating income",                    value: { answer: 120000   }, total: true, bold: true },
        ],
      },
    ],
  },
];

// ─── SCORING + allFilled ──────────────────────────────────────────────────────
function scoreQuestion(q, ans) {
  let total = 0, correct = 0;
  const mark = (key, expected, tol = 0) => {
    total++;
    if (tol === 0) { if (ans[key] === expected) correct++; }
    else { const r = parseInput(ans[key]||""); if (r !== null && Math.abs(r - expected) < tol) correct++; }
  };

  if (q.type === "role_assignment") {
    q.tasks.forEach((t, i) => mark(`t${i}`, t.correct));
  }
  if (q.type === "single_classifier") {
    q.items.forEach((it, i) => mark(`c${i}`, it.correct));
  }
  if (q.type === "dual_classifier") {
    q.items.forEach((it, i) => { mark(`d1_${i}`, it.d1); mark(`d2_${i}`, it.d2); });
  }
  if (q.type === "matching") {
    q.items.forEach((it, i) => mark(`m${i}`, it.correct));
  }
  if (q.type === "fill_statement") {
    q.rows.forEach((row, i) => {
      if (row.value?.answer !== undefined) mark(`r${i}`, row.value.answer, 1);
    });
  }
  if (q.type === "chained_schedules") {
    q.chain.forEach((sched, ci) => {
      sched.rows.forEach((row, ri) => {
        if (row.value?.answer !== undefined) mark(`s${ci}_r${ri}`, row.value.answer, 1);
      });
    });
  }
  return { total, correct };
}

function allFilled(q, ans) {
  if (q.type === "role_assignment")   return q.tasks.every((_, i) => !!ans[`t${i}`]);
  if (q.type === "single_classifier") return q.items.every((_, i) => !!ans[`c${i}`]);
  if (q.type === "dual_classifier")   return q.items.every((_, i) => ans[`d1_${i}`] && ans[`d2_${i}`]);
  if (q.type === "matching")          return q.items.every((_, i) => !!ans[`m${i}`]);
  if (q.type === "fill_statement")
    return q.rows.every((row, i) => row.value?.answer === undefined || !!ans[`r${i}`]);
  if (q.type === "chained_schedules")
    return q.chain.every((sched, ci) =>
      sched.rows.every((row, ri) => row.value?.answer === undefined || !!ans[`s${ci}_r${ri}`]));
  return true;
}

// ─── SHARED ATOMS ─────────────────────────────────────────────────────────────
function NumInput({ stateKey, ans, setAns, correct, tol = 1, checked, width = 120 }) {
  const raw = parseInput(ans[stateKey] || "");
  const ok  = checked && raw !== null && Math.abs(raw - correct) < tol;
  const bad = checked && ans[stateKey] && (raw === null || Math.abs(raw - correct) >= tol);
  const noA = checked && !ans[stateKey];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <input
        value={ans[stateKey] || ""}
        disabled={checked}
        placeholder="0"
        onChange={e => !checked && setAns(p => ({ ...p, [stateKey]: fmtNum(e.target.value) }))}
        style={{
          width, padding:"6px 8px", textAlign:"right", outline:"none",
          ...MONO, fontSize:13,
          border: `1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
          borderRadius:6,
          background: ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
          color: ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a",
          transition:"all .15s",
        }}
      />
      {ok        && <span style={{ color:"#10b981", fontWeight:700, fontSize:13 }}>✓</span>}
      {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600 }}>→ {fmtDisplay(correct)}</span>}
    </div>
  );
}

// ─── ROLE ASSIGNMENT ──────────────────────────────────────────────────────────
function RoleAssignmentBody({ q, ans, setAns, checked }) {
  return (
    <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8 }}>
      {q.tasks.map((task, i) => {
        const k = `t${i}`;
        const ok  = checked && ans[k] === task.correct;
        const bad = checked && ans[k] && ans[k] !== task.correct;
        const noA = checked && !ans[k];
        return (
          <div key={i} style={{
            display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
            background: checked ? (ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff") : "#fff",
            border:`1.5px solid ${checked?(ok?"#10b981":bad||noA?"#ef4444":"#e2e8f0"):"#e2e8f0"}`,
            borderRadius:8, transition:"all .2s",
          }}>
            <span style={{ flex:1, fontSize:13, color:"#374151", lineHeight:1.5 }}>{task.label}</span>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <select
                value={ans[k]||""}
                disabled={checked}
                onChange={e => !checked && setAns(p=>({...p,[k]:e.target.value}))}
                style={{
                  padding:"6px 8px", borderRadius:6, fontSize:12.5, minWidth:175, cursor:"pointer",
                  border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                  background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
                  color:ans[k]?"#0f172a":"#94a3b8", outline:"none",
                }}>
                <option value="">— Select role —</option>
                {q.roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {ok        && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
              {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600 }}>→ {task.correct}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SINGLE CLASSIFIER ────────────────────────────────────────────────────────
function SingleClassifierBody({ q, ans, setAns, checked }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", margin:"0 16px 16px" }}>
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:"1fr 200px" }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:12 }}>Cost Item</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:12 }}>Classification</div>
      </div>
      {q.items.map((item, i) => {
        const k  = `c${i}`;
        const ok  = checked && ans[k] === item.correct;
        const bad = checked && ans[k] && ans[k] !== item.correct;
        const noA = checked && !ans[k];
        return (
          <div key={i} style={{
            display:"grid", gridTemplateColumns:"1fr 200px",
            background: checked?(ok?"#f0fdf4":bad||noA?"#fef2f2":i%2===0?"#fff":"#f8fafc"):i%2===0?"#fff":"#f8fafc",
            borderBottom: i < q.items.length-1 ? "1px solid #f0f4f8":"none",
            alignItems:"center", transition:"background .2s",
          }}>
            <div style={{ padding:"9px 12px", fontSize:13, color:"#374151" }}>{item.label}</div>
            <div style={{ padding:"6px 8px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <select
                  value={ans[k]||""}
                  disabled={checked}
                  onChange={e => !checked && setAns(p=>({...p,[k]:e.target.value}))}
                  style={{
                    flex:1, padding:"5px 6px", borderRadius:6, fontSize:12, cursor:"pointer",
                    border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                    background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
                    outline:"none", color:ans[k]?"#0f172a":"#94a3b8",
                  }}>
                  <option value="">— Select —</option>
                  {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {ok        && <span style={{ color:"#10b981", fontWeight:700, fontSize:13 }}>✓</span>}
              </div>
              {(bad||noA) && <div style={{ fontSize:10.5, color:"#ef4444", fontWeight:600, marginTop:2 }}>→ {item.correct}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DUAL CLASSIFIER ─────────────────────────────────────────────────────────
const D2_OPTS = {
  "Product": ["Direct Materials","Direct Labor","Manufacturing Overhead"],
  "Period":  ["Selling","General & Administrative"],
};

function DualClassifierBody({ q, ans, setAns, checked }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", margin:"0 16px 16px" }}>
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:"1fr 160px 205px" }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Cost Item</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Product or Period?</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Subcategory</div>
      </div>
      {q.items.map((item, i) => {
        const k1 = `d1_${i}`, k2 = `d2_${i}`;
        const v1 = ans[k1]||"", v2 = ans[k2]||"";
        const ok1  = checked && v1 === item.d1;
        const bad1 = checked && v1 && v1 !== item.d1;
        const noA1 = checked && !v1;
        const ok2  = checked && v2 === item.d2;
        const bad2 = checked && v2 && v2 !== item.d2;
        const noA2 = checked && !v2;
        const subOpts = D2_OPTS[v1] || [];
        const bg = i%2===0?"#fff":"#f8fafc";
        return (
          <div key={i} style={{
            display:"grid", gridTemplateColumns:"1fr 160px 205px",
            background: checked?((ok1&&ok2)?"#f0fdf4":(bad1||bad2||noA1||noA2)?"#fef2f2":bg):bg,
            borderBottom: i < q.items.length-1 ? "1px solid #f0f4f8":"none",
            alignItems:"center", transition:"background .2s",
          }}>
            <div style={{ padding:"9px 12px", fontSize:12.5, color:"#374151", lineHeight:1.45 }}>{item.label}</div>
            <div style={{ padding:"4px 8px" }}>
              <select value={v1} disabled={checked}
                onChange={e => { const nv=e.target.value; !checked && setAns(p=>({...p,[k1]:nv,[k2]:""})); }}
                style={{
                  width:"100%", padding:"5px 6px", borderRadius:6, fontSize:12, cursor:"pointer",
                  border:`1.5px solid ${ok1?"#10b981":bad1||noA1?"#ef4444":"#e2e8f0"}`,
                  background:ok1?"#f0fdf4":bad1||noA1?"#fef2f2":"#fff",
                  color:v1?"#0f172a":"#94a3b8", outline:"none",
                }}>
                <option value="">—</option>
                <option value="Product">Product</option>
                <option value="Period">Period</option>
              </select>
              {(bad1||noA1) && <div style={{ fontSize:10, color:"#ef4444", fontWeight:600, mt:2 }}>→ {item.d1}</div>}
            </div>
            <div style={{ padding:"4px 8px" }}>
              <select value={v2} disabled={checked||!v1}
                onChange={e => !checked && setAns(p=>({...p,[k2]:e.target.value}))}
                style={{
                  width:"100%", padding:"5px 6px", borderRadius:6, fontSize:12, cursor:v1?"pointer":"default",
                  border:`1.5px solid ${ok2?"#10b981":bad2||noA2?"#ef4444":"#e2e8f0"}`,
                  background:ok2?"#f0fdf4":bad2||noA2?"#fef2f2":"#fff",
                  color:v2?"#0f172a":"#94a3b8", outline:"none",
                  opacity: v1 ? 1 : 0.45,
                }}>
                <option value="">—</option>
                {subOpts.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
              {(bad2||noA2) && <div style={{ fontSize:10, color:"#ef4444", fontWeight:600 }}>→ {item.d2}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MATCHING ────────────────────────────────────────────────────────────────
function MatchingBody({ q, ans, setAns, checked }) {
  return (
    <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8 }}>
      {q.items.map((item, i) => {
        const k  = `m${i}`;
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
            <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:6 }}>
              <span style={{
                background:TEAL, color:"#fff", borderRadius:5, padding:"2px 8px",
                fontSize:11.5, fontWeight:700, flexShrink:0, marginTop:1,
              }}>ACCOUNT</span>
              <span style={{ fontSize:13, color:"#0f172a", fontWeight:600 }}>{item.given}</span>
            </div>
            <select value={ans[k]||""} disabled={checked}
              onChange={e => !checked && setAns(p=>({...p,[k]:e.target.value}))}
              style={{
                width:"100%", padding:"7px 10px", borderRadius:6, fontSize:12.5, cursor:"pointer",
                border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
                color:ans[k]?"#0f172a":"#94a3b8", outline:"none",
              }}>
              <option value="">— Select description —</option>
              {q.descriptions.map((d,di)=><option key={di} value={d}>{d}</option>)}
            </select>
            {ok        && <div style={{ marginTop:5, fontSize:12, color:"#065f46", fontWeight:600 }}>✓ Correct</div>}
            {(bad||noA)&& <div style={{ marginTop:5, fontSize:11.5, color:"#ef4444", fontWeight:600 }}>→ {item.correct}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── FILL STATEMENT (shared by standalone + chained) ─────────────────────────
function FillStatementRows({ rows, ans, setAns, checked, prefix="" }) {
  return (
    <>
      {rows.map((row, i) => {
        if (row.header) {
          return (
            <div key={i} style={{
              padding:"7px 14px", background:"#f1f5f9",
              borderBottom:"1px solid #e2e8f0",
              fontSize:12.5, fontWeight:700, color:"#475569",
            }}>{row.label}</div>
          );
        }
        const isTotal = !!row.total;
        const isBold  = !!row.bold;
        const indent  = row.indent || 0;
        const val     = row.value;
        const bg      = isTotal ? "#f1f5f9" : (i%2===0 ? "#fff" : "#f8fafc");
        const k       = `${prefix}r${i}`;

        if (val?.given !== undefined) {
          return (
            <div key={i} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:`${isTotal?9:7}px 14px`, background:bg,
              paddingLeft: 14 + indent * 20,
              borderBottom:"1px solid #f0f4f8",
              borderTop: isTotal ? "1.5px solid #cbd5e1":"none",
            }}>
              <span style={{ fontSize:13, color:isBold?"#0f172a":"#374151", fontWeight:isBold?700:400 }}>
                {row.label}
              </span>
              <span style={{ ...MONO, fontSize:13, color:"#64748b", fontWeight:isBold?700:400 }}>
                {fmtDisplay(val.given)}
              </span>
            </div>
          );
        }

        if (val?.answer !== undefined) {
          const raw = parseInput(ans[k]||"");
          const ok  = checked && raw !== null && Math.abs(raw - val.answer) < 1;
          const bad = checked && ans[k] && (raw === null || Math.abs(raw - val.answer) >= 1);
          const noA = checked && !ans[k];
          return (
            <div key={i} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:`${isTotal?7:5}px 14px`,
              paddingLeft: 14 + indent * 20,
              background: checked?(ok?"#f0fdf4":bad||noA?"#fef2f2":bg):bg,
              borderBottom:"1px solid #f0f4f8",
              borderTop: isTotal ? "1.5px solid #cbd5e1":"none",
              transition:"background .2s",
            }}>
              <span style={{ fontSize:13, color:isBold?"#0f172a":"#374151", fontWeight:isBold?700:400 }}>
                {row.label}
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input
                  value={ans[k]||""} disabled={checked} placeholder="0"
                  onChange={e => !checked && setAns(p=>({...p,[k]:fmtNum(e.target.value)}))}
                  style={{
                    width:130, padding:"5px 8px", textAlign:"right", outline:"none",
                    ...MONO, fontSize:13, fontWeight:isBold?700:400,
                    border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                    borderRadius:6,
                    background:ok?"#dcfce7":bad||noA?"#fee2e2":"#fff",
                    color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a",
                    transition:"all .15s",
                  }}
                />
                {ok        && <span style={{ color:"#10b981", fontWeight:700, minWidth:14 }}>✓</span>}
                {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600, minWidth:90 }}>→ {fmtDisplay(val.answer)}</span>}
              </div>
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

function FillStatementBody({ q, ans, setAns, checked, prefix="" }) {
  return (
    <div style={{ margin:"0 16px 16px", border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      {q.scheduleTitle && (
        <div style={{ ...SLATE, padding:"8px 14px", color:"#fff" }}>
          {q.scheduleTitle.split("\n").map((line,i)=>(
            <div key={i} style={{ fontSize:i===0?12.5:11, fontWeight:i===0?700:400 }}>{line}</div>
          ))}
        </div>
      )}
      <FillStatementRows rows={q.rows} ans={ans} setAns={setAns} checked={checked} prefix={prefix} />
    </div>
  );
}

// ─── CHAINED SCHEDULES ───────────────────────────────────────────────────────
function ChainedSchedulesBody({ q, ans, setAns, checked }) {
  return (
    <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:0 }}>
      {q.chain.map((sched, ci) => (
        <div key={ci}>
          {ci > 0 && (
            <div style={{ display:"flex", justifyContent:"center", alignItems:"center",
              padding:"10px 0", color:"#94a3b8", fontSize:22, userSelect:"none" }}>
              ▼
            </div>
          )}
          <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
            <div style={{ ...SLATE, padding:"8px 12px" }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:"#fff" }}>{sched.label}</div>
            </div>
            <FillStatementRows
              rows={sched.rows} ans={ans} setAns={setAns}
              checked={checked} prefix={`s${ci}_`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── QUESTION BODY DISPATCHER ─────────────────────────────────────────────────
function QuestionBody({ q, ans, setAns, checked }) {
  if (q.type === "role_assignment")    return <RoleAssignmentBody    q={q} ans={ans} setAns={setAns} checked={checked} />;
  if (q.type === "single_classifier")  return <SingleClassifierBody  q={q} ans={ans} setAns={setAns} checked={checked} />;
  if (q.type === "dual_classifier")    return <DualClassifierBody    q={q} ans={ans} setAns={setAns} checked={checked} />;
  if (q.type === "matching")           return <MatchingBody           q={q} ans={ans} setAns={setAns} checked={checked} />;
  if (q.type === "fill_statement")     return <FillStatementBody      q={q} ans={ans} setAns={setAns} checked={checked} />;
  if (q.type === "chained_schedules")  return <ChainedSchedulesBody  q={q} ans={ans} setAns={setAns} checked={checked} />;
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
      x:Math.random()*W, y:-Math.random()*H*.4,
      w:Math.random()*10+4, h:Math.random()*6+2,
      vx:(Math.random()-.5)*6, vy:Math.random()*4+1,
      rot:Math.random()*360, rv:(Math.random()-.5)*10,
      col:cols[~~(Math.random()*cols.length)], life:1, dec:.002+Math.random()*.003,
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
        const dot = p===null ? null : p===100 ? "#10b981" : p>=60 ? "#d97706" : "#ef4444";
        return (
          <button key={i} onClick={() => setCurrent(i)}
            style={{
              padding:"5px 14px", borderRadius:20, cursor:"pointer", fontSize:12.5, fontWeight:600,
              border:`1.5px solid ${active?TEAL:"#e2e8f0"}`,
              background:active?TEAL+"18":"#fff",
              color:active?TEAL:"#64748b",
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

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
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

// ─── RESULTS SCREEN ──────────────────────────────────────────────────────────
function ResultsScreen({ grades, onRetry, onReview }) {
  const total   = Object.values(grades).reduce((s,g)=>s+g.total,0);
  const correct = Object.values(grades).reduce((s,g)=>s+g.correct,0);
  const p = pct(correct, total);
  const c = p===100?"#10b981":p>=70?"#d97706":"#ef4444";
  const wrongCount = QUESTIONS.filter((_,i) => grades[i] && grades[i].correct < grades[i].total).length;
  return (
    <div style={{ position:"relative", overflow:"hidden" }}>
      <Confetti active={p===100} />
      <div style={{ textAlign:"center", padding:"40px 20px 24px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", letterSpacing:1.5,
          textTransform:"uppercase", marginBottom:16 }}>Chapter 1 · Final Score</div>
        <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center",
          padding:"20px 52px", borderRadius:12, background:"#f8fafc", border:`2px solid ${c}22`, marginBottom:20 }}>
          <div style={{ fontSize:56, fontWeight:800, color:c, lineHeight:1 }}>
            {correct}<span style={{ fontSize:28, color:"#94a3b8" }}>/{total}</span>
          </div>
          <div style={{ fontSize:14, color:c, marginTop:4, fontWeight:700 }}>{p}%</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:24 }}>
          {QUESTIONS.map((q,i) => {
            const g = grades[i]; if (!g) return null;
            const qp = pct(g.correct, g.total);
            const qc = qp===100?"#10b981":qp>=70?"#d97706":"#ef4444";
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
              color:"#fff", fontSize:13.5, fontWeight:600, cursor:"pointer" }}>
            Try Again
          </button>
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
export default function Ch01Quiz({ onComplete } = {}) {
  const [current,  setCurrent]  = useState(0);
  const [answers,  setAnswers]  = useState(QUESTIONS.map(() => ({})));
  const [checked,  setChecked]  = useState(QUESTIONS.map(() => false));
  const [grades,   setGrades]   = useState({});
  const [screen,   setScreen]   = useState("quiz");
  const [revIdx,   setRevIdx]   = useState(0);
  const reportedResult = useRef(false);

  const q        = QUESTIONS[current];
  const ans      = answers[current];
  const isChkd   = checked[current];
  const setAns   = fn => setAnswers(prev => { const n=[...prev]; n[current]=fn(n[current]); return n; });
  const filled   = allFilled(q, ans);
  const allDone  = QUESTIONS.every((_,i) => checked[i]);
  const wrongQs  = QUESTIONS.filter((_,i) => grades[i] && grades[i].correct < grades[i].total);

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
    setGrades({});
    setScreen("quiz");
    setCurrent(0);
    setRevIdx(0);
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
      chapterId: "ch01",
      chapterLabel: "Chapter 1",
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

  const Desc = ({rq}) => (
    <div style={{ margin:"10px 16px 4px", padding:"12px 14px", background:"#fff",
      border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, lineHeight:1.7 }}>
      <div style={{ fontWeight:700, fontSize:13.5, marginBottom:4, color:"#0f172a" }}>{rq.title}</div>
      <div style={{ color:"#475569" }}>
        {rq.desc.split("\n").map((line,i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  );

  // Review screen
  if (screen === "review" && wrongQs.length > 0) {
    const rq = wrongQs[revIdx];
    const rIdx = QUESTIONS.indexOf(rq);
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
            Review mode — correct answers shown below each field
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

  // Results screen
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

  // Quiz screen
  const g = grades[current];
  const scoreBadge = isChkd && g ? (() => {
    const p = pct(g.correct, g.total);
    const c = p===100?"#10b981":p>=70?"#d97706":"#ef4444";
    return <span style={{ fontSize:13, fontWeight:700, color:c, background:c+"18",
      padding:"4px 12px", borderRadius:20, border:`1px solid ${c}33` }}>{g.correct}/{g.total} · {p}%</span>;
  })() : null;

  return (
    <div style={wrap}><style>{CSS}</style><div style={inner}>
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, flexWrap:"wrap" }}>
          <h1 style={{ fontWeight:800, fontSize:22, margin:0 }}>Chapter 1 — Introduction to Managerial Accounting</h1>
        </div>
        <p style={{ fontSize:12, color:"#64748b", margin:"3px 0 0" }}>
          Q28 · Q30 · Q32 · Q34 · Q38 · Q39 · Q40 · Q51 — Roles, Cost Classification & Financial Schedules
        </p>
      </div>
      <div style={card}>
        <NavRow questions={QUESTIONS} current={current} setCurrent={setCurrent} grades={grades} />
        {Object.keys(grades).length > 0 && <ProgressBar grades={grades} />}
        <Desc rq={q} />
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
                cursor:"pointer", background:"#64748b", color:"#fff" }}>
              Clear
            </button>
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
