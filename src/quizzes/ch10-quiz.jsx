import { useState, useRef, useEffect } from "react";
import { loadQuizDraft, saveQuizDraft } from "./quiz-progress.js";

// ─── UTILS ────────────────────────────────────────────────────────────────────
const parseNum = s => {
  if (!s || !s.trim()) return null;
  const neg = s.includes("(") || s.trim().startsWith("-");
  const num = parseFloat(s.replace(/[$,()\-\s]/g,""));
  return isNaN(num) ? null : (neg ? -num : num);
};
const fmtComma = v => {
  const neg = v.trim().startsWith("-") || v.includes("(");
  const s = v.replace(/[^0-9.]/g,""); if (!s) return neg?"-":"";
  const p = s.split(".");
  const i = parseInt(p[0]||"0",10).toLocaleString();
  return (neg?"-":"")+(p.length>1?i+"."+p[1].slice(0,2):i);
};
const fmtD = n => {
  if (n===null||n===undefined) return "";
  const abs = Math.abs(n).toLocaleString();
  return n<0?`(${abs})`:abs;
};
const closeEq = (v, c, tol=1) => { const r=parseNum(v); return r!==null && Math.abs(r-c)<=tol; };
const pctCalc = (a,b) => b?Math.round(a/b*100):0;

const MONO   = {fontFamily:"'JetBrains Mono','Courier New',monospace"};
const SLATE  = {background:"linear-gradient(135deg,#334155,#475569)"};
const TEAL   = "#0d9488";
const TEAL_G = {background:"linear-gradient(135deg,#0f766e,#0d9488)"};
const GREEN_G = {background:"linear-gradient(135deg,#059669,#10b981)"};
const RED_G   = {background:"linear-gradient(135deg,#dc2626,#ef4444)"};
const INDIGO_G= {background:"linear-gradient(135deg,#4f46e5,#6366f1)"};

// ─── QUESTION DATA ─────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id:"q19", nav:"Q19",
    title:"Q19 · Materials Price Variance — Sweets Company",
    desc:"Sweets Company purchases and uses chocolate to produce boxes.\n• Standard price: $5.00 per pound\n• Actual price paid: $4.80 per pound\n• Actual quantity purchased in April: 4,000 pounds\n\nFormula: MPV = (Actual Price − Standard Price) × Actual Quantity Purchased",
    type:"formula_var",
    formulaLabel:"Materials Price Variance",
    steps:[
      {label:"Actual price per pound",              key:"v0", correct:4.80,  tol:0.01},
      {label:"Standard price per pound",            key:"v1", correct:5.00,  tol:0.01},
      {label:"Actual quantity purchased (lbs)",     key:"v2", correct:4000,  tol:1},
      {label:"Materials Price Variance",            key:"var",correct:800,   tol:1, isVar:true, fu:"Favorable"},
    ],
  },
  {
    id:"q20", nav:"Q20",
    title:"Q20 · Materials Quantity Variance — Sweets Company",
    desc:"Sweets Company standard: 2 pounds per box at $5.00 per pound.\n• Boxes produced in April: 1,000\n• Actual pounds used: 2,200\n\nFormula: MQV = (Actual Quantity Used − Standard Quantity Allowed) × Standard Price",
    type:"formula_var",
    formulaLabel:"Materials Quantity Variance",
    steps:[
      {label:"Actual quantity used (lbs)",                        key:"v0", correct:2200, tol:1},
      {label:"Standard quantity allowed (1,000 boxes × 2 lbs)",  key:"v1", correct:2000, tol:1},
      {label:"Standard price per pound",                         key:"v2", correct:5.00,  tol:0.01},
      {label:"Materials Quantity Variance",                      key:"var",correct:1000,  tol:1, isVar:true, fu:"Unfavorable"},
    ],
  },
  {
    id:"q21", nav:"Q21",
    title:"Q21 · Labor Rate Variance — Tech Company",
    desc:"Tech Company standard: $20.00 per direct labor hour.\n• August: produced 300 units | 3,200 hours worked | actual rate paid: $22 per hour\n\nFormula: LRV = (Actual Rate − Standard Rate) × Actual Hours Worked",
    type:"formula_var",
    formulaLabel:"Labor Rate Variance",
    steps:[
      {label:"Actual rate per direct labor hour",    key:"v0", correct:22,   tol:0.01},
      {label:"Standard rate per direct labor hour",  key:"v1", correct:20,   tol:0.01},
      {label:"Actual hours worked",                  key:"v2", correct:3200, tol:1},
      {label:"Labor Rate Variance",                  key:"var",correct:6400, tol:1, isVar:true, fu:"Unfavorable"},
    ],
  },
  {
    id:"q22", nav:"Q22",
    title:"Q22 · Labor Efficiency Variance — Tech Company",
    desc:"Tech Company standard: 10 direct labor hours per server at $20 per hour.\n• August: produced 300 units | 3,200 actual hours worked\n\nFormula: LEV = (Actual Hours − Standard Hours Allowed) × Standard Rate",
    type:"formula_var",
    formulaLabel:"Labor Efficiency Variance",
    steps:[
      {label:"Actual hours worked",                          key:"v0", correct:3200, tol:1},
      {label:"Standard hours allowed (300 units × 10 hrs)", key:"v1", correct:3000, tol:1},
      {label:"Standard rate per direct labor hour",         key:"v2", correct:20,   tol:0.01},
      {label:"Labor Efficiency Variance",                   key:"var",correct:4000, tol:1, isVar:true, fu:"Unfavorable"},
    ],
  },

  {
    id:"q29", nav:"Q29",
    title:"Q29 · Standard Cost & Flexible Budget — Hal's Heating",
    desc:"Hal's Heating — January master budget (300 furnaces expected):\n• Direct materials: 3 heating elements per furnace at $40 per element\n• Direct labor: 35 hours per furnace at $18 per hour\n• Variable manufacturing overhead: 35 direct labor hours at $15 per hour",
    type:"multi_part", sticky:true,
    parts:[
      {
        partLabel:"(a) Standard Cost per Unit (Figure 10.1 format)",
        type:"std_cost_table",
        rows:[
          {label:"Direct materials",            sqCorrect:3,  spCorrect:40,  scCorrect:120},
          {label:"Direct labor",                sqCorrect:35, spCorrect:18,  scCorrect:630},
          {label:"Variable mfg. overhead",      sqCorrect:35, spCorrect:15,  scCorrect:525},
          {label:"Total standard cost per unit",                             scCorrect:1275, isTotal:true},
        ],
      },
      {
        partLabel:"(b) Flexible Budget at 320 Furnaces Produced (Figure 10.2 format)",
        type:"flex_budget_table",
        actualUnits:320,
        rows:[
          {label:"Direct materials",           scCorrect:120,  totalCorrect:38400},
          {label:"Direct labor",               scCorrect:630,  totalCorrect:201600},
          {label:"Variable mfg. overhead",     scCorrect:525,  totalCorrect:168000},
          {label:"Total variable production costs", scCorrect:1275, totalCorrect:408000, isTotal:true},
        ],
      },
    ],
  },

  {
    id:"q30", nav:"Q30",
    title:"Q30 · Materials & Labor Variances — Hal's Heating",
    desc:"January data for Hal's Heating (320 furnaces produced):\n\nDirect Materials:\n• Purchased: 1,000 heating elements for $38,000 total → actual price = $38/element\n• Used in production: 980 heating elements\n• Standard: 3 elements/furnace × $40/element → SQ = 960 elements\n\nDirect Labor:\n• Worked: 10,000 hours at total cost $190,000 → actual rate = $19/hour\n• Standard: 35 hours/furnace × $18/hour → SH = 11,200 hours",
    type:"multi_part", sticky:true,
    parts:[
      {
        partLabel:"(a) Materials Variance Analysis — Figure 10.4 Format",
        type:"two_row_var",
        rows:[
          {
            varName:"Materials Price Variance",
            col1Header:"AQ Purchased × AP",
            col2Header:"AQ Purchased × SP",
            col1Correct:38000,
            col2Correct:40000,
            varCorrect:2000,
            varFU:"Favorable",
          },
          {
            varName:"Materials Quantity Variance",
            col1Header:"AQ Used × SP",
            col2Header:"SQ × SP",
            col1Correct:39200,
            col2Correct:38400,
            varCorrect:800,
            varFU:"Unfavorable",
          },
        ],
      },
      {
        partLabel:"(b) Labor Variance Analysis — Figure 10.6 Format",
        type:"three_col_var",
        col1:{header:"AH × AR", sub:"Actual Hours × Actual Rate",    answer:190000},
        col2:{header:"AH × SR", sub:"Actual Hours × Standard Rate",  answer:180000},
        col3:{header:"SH × SR", sub:"Standard Hours × Standard Rate",answer:201600},
        var1:{name:"Labor Rate Variance",       correct:10000, fu:"Unfavorable"},
        var2:{name:"Labor Efficiency Variance", correct:21600, fu:"Favorable"},
      },
    ],
  },

  {
    id:"q31", nav:"Q31",
    title:"Q31 · Variable Overhead Variances — Hal's Heating",
    desc:"January — Hal's Heating (320 furnaces produced):\n• Standard variable overhead rate: $15 per direct labor hour\n• Standard direct labor hours: 35 per furnace\n• Actual variable overhead costs incurred: $190,000\n• Actual direct labor hours worked: 10,000\n• Standard hours allowed: 320 × 35 = 11,200 hours",
    type:"three_col_var", sticky:true,
    col1:{header:"AH × AR", sub:"Actual Hours × Actual Rate",    answer:190000},
    col2:{header:"AH × SR", sub:"Actual Hours × Standard Rate",  answer:150000},
    col3:{header:"SH × SR", sub:"Standard Hours × Standard Rate",answer:168000},
    var1:{name:"Variable Overhead Spending Variance",   correct:40000, fu:"Unfavorable"},
    var2:{name:"Variable Overhead Efficiency Variance", correct:18000, fu:"Favorable"},
  },

  {
    id:"q32", nav:"Q32",
    title:"Q32 · Fixed Overhead Variance Analysis — Hal's Heating",
    desc:"January data for Hal's Heating (300 units budgeted, 320 produced):\n• Actual fixed overhead costs: $217,000\n• Budgeted fixed overhead costs: $231,000\n• Budgeted direct labor hours: 10,500 → standard rate = $231,000 ÷ 10,500 = $22/DL hour\n• Standard direct labor hours per furnace: 35\n• Actual production: 320 furnaces → SH = 320 × 35 = 11,200 hours",
    type:"three_col_var", sticky:true,
    col1:{header:"Actual Fixed OH",    sub:"Actual costs incurred",     given:217000},
    col2:{header:"Budgeted Fixed OH",  sub:"Master budget amount",      given:231000},
    col3:{header:"SH × SR",            sub:"Standard Hours × $22/hr",   answer:246400},
    var1:{name:"Fixed Overhead Spending Variance",          correct:14000, fu:"Favorable"},
    var2:{name:"Fixed Overhead Production Volume Variance", correct:15400, fu:"Favorable"},
  },

  {
    id:"q33", nav:"Q33",
    title:"Q33 · Variance Journal Entries — Hal's Heating",
    desc:"Variance summary for January:\n• Materials price variance: $2,000 Favorable\n• Materials quantity variance: $800 Unfavorable\n• Labor rate variance: $10,000 Unfavorable\n• Labor efficiency variance: $21,600 Favorable\n\nKey rule: Favorable variances → Credit | Unfavorable variances → Debit",
    type:"multi_part", sticky:true,
    parts:[
      {
        partLabel:"Entry 1 — Purchase of Raw Materials (1,000 elements at $38 actual; $40 standard)",
        type:"var_journal_entry",
        noteText:"Record RM at STANDARD cost. Favorable MPV = Credit (saved money vs standard).",
        rows:[
          {side:"Dr", account:"Raw Materials Inventory",   amount:40000, fixed:false},
          {side:"Cr", account:"Materials Price Variance",  amount:2000,  fixed:false},
          {side:"Cr", account:"Accounts Payable",          amount:38000, fixed:false},
        ],
        accountPool:[
          "Raw Materials Inventory","Accounts Payable","Work-in-Process Inventory",
          "Materials Price Variance","Materials Quantity Variance",
          "Labor Rate Variance","Labor Efficiency Variance","Wages Payable",
        ],
      },
      {
        partLabel:"Entry 2 — Usage of Raw Materials in Production (980 used; 960 standard; 20 excess)",
        type:"var_journal_entry",
        noteText:"WIP is debited at STANDARD qty × STANDARD price. Unfavorable MQV = Debit (used more than standard).",
        rows:[
          {side:"Dr", account:"Work-in-Process Inventory",   amount:38400, fixed:false},
          {side:"Dr", account:"Materials Quantity Variance", amount:800,   fixed:false},
          {side:"Cr", account:"Raw Materials Inventory",     amount:39200, fixed:false},
        ],
        accountPool:[
          "Raw Materials Inventory","Accounts Payable","Work-in-Process Inventory",
          "Materials Price Variance","Materials Quantity Variance",
          "Labor Rate Variance","Labor Efficiency Variance","Wages Payable",
        ],
      },
      {
        partLabel:"Entry 3 — Direct Labor Costs (10,000 actual hrs at $19; 11,200 standard hrs at $18)",
        type:"var_journal_entry",
        noteText:"WIP at STANDARD hrs × STANDARD rate. LRV Unfavorable = Debit. LEV Favorable = Credit.",
        rows:[
          {side:"Dr", account:"Work-in-Process Inventory",  amount:201600, fixed:false},
          {side:"Dr", account:"Labor Rate Variance",        amount:10000,  fixed:false},
          {side:"Cr", account:"Labor Efficiency Variance",  amount:21600,  fixed:false},
          {side:"Cr", account:"Wages Payable",              amount:190000, fixed:false},
        ],
        accountPool:[
          "Raw Materials Inventory","Accounts Payable","Work-in-Process Inventory",
          "Materials Price Variance","Materials Quantity Variance",
          "Labor Rate Variance","Labor Efficiency Variance","Wages Payable",
        ],
      },
    ],
  },

  {
    id:"q34", nav:"Q34",
    title:"Q34 · Investigating Variances — Quality Tables, Inc.",
    desc:"Quality Tables, Inc. — 2,000 tables produced and sold this year.\nStandard costs per table: Direct materials $350 | Direct labor $250 | Variable overhead $100\nCompany policy: investigate all UNFAVORABLE variances above 10% of the flexible budget amount.\n\nActual variances:\n• DM price variance: $(79,000) Favorable | DM quantity variance: $40,000 Unfavorable\n• DL rate variance: $97,500 Unfavorable | DL efficiency variance: $(35,000) Favorable\n• VMOH spending variance: $16,250 Unfavorable | VMOH efficiency variance: $(19,000) Favorable",
    type:"multi_part",
    parts:[
      {
        partLabel:"(a) Calculate Thresholds and Identify Variances to Investigate",
        type:"threshold_analysis",
        thresholds:[
          {label:"Direct materials flexible budget (2,000 × $350)",      fbCorrect:700000, threshCorrect:70000},
          {label:"Direct labor flexible budget (2,000 × $250)",          fbCorrect:500000, threshCorrect:50000},
          {label:"Variable overhead flexible budget (2,000 × $100)",     fbCorrect:200000, threshCorrect:20000},
        ],
        investigations:[
          {label:"Direct materials quantity variance",   amount:40000,  threshold:70000, investigate:"No"},
          {label:"Direct labor rate variance",           amount:97500,  threshold:50000, investigate:"Yes"},
          {label:"Variable overhead spending variance",  amount:16250,  threshold:20000, investigate:"No"},
        ],
      },
      {
        partLabel:"(b) What Potential Weakness Exists in the Company's Policy?",
        type:"mcq",
        prompt:"Identify a significant weakness in Quality Tables' policy of investigating only unfavorable variances above 10% of the flexible budget.",
        choices:[
          {id:"a", text:"The 10% threshold is too high — it should be set at 5% to catch more variances."},
          {id:"b", text:"The policy ignores favorable variances. Large favorable variances often signal that the original standard was set incorrectly (too loose), making future budgets unreliable. Additionally, a rigid 10% cutoff is arbitrary — a 9.9% variance of identical dollar magnitude would be ignored while a 10.1% one is investigated."},
          {id:"c", text:"The policy should only investigate fixed overhead variances, since those cannot be controlled by production managers."},
          {id:"d", text:"The policy is sound — only unfavorable variances represent actual cost overruns, so favorable variances require no attention."},
        ],
        answer:"b",
        explain:"Two weaknesses: (1) Ignoring favorable variances — a $79,000 favorable DM price variance may indicate standards are set too loosely, meaning the budget is unreliable as a control tool. (2) The 10% threshold is arbitrary — a variance at 9.9% is ignored while one at 10.1% is investigated, even though the economic significance may be nearly identical. Better practice: investigate ALL material variances (both F and U) and use dollar thresholds alongside percentages.",
      },
    ],
  },
];

// ─── SCORING ─────────────────────────────────────────────────────────────────
function scoreQuestion(q, ans) {
  let total=0, correct=0;
  const add = r => { total+=r.total; correct+=r.correct; };
  const chk = (k,c,tol=1) => { total++; if(closeEq(ans[k],c,tol)) correct++; };
  const chkSel = (k,c) => { total++; if(ans[k]===c) correct++; };

  if (q.type==="formula_var") {
    const pfx = `${q.id}_`;
    q.steps.forEach(step => {
      chk(`${pfx}${step.key}`, step.correct, step.tol||1);
      if (step.isVar) chkSel(`${pfx}fu`, step.fu);
    });
  }

  if (q.type==="three_col_var") {
    const pfx = `${q.id}_`;
    if (!q.col1.given) chk(`${pfx}c1`, q.col1.answer);
    if (!q.col2.given) chk(`${pfx}c2`, q.col2.answer);
    chk(`${pfx}c3`, q.col3.answer);
    chk(`${pfx}va`, q.var1.correct); chkSel(`${pfx}vfu1`, q.var1.fu);
    chk(`${pfx}vb`, q.var2.correct); chkSel(`${pfx}vfu2`, q.var2.fu);
  }

  if (q.type==="multi_part") {
    q.parts.forEach((part,pi) => {
      const pfx = `${q.id}_p${pi}_`;

      if (part.type==="std_cost_table") {
        part.rows.forEach((row,ri) => {
          if (row.sqCorrect!==undefined) chk(`${pfx}sq${ri}`, row.sqCorrect, 0.01);
          if (row.spCorrect!==undefined) chk(`${pfx}sp${ri}`, row.spCorrect, 0.01);
          chk(`${pfx}sc${ri}`, row.scCorrect, 1);
        });
      }

      if (part.type==="flex_budget_table") {
        part.rows.forEach((row,ri) => {
          chk(`${pfx}sc${ri}`, row.scCorrect, 1);
          chk(`${pfx}tot${ri}`, row.totalCorrect, 1);
        });
      }

      if (part.type==="two_row_var") {
        part.rows.forEach((row,ri) => {
          chk(`${pfx}r${ri}c1`, row.col1Correct, 1);
          chk(`${pfx}r${ri}c2`, row.col2Correct, 1);
          chk(`${pfx}r${ri}var`, row.varCorrect, 1);
          chkSel(`${pfx}r${ri}fu`, row.varFU);
        });
      }

      if (part.type==="three_col_var") {
        if (!part.col1.given) chk(`${pfx}c1`, part.col1.answer);
        if (!part.col2.given) chk(`${pfx}c2`, part.col2.answer);
        chk(`${pfx}c3`, part.col3.answer);
        chk(`${pfx}va`, part.var1.correct); chkSel(`${pfx}vfu1`, part.var1.fu);
        chk(`${pfx}vb`, part.var2.correct); chkSel(`${pfx}vfu2`, part.var2.fu);
      }

      if (part.type==="var_journal_entry") {
        part.rows.forEach((row,ri) => {
          chk(`${pfx}amt${ri}`, row.amount, 1);
          chkSel(`${pfx}acct${ri}`, row.account);
        });
      }

      if (part.type==="threshold_analysis") {
        part.thresholds.forEach((t,ti) => {
          chk(`${pfx}fb${ti}`, t.fbCorrect, 1);
          chk(`${pfx}th${ti}`, t.threshCorrect, 1);
        });
        part.investigations.forEach((inv,ii) => {
          chkSel(`${pfx}inv${ii}`, inv.investigate);
        });
      }

      if (part.type==="mcq") {
        chkSel(`${pfx}mcq`, part.answer);
      }
    });
  }
  return {total, correct};
}

function allFilled(q, ans) {
  const pfxQ = `${q.id}_`;
  const chk = k => !!ans[k];

  if (q.type==="formula_var") {
    return q.steps.every(s => chk(`${pfxQ}${s.key}`)) && chk(`${pfxQ}fu`);
  }

  if (q.type==="three_col_var") {
    const c1 = q.col1.given || chk(`${pfxQ}c1`);
    const c2 = q.col2.given || chk(`${pfxQ}c2`);
    return c1 && c2 && chk(`${pfxQ}c3`) &&
      chk(`${pfxQ}va`) && chk(`${pfxQ}vfu1`) && chk(`${pfxQ}vb`) && chk(`${pfxQ}vfu2`);
  }

  if (q.type==="multi_part") {
    return q.parts.every((part,pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type==="std_cost_table")
        return part.rows.every((row,ri) =>
          (row.sqCorrect===undefined||!!ans[`${pfx}sq${ri}`]) &&
          (row.spCorrect===undefined||!!ans[`${pfx}sp${ri}`]) &&
          !!ans[`${pfx}sc${ri}`]
        );
      if (part.type==="flex_budget_table")
        return part.rows.every((_,ri) => !!ans[`${pfx}sc${ri}`] && !!ans[`${pfx}tot${ri}`]);
      if (part.type==="two_row_var")
        return part.rows.every((_,ri) =>
          !!ans[`${pfx}r${ri}c1`] && !!ans[`${pfx}r${ri}c2`] &&
          !!ans[`${pfx}r${ri}var`] && !!ans[`${pfx}r${ri}fu`]
        );
      if (part.type==="three_col_var") {
        const c1 = part.col1.given || !!ans[`${pfx}c1`];
        const c2 = part.col2.given || !!ans[`${pfx}c2`];
        return c1 && c2 && !!ans[`${pfx}c3`] &&
          !!ans[`${pfx}va`] && !!ans[`${pfx}vfu1`] && !!ans[`${pfx}vb`] && !!ans[`${pfx}vfu2`];
      }
      if (part.type==="var_journal_entry")
        return part.rows.every((_,ri) => !!ans[`${pfx}amt${ri}`] && !!ans[`${pfx}acct${ri}`]);
      if (part.type==="threshold_analysis")
        return part.thresholds.every((_,ti) => !!ans[`${pfx}fb${ti}`] && !!ans[`${pfx}th${ti}`]) &&
          part.investigations.every((_,ii) => !!ans[`${pfx}inv${ii}`]);
      if (part.type==="mcq") return !!ans[`${pfx}mcq`];
      return true;
    });
  }
  return true;
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────

function NumInput({ sk, ans, setAns, correct, tol, revealed, width, allowNeg }) {
  const raw = parseNum(ans[sk]||"");
  const ok  = revealed && raw!==null && Math.abs(raw-correct)<=(tol||1);
  const bad = revealed && ans[sk]  && (raw===null||Math.abs(raw-correct)>(tol||1));
  const noA = revealed && !ans[sk];
  return (
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <input value={ans[sk]||""} disabled={revealed} placeholder="0"
        onChange={e=>!revealed&&setAns(p=>({...p,[sk]:fmtComma(e.target.value)}))}
        style={{
          width:width||120, padding:"6px 8px", textAlign:"right", outline:"none",
          ...MONO, fontSize:12.5,
          border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
          borderRadius:6,
          background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
          color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a", transition:"all .15s",
        }}
      />
      {ok          && <span style={{color:"#10b981",fontWeight:700,fontSize:14,flexShrink:0}}>✓</span>}
      {(bad||noA)  && <span style={{color:"#ef4444",fontSize:10.5,fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}>→ {fmtD(correct)}</span>}
    </div>
  );
}

function FUSelect({ sk, ans, setAns, correct, revealed }) {
  const v = ans[sk]||"";
  const ok  = revealed && v===correct;
  const bad = revealed && v && v!==correct;
  const noA = revealed && !v;
  return (
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <select value={v} disabled={revealed}
        onChange={e=>!revealed&&setAns(p=>({...p,[sk]:e.target.value}))}
        style={{
          padding:"5px 8px", borderRadius:6, fontSize:12, cursor:"pointer",
          border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
          background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
          color:v?"#0f172a":"#94a3b8", outline:"none", minWidth:130,
        }}>
        <option value="">— F or U? —</option>
        <option value="Favorable">Favorable</option>
        <option value="Unfavorable">Unfavorable</option>
      </select>
      {ok         && <span style={{color:"#10b981",fontWeight:700,flexShrink:0}}>✓</span>}
      {(bad||noA) && <span style={{color:"#ef4444",fontSize:10.5,fontWeight:600,flexShrink:0}}>→ {correct}</span>}
    </div>
  );
}

function GivenSpan({ value }) {
  return (
    <span style={{...MONO,fontSize:12.5,color:"#64748b",display:"block",textAlign:"right",padding:"5px 8px",minWidth:90}}>
      {fmtD(value)}
    </span>
  );
}

// ─── FORMULA VAR BODY (Q19-Q22) ───────────────────────────────────────────────

function FormulaVarBody({ q, ans, setAns, revealed }) {
  const pfx = `${q.id}_`;
  const fuSk = `${pfx}fu`;
  const varStep = q.steps.find(s=>s.isVar);
  const fuOk  = revealed && ans[fuSk]===varStep?.fu;
  const fuBad = revealed && ans[fuSk] && !fuOk;
  const fuNoA = revealed && !ans[fuSk];

  return (
    <div style={{padding:"0 16px 16px"}}>
      <div style={{border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden"}}>
        <div style={{...SLATE,display:"grid",gridTemplateColumns:"1fr 160px"}}>
          <div style={{padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:11.5}}>Component</div>
          <div style={{padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:11.5,textAlign:"right"}}>Your Answer</div>
        </div>
        {q.steps.map((step,i)=>{
          const sk = `${pfx}${step.key}`;
          const bg = step.isVar?"#f1f5f9":i%2===0?"#fff":"#f8fafc";
          return (
            <div key={i} style={{
              display:"grid",gridTemplateColumns:"1fr 160px",alignItems:"center",
              background:bg,
              borderTop:step.isVar?"2px solid #cbd5e1":"none",
              borderBottom:i<q.steps.length-1?"1px solid #f0f4f8":"none",
              padding:`${step.isVar?8:5}px 0`,
            }}>
              <div style={{padding:"0 14px",fontSize:13,color:step.isVar?"#0f172a":"#374151",fontWeight:step.isVar?700:400}}>
                {step.label}
              </div>
              <div style={{padding:"3px 8px",display:"flex",justifyContent:"flex-end"}}>
                <NumInput sk={sk} ans={ans} setAns={setAns} correct={step.correct}
                  tol={step.tol||1} revealed={revealed} width={130} />
              </div>
            </div>
          );
        })}
      </div>
      {/* F/U row */}
      <div style={{marginTop:12,display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
        background:revealed?(fuOk?"#f0fdf4":fuBad||fuNoA?"#fef2f2":"#f8fafc"):"#f8fafc",
        border:`1.5px solid ${revealed?(fuOk?"#10b981":fuBad||fuNoA?"#ef4444":"#e2e8f0"):"#e2e8f0"}`,
        borderRadius:8, transition:"background .2s"}}>
        <span style={{fontSize:13,fontWeight:600,color:"#334155"}}>
          {varStep?.label || "Variance"} is:
        </span>
        <FUSelect sk={fuSk} ans={ans} setAns={setAns} correct={varStep?.fu||""} revealed={revealed}/>
      </div>
    </div>
  );
}

// ─── STANDARD COST TABLE BODY (Q29a) ─────────────────────────────────────────

function StdCostTableBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div style={{border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden"}}>
      <div style={{...SLATE,display:"grid",gridTemplateColumns:"1fr 120px 120px 150px"}}>
        {["Cost Component","Standard Qty","Standard Price","Standard Cost/Unit"]
          .map((h,i)=><div key={i} style={{padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:11,textAlign:i>0?"right":"left"}}>{h}</div>)}
      </div>
      {part.rows.map((row,ri)=>{
        const isTotal = !!row.isTotal;
        const bg = isTotal?"#f1f5f9":ri%2===0?"#fff":"#f8fafc";
        return (
          <div key={ri} style={{
            display:"grid",gridTemplateColumns:"1fr 120px 120px 150px",alignItems:"center",
            background:bg,borderTop:isTotal?"2px solid #cbd5e1":"none",
            borderBottom:ri<part.rows.length-1?"1px solid #f0f4f8":"none",
          }}>
            <div style={{padding:"8px 14px",fontSize:13,color:isTotal?"#0f172a":"#374151",fontWeight:isTotal?700:400}}>{row.label}</div>
            <div style={{padding:"3px 8px",display:"flex",justifyContent:"flex-end"}}>
              {row.sqCorrect!==undefined
                ? <NumInput sk={`${prefix}sq${ri}`} ans={ans} setAns={setAns} correct={row.sqCorrect} tol={0.01} revealed={revealed} width={100} />
                : <div/>}
            </div>
            <div style={{padding:"3px 8px",display:"flex",justifyContent:"flex-end"}}>
              {row.spCorrect!==undefined
                ? <NumInput sk={`${prefix}sp${ri}`} ans={ans} setAns={setAns} correct={row.spCorrect} tol={0.01} revealed={revealed} width={100} />
                : <div/>}
            </div>
            <div style={{padding:"3px 10px",display:"flex",justifyContent:"flex-end"}}>
              <NumInput sk={`${prefix}sc${ri}`} ans={ans} setAns={setAns} correct={row.scCorrect} tol={1} revealed={revealed} width={120} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── FLEXIBLE BUDGET TABLE BODY (Q29b) ───────────────────────────────────────

function FlexBudgetTableBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div style={{border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden"}}>
      <div style={{...SLATE,display:"grid",gridTemplateColumns:"1fr 150px 110px 160px"}}>
        {["Cost Component","Standard Cost/Unit","× Actual Units","Total Flexible Budget"]
          .map((h,i)=><div key={i} style={{padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:11,textAlign:i>0?"right":"left"}}>{h}</div>)}
      </div>
      {part.rows.map((row,ri)=>{
        const isTotal=!!row.isTotal;
        const bg=isTotal?"#f1f5f9":ri%2===0?"#fff":"#f8fafc";
        return (
          <div key={ri} style={{
            display:"grid",gridTemplateColumns:"1fr 150px 110px 160px",alignItems:"center",
            background:bg,borderTop:isTotal?"2px solid #cbd5e1":"none",
            borderBottom:ri<part.rows.length-1?"1px solid #f0f4f8":"none",
          }}>
            <div style={{padding:"8px 14px",fontSize:13,color:isTotal?"#0f172a":"#374151",fontWeight:isTotal?700:400}}>{row.label}</div>
            <div style={{padding:"3px 10px",display:"flex",justifyContent:"flex-end"}}>
              <NumInput sk={`${prefix}sc${ri}`} ans={ans} setAns={setAns} correct={row.scCorrect} tol={1} revealed={revealed} width={130} />
            </div>
            <div style={{padding:"8px 12px",textAlign:"right",...MONO,fontSize:12.5,color:"#64748b"}}>
              × {part.actualUnits.toLocaleString()}
            </div>
            <div style={{padding:"3px 10px",display:"flex",justifyContent:"flex-end"}}>
              <NumInput sk={`${prefix}tot${ri}`} ans={ans} setAns={setAns} correct={row.totalCorrect} tol={1} revealed={revealed} width={140} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TWO ROW VAR BODY (Q30a materials) ───────────────────────────────────────

function TwoRowVarRow({ row, ri, prefix, ans, setAns, revealed }) {
  const c1Sk  = `${prefix}r${ri}c1`;
  const c2Sk  = `${prefix}r${ri}c2`;
  const varSk = `${prefix}r${ri}var`;
  const fuSk  = `${prefix}r${ri}fu`;

  const isPos = row.varFU==="Favorable";
  const headerBg = isPos?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#dc2626,#ef4444)";

  return (
    <div style={{border:`1.5px solid ${isPos?"#bbf7d0":"#fecaca"}`,borderRadius:8,overflow:"hidden",marginBottom:12}}>
      {/* Header */}
      <div style={{padding:"7px 14px",background:headerBg,color:"#fff",fontSize:12.5,fontWeight:700}}>
        {row.varName}
      </div>
      {/* 3-column: box1 | arrow+var | box2 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 200px 1fr",gap:0,alignItems:"center",background:"#fafafa",padding:"14px"}}>
        {/* Box 1 */}
        <div style={{border:"2px solid #e2e8f0",borderRadius:8,padding:"12px",background:"#fff",textAlign:"center"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8,...MONO}}>{row.col1Header}</div>
          <NumInput sk={c1Sk} ans={ans} setAns={setAns} correct={row.col1Correct} tol={1} revealed={revealed} width={130} />
        </div>
        {/* Middle: variance */}
        <div style={{textAlign:"center",padding:"0 12px"}}>
          <div style={{fontSize:11.5,fontWeight:600,color:"#475569",marginBottom:6}}>Variance</div>
          <NumInput sk={varSk} ans={ans} setAns={setAns} correct={row.varCorrect} tol={1} revealed={revealed} width={110} />
          <div style={{marginTop:6}}>
            <FUSelect sk={fuSk} ans={ans} setAns={setAns} correct={row.varFU} revealed={revealed} />
          </div>
        </div>
        {/* Box 2 */}
        <div style={{border:"2px solid #e2e8f0",borderRadius:8,padding:"12px",background:"#fff",textAlign:"center"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8,...MONO}}>{row.col2Header}</div>
          <NumInput sk={c2Sk} ans={ans} setAns={setAns} correct={row.col2Correct} tol={1} revealed={revealed} width={130} />
        </div>
      </div>
    </div>
  );
}

function TwoRowVarBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div>
      {part.rows.map((row,ri)=>(
        <TwoRowVarRow key={ri} row={row} ri={ri} prefix={prefix} ans={ans} setAns={setAns} revealed={revealed} />
      ))}
    </div>
  );
}

// ─── THREE COL VAR BODY (Q30b, Q31, Q32) ─────────────────────────────────────

function VarBox({ header, sub, sk, given, answer, ans, setAns, revealed }) {
  return (
    <div style={{border:"2px solid #e2e8f0",borderRadius:8,padding:"14px",background:"#fff",
      display:"flex",flexDirection:"column",alignItems:"center",gap:8,minWidth:160,flex:1}}>
      <div style={{fontSize:11,fontWeight:700,color:"#334155",textAlign:"center",...MONO}}>{header}</div>
      {sub && <div style={{fontSize:10,color:"#94a3b8",textAlign:"center"}}>{sub}</div>}
      {given!==undefined
        ? <GivenSpan value={given} />
        : <NumInput sk={sk} ans={ans} setAns={setAns} correct={answer} tol={1}
            revealed={revealed} width={130} allowNeg={answer<0} />
      }
    </div>
  );
}

function VarArrow({ varName, amtSk, fuSk, amtCorrect, fuCorrect, ans, setAns, revealed }) {
  const isU = fuCorrect==="Unfavorable";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"0 8px",flexShrink:0}}>
      <div style={{fontSize:10.5,fontWeight:600,color:"#475569",textAlign:"center",maxWidth:140}}>{varName}</div>
      <div style={{fontSize:18,color:"#94a3b8"}}>↔</div>
      <NumInput sk={amtSk} ans={ans} setAns={setAns} correct={amtCorrect} tol={1} revealed={revealed} width={110} />
      <FUSelect sk={fuSk} ans={ans} setAns={setAns} correct={fuCorrect} revealed={revealed} />
    </div>
  );
}

function ThreeColVarBody({ q, ans, setAns, revealed, prefix }) {
  const c1 = q.col1, c2 = q.col2, c3 = q.col3;
  const v1 = q.var1, v2 = q.var2;
  return (
    <div style={{padding:prefix?"0":"0 16px 16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <VarBox header={c1.header} sub={c1.sub} sk={`${prefix}c1`}
          given={c1.given} answer={c1.answer} ans={ans} setAns={setAns} revealed={revealed} />
        <VarArrow varName={v1.name} amtSk={`${prefix}va`} fuSk={`${prefix}vfu1`}
          amtCorrect={v1.correct} fuCorrect={v1.fu} ans={ans} setAns={setAns} revealed={revealed} />
        <VarBox header={c2.header} sub={c2.sub} sk={`${prefix}c2`}
          given={c2.given} answer={c2.answer} ans={ans} setAns={setAns} revealed={revealed} />
        <VarArrow varName={v2.name} amtSk={`${prefix}vb`} fuSk={`${prefix}vfu2`}
          amtCorrect={v2.correct} fuCorrect={v2.fu} ans={ans} setAns={setAns} revealed={revealed} />
        <VarBox header={c3.header} sub={c3.sub} sk={`${prefix}c3`}
          given={c3.given} answer={c3.answer} ans={ans} setAns={setAns} revealed={revealed} />
      </div>
      {/* Summary after reveal */}
      {revealed && (
        <div style={{marginTop:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[v1,v2].map((v,i)=>{
            const isF = v.fu==="Favorable";
            return (
              <div key={i} style={{padding:"10px 14px",borderRadius:8,
                background:isF?"#f0fdf4":"#fef2f2",
                border:`1.5px solid ${isF?"#bbf7d0":"#fecaca"}`,
                fontSize:13,color:isF?"#065f46":"#7f1d1d"}}>
                <span style={{fontWeight:700}}>{v.name}:</span>{" "}
                ${v.correct.toLocaleString()} <strong>{v.fu}</strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── VARIANCE JOURNAL ENTRY BODY (Q33) ───────────────────────────────────────

function VarJournalEntryBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {part.noteText && (
        <div style={{padding:"8px 12px",background:"#fef3c7",border:"1.5px solid #fde68a",
          borderRadius:7,fontSize:12.5,color:"#92400e",lineHeight:1.5}}>
          💡 {part.noteText}
        </div>
      )}
      <div style={{border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden"}}>
        {/* Header */}
        <div style={{...SLATE,display:"grid",gridTemplateColumns:"44px 1fr 150px"}}>
          <div style={{padding:"6px 10px",fontSize:10.5,fontWeight:700,color:"#cbd5e1"}}>Dr/Cr</div>
          <div style={{padding:"6px 10px",fontSize:10.5,fontWeight:700,color:"#cbd5e1"}}>Account</div>
          <div style={{padding:"6px 10px",fontSize:10.5,fontWeight:700,color:"#cbd5e1",textAlign:"right"}}>Amount</div>
        </div>
        {part.rows.map((row,ri)=>{
          const acctSk = `${prefix}acct${ri}`;
          const amtSk  = `${prefix}amt${ri}`;
          const isCr   = row.side==="Cr";
          const acctV  = ans[acctSk]||"";
          const acctOk = revealed && acctV===row.account;
          const acctBad= revealed && acctV && !acctOk;
          const acctNoA= revealed && !acctV;
          const bg = ri%2===0?"#fff":"#f9fafb";
          return (
            <div key={ri} style={{display:"grid",gridTemplateColumns:"44px 1fr 150px",
              alignItems:"center",background:bg,
              borderBottom:ri<part.rows.length-1?"1px solid #f0f4f8":"none"}}>
              {/* Dr/Cr badge */}
              <div style={{padding:"6px 10px"}}>
                <span style={{display:"inline-block",padding:"2px 7px",borderRadius:5,fontSize:11.5,fontWeight:700,
                  background:isCr?"#e0f2fe":"#dcfce7",color:isCr?"#0284c7":"#16a34a",
                  marginLeft:isCr?10:0}}>
                  {row.side}
                </span>
              </div>
              {/* Account dropdown */}
              <div style={{padding:"4px 8px"}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <select value={acctV} disabled={revealed}
                    onChange={e=>!revealed&&setAns(p=>({...p,[acctSk]:e.target.value}))}
                    style={{
                      flex:1,padding:"5px 8px",borderRadius:6,fontSize:12,cursor:"pointer",
                      border:`1.5px solid ${acctOk?"#10b981":acctBad||acctNoA?"#ef4444":"#cbd5e1"}`,
                      background:acctOk?"#f0fdf4":acctBad||acctNoA?"#fef2f2":"#fff",
                      color:acctV?"#0f172a":"#94a3b8",outline:"none",
                    }}>
                    <option value="">— Account —</option>
                    {part.accountPool.map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                  {acctOk           && <span style={{color:"#10b981",fontWeight:700}}>✓</span>}
                  {(acctBad||acctNoA)&& <span style={{color:"#ef4444",fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>→ {row.account}</span>}
                </div>
              </div>
              {/* Amount */}
              <div style={{padding:"4px 8px",display:"flex",justifyContent:"flex-end"}}>
                <NumInput sk={amtSk} ans={ans} setAns={setAns} correct={row.amount}
                  tol={1} revealed={revealed} width={130} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── THRESHOLD ANALYSIS BODY (Q34a) ──────────────────────────────────────────

function ThresholdAnalysisBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Threshold calculations */}
      <div style={{border:"1.5px solid #fde68a",borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"8px 14px",background:"#fef3c7",borderBottom:"1px solid #fde68a",
          fontSize:12.5,fontWeight:700,color:"#92400e"}}>
          Step 1 — Calculate the 10% Investigation Threshold for Each Cost
        </div>
        <div style={{...SLATE,display:"grid",gridTemplateColumns:"1fr 160px 140px"}}>
          {["Cost Category","Flexible Budget Total","10% Threshold"].map((h,i)=>(
            <div key={i} style={{padding:"7px 12px",color:"#fff",fontWeight:700,fontSize:11,textAlign:i>0?"right":"left"}}>{h}</div>
          ))}
        </div>
        {part.thresholds.map((t,ti)=>{
          const fbSk  = `${prefix}fb${ti}`;
          const thSk  = `${prefix}th${ti}`;
          const bg = ti%2===0?"#fffbeb":"#fef9ee";
          return (
            <div key={ti} style={{display:"grid",gridTemplateColumns:"1fr 160px 140px",
              background:bg,borderBottom:ti<part.thresholds.length-1?"1px solid #fde68a":"none",
              alignItems:"center"}}>
              <div style={{padding:"8px 14px",fontSize:12.5,color:"#374151"}}>{t.label}</div>
              <div style={{padding:"3px 8px",display:"flex",justifyContent:"flex-end"}}>
                <NumInput sk={fbSk} ans={ans} setAns={setAns} correct={t.fbCorrect}
                  tol={1} revealed={revealed} width={140} />
              </div>
              <div style={{padding:"3px 8px",display:"flex",justifyContent:"flex-end"}}>
                <NumInput sk={thSk} ans={ans} setAns={setAns} correct={t.threshCorrect}
                  tol={1} revealed={revealed} width={120} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Investigation decisions */}
      <div style={{border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"8px 14px",background:"#f1f5f9",borderBottom:"1px solid #e2e8f0",
          fontSize:12.5,fontWeight:700,color:"#334155"}}>
          Step 2 — Should Each Unfavorable Variance Be Investigated?
        </div>
        <div style={{...SLATE,display:"grid",gridTemplateColumns:"1fr 140px 140px 120px"}}>
          {["Unfavorable Variance","Amount","10% Threshold","Investigate?"].map((h,i)=>(
            <div key={i} style={{padding:"7px 12px",color:"#fff",fontWeight:700,fontSize:11,textAlign:i>0?"right":"left"}}>{h}</div>
          ))}
        </div>
        {part.investigations.map((inv,ii)=>{
          const sk  = `${prefix}inv${ii}`;
          const v   = ans[sk]||"";
          const ok  = revealed && v===inv.investigate;
          const bad = revealed && v && !ok;
          const noA = revealed && !v;
          const bg  = ii%2===0?"#fff":"#f8fafc";
          const thresh = part.thresholds.find(t=>t.threshCorrect===inv.threshold);
          return (
            <div key={ii} style={{
              display:"grid",gridTemplateColumns:"1fr 140px 140px 120px",
              background:revealed?(ok?"#f0fdf4":bad||noA?"#fef2f2":bg):bg,
              borderBottom:ii<part.investigations.length-1?"1px solid #f0f4f8":"none",
              alignItems:"center", transition:"background .2s",
            }}>
              <div style={{padding:"8px 14px",fontSize:13,color:"#374151"}}>{inv.label}</div>
              <div style={{padding:"8px 12px",textAlign:"right",...MONO,fontSize:12.5,color:"#334155",fontWeight:600}}>
                ${inv.amount.toLocaleString()} U
              </div>
              <div style={{padding:"8px 12px",textAlign:"right",...MONO,fontSize:12.5,color:"#64748b"}}>
                ${inv.threshold.toLocaleString()}
              </div>
              <div style={{padding:"5px 10px"}}>
                <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                  <select value={v} disabled={revealed}
                    onChange={e=>!revealed&&setAns(p=>({...p,[sk]:e.target.value}))}
                    style={{
                      width:90,padding:"5px 8px",borderRadius:6,fontSize:12.5,cursor:"pointer",
                      fontWeight:700,textAlign:"center",
                      border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                      background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
                      color:v?"#0f172a":"#94a3b8",outline:"none",
                    }}>
                    <option value="">—</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  {ok          && <span style={{fontSize:11,color:"#10b981",fontWeight:700}}>✓</span>}
                  {(bad||noA)  && <span style={{fontSize:10.5,color:"#ef4444",fontWeight:600}}>→ {inv.investigate}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MCQ BODY ─────────────────────────────────────────────────────────────────

function MCQBody({ part, ans, setAns, revealed, stateKey }) {
  const k = stateKey, sel = ans[k]||"";
  return (
    <div>
      <div style={{fontSize:13.5,color:"#0f172a",lineHeight:1.5,marginBottom:12}}>{part.prompt}</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {part.choices.map(ch=>{
          const isSel=sel===ch.id, isRight=revealed&&ch.id===part.answer;
          const isWrong=revealed&&isSel&&!isRight;
          const bd=isRight?"#10b981":isWrong?"#ef4444":isSel?"#2563eb":"#e2e8f0";
          const bg=isRight?"#f0fdf4":isWrong?"#fef2f2":isSel?"#eff6ff":"#fff";
          const cl=isRight?"#065f46":isWrong?"#7f1d1d":"#0f172a";
          return (
            <button key={ch.id} disabled={revealed}
              onClick={()=>!revealed&&setAns(p=>({...p,[k]:ch.id}))}
              style={{textAlign:"left",padding:"11px 14px",borderRadius:10,
                border:`1.5px solid ${bd}`,background:bg,cursor:revealed?"default":"pointer",
                display:"flex",gap:10,alignItems:"flex-start",transition:"all .15s"}}>
              <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,marginTop:1,
                border:`2px solid ${isSel?"#2563eb":"#cbd5e1"}`,background:isSel?"#2563eb":"transparent"}}/>
              <span style={{fontSize:13,lineHeight:1.4,color:cl}}>
                <span style={{fontWeight:700,marginRight:6}}>{ch.id.toUpperCase()}.</span>{ch.text}
              </span>
              {isRight && <span style={{marginLeft:"auto",color:"#10b981",fontWeight:700,flexShrink:0}}>✓</span>}
              {isWrong && <span style={{marginLeft:"auto",color:"#ef4444",fontWeight:700,flexShrink:0}}>✗</span>}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div style={{marginTop:10,padding:"12px 14px",borderRadius:8,
          border:"1px solid #e2e8f0",background:"#f8fafc",fontSize:13,lineHeight:1.6}}>
          <strong>Explanation: </strong>{part.explain}
        </div>
      )}
    </div>
  );
}

// ─── MULTI PART BODY ──────────────────────────────────────────────────────────

function MultiPartBody({ q, ans, setAns, revealed }) {
  return (
    <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:14}}>
      {q.parts.map((part,pi)=>{
        const pfx = `${q.id}_p${pi}_`;
        return (
          <div key={pi} style={{border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden"}}>
            <div style={{...SLATE,padding:"8px 12px"}}>
              <span style={{fontSize:12.5,fontWeight:700,color:"#fff"}}>{part.partLabel}</span>
            </div>
            <div style={{padding:"12px"}}>
              {part.type==="std_cost_table"    && <StdCostTableBody   part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="flex_budget_table" && <FlexBudgetTableBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="two_row_var"       && <TwoRowVarBody       part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="three_col_var"     && <ThreeColVarBody     q={part}   ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="var_journal_entry" && <VarJournalEntryBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="threshold_analysis"&& <ThresholdAnalysisBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="mcq"               && <MCQBody             part={part} ans={ans} setAns={setAns} revealed={revealed} stateKey={`${pfx}mcq`} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── QUESTION BODY DISPATCHER ─────────────────────────────────────────────────

function QuestionBody({ q, ans, setAns, revealed }) {
  if (q.type==="formula_var")   return <FormulaVarBody   q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type==="three_col_var") return (
    <div style={{padding:"0 16px 16px"}}>
      <ThreeColVarBody q={q} ans={ans} setAns={setAns} revealed={revealed} prefix={`${q.id}_`} />
    </div>
  );
  if (q.type==="multi_part")    return <MultiPartBody    q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  return null;
}

// ─── CHROME (ALL MODULE SCOPE) ────────────────────────────────────────────────

function Confetti({ active }) {
  const ref=useRef(null), af=useRef(null);
  useEffect(()=>{
    if(!active)return;
    const c=ref.current; if(!c)return;
    const ctx=c.getContext("2d");
    const W=c.width=c.parentElement.offsetWidth, H=c.height=c.parentElement.offsetHeight;
    const cols=["#0ea5e9","#10b981","#f59e0b","#f43f5e","#a855f7","#22d3ee","#84cc16"];
    const ps=Array.from({length:200},()=>({
      x:Math.random()*W,y:-Math.random()*H*.5,w:Math.random()*10+4,h:Math.random()*6+2,
      vx:(Math.random()-.5)*7,vy:Math.random()*5+1,rot:Math.random()*360,
      rv:(Math.random()-.5)*12,col:cols[~~(Math.random()*cols.length)],life:1,dec:.002+Math.random()*.003,
    }));
    const go=()=>{
      ctx.clearRect(0,0,W,H); let alive=false;
      ps.forEach(p=>{
        if(p.life<=0)return; alive=true;
        p.x+=p.vx;p.y+=p.vy;p.vy+=.05;p.rot+=p.rv;p.life-=p.dec;
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.col;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
      });
      if(alive) af.current=requestAnimationFrame(go);
    };
    af.current=requestAnimationFrame(go);
    return()=>cancelAnimationFrame(af.current);
  },[active]);
  if(!active)return null;
  return <canvas ref={ref} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:50}}/>;
}

function NavRow({ questions, cur, setCur, grades }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",
      flexWrap:"wrap",background:"#f1f5f9",borderBottom:"1px solid #e2e8f0"}}>
      <button onClick={()=>setCur(c=>Math.max(0,c-1))} disabled={cur===0}
        style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid #d1d5db",
          background:cur===0?"#f9fafb":"#fff",color:cur===0?"#d1d5db":"#374151",
          fontSize:16,cursor:cur===0?"default":"pointer",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
      {questions.map((q,i)=>{
        const g=grades[q.id], isCur=cur===i;
        const bg=isCur?"#fff":!g?"#64748b":g.correct===g.total?"#10b981":"#ef4444";
        return (
          <button key={q.id} onClick={()=>setCur(i)}
            style={{minWidth:isCur?72:54,height:36,padding:"0 10px",borderRadius:isCur?8:20,
              background:bg,border:isCur?`2px solid ${TEAL}`:"2px solid transparent",
              color:isCur?"#0f172a":"#fff",cursor:"pointer",
              fontSize:isCur?12.5:11.5,fontWeight:700,transition:"all .15s",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              boxShadow:isCur?`0 2px 8px ${TEAL}44`:"none",lineHeight:1.2}}>
            <span>{q.nav}</span>
            {g&&!isCur&&<span style={{fontSize:9,opacity:.85}}>{g.correct}/{g.total}</span>}
          </button>
        );
      })}
      <button onClick={()=>setCur(c=>Math.min(questions.length-1,c+1))} disabled={cur===questions.length-1}
        style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid #d1d5db",
          background:cur===questions.length-1?"#f9fafb":"#fff",
          color:cur===questions.length-1?"#d1d5db":"#374151",
          fontSize:16,cursor:cur===questions.length-1?"default":"pointer",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
    </div>
  );
}

function ProgressBar({ questions, grades }) {
  const total  =questions.reduce((s,q)=>s+(grades[q.id]?.total||0),0);
  const correct=questions.reduce((s,q)=>s+(grades[q.id]?.correct||0),0);
  const p=total>0?Math.round(correct/total*100):0;
  const c=p>=80?"#10b981":p>=60?"#f59e0b":"#ef4444";
  return (
    <div style={{margin:"0 16px 4px",padding:"8px 14px",background:"#f8fafc",
      borderRadius:8,border:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:14}}>
      <div style={{flex:1,height:6,background:"#e2e8f0",borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${p}%`,background:c,borderRadius:3,transition:"width .4s"}}/>
      </div>
      <span style={{fontSize:12,fontWeight:700,color:"#374151",whiteSpace:"nowrap"}}>{correct}/{total} · {p}%</span>
    </div>
  );
}

function StickyBar({ q, open, setOpen }) {
  return (
    <div style={{position:"sticky",top:0,zIndex:100,background:"#1e293b",
      borderBottom:"2px solid #0d9488",boxShadow:"0 3px 14px rgba(0,0,0,.3)",
      marginBottom:8,borderRadius:"0 0 8px 8px"}}>
      <div style={{padding:"0 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"9px 0",cursor:"pointer",userSelect:"none"}}
          onClick={()=>setOpen(o=>!o)}>
          <span style={{fontSize:11.5,fontWeight:700,color:"#94a3b8",letterSpacing:.8,textTransform:"uppercase"}}>
            📋 {q.title}
          </span>
          <span style={{fontSize:11,color:"#94a3b8",fontWeight:600,background:"#334155",
            borderRadius:20,padding:"2px 12px",border:"1px solid #475569"}}>
            {open?"Hide ▲":"Show ▼"}
          </span>
        </div>
        {open&&(
          <div style={{fontSize:12.5,color:"#cbd5e1",lineHeight:1.75,
            paddingBottom:12,borderTop:"1px solid #334155",paddingTop:8}}>
            {q.desc.split("\n").map((l,i)=><div key={i}>{l}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function DescCard({ q }) {
  return (
    <div style={{margin:"10px 16px 4px",padding:"12px 14px",background:"#fff",
      border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,lineHeight:1.7}}>
      <div style={{fontWeight:700,fontSize:13.5,marginBottom:4,color:"#0f172a"}}>{q.title}</div>
      <div style={{color:"#475569"}}>{q.desc.split("\n").map((l,i)=><div key={i}>{l}</div>)}</div>
    </div>
  );
}

function ResultsScreen({ grades, onRetry, onReview }) {
  const total  =Object.values(grades).reduce((s,g)=>s+g.total,0);
  const correct=Object.values(grades).reduce((s,g)=>s+g.correct,0);
  const p=pctCalc(correct,total);
  const c=p===100?"#10b981":p>=80?"#d97706":p>=60?TEAL:"#ef4444";
  const wrongCount=QUESTIONS.filter(q=>grades[q.id]&&grades[q.id].correct<grades[q.id].total).length;
  return (
    <div style={{position:"relative",overflow:"hidden"}}>
      <Confetti active={p===100}/>
      <div style={{textAlign:"center",padding:"48px 24px 32px"}}>
        <div style={{fontSize:50,marginBottom:8}}>{p===100?"🎉":p>=80?"🔥":p>=60?"👍":"💪"}</div>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1.5,
          textTransform:"uppercase",marginBottom:12}}>Chapter 10 · Final Score</div>
        <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",
          padding:"20px 52px",borderRadius:12,background:"#f8fafc",border:`2px solid ${c}22`,marginBottom:20}}>
          <div style={{fontSize:54,fontWeight:800,color:c,lineHeight:1}}>
            {correct}<span style={{fontSize:26,color:"#94a3b8"}}>/{total}</span>
          </div>
          <div style={{fontSize:14,color:c,marginTop:4,fontWeight:700}}>{p}%</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:24}}>
          {QUESTIONS.map(q=>{
            const g=grades[q.id]; if(!g)return null;
            const qp=pctCalc(g.correct,g.total),qc=qp===100?"#10b981":qp>=70?"#d97706":"#ef4444";
            return (
              <div key={q.id} style={{padding:"4px 12px",borderRadius:20,
                background:qc+"15",border:`1px solid ${qc}33`,fontSize:12,fontWeight:600,color:qc}}>
                {q.nav}: {g.correct}/{g.total}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onRetry}
            style={{padding:"10px 28px",borderRadius:8,background:TEAL,border:"none",
              color:"#fff",fontSize:13.5,fontWeight:600,cursor:"pointer"}}>Try Again</button>
          {wrongCount>0&&(
            <button onClick={onReview}
              style={{padding:"10px 28px",borderRadius:8,background:"#ef4444",border:"none",
                color:"#fff",fontSize:13.5,fontWeight:600,cursor:"pointer",
                display:"flex",alignItems:"center",gap:8}}>
              Review Wrong
              <span style={{background:"rgba(255,255,255,.25)",borderRadius:20,
                padding:"1px 9px",fontSize:12,fontWeight:700}}>{wrongCount}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Ch10Quiz({ onComplete } = {}) {
  const [savedDraft] = useState(() => loadQuizDraft("ch10"));
  const [cur,        setCur]        = useState(savedDraft?.cur ?? 0);
  const [ans,        setAns]        = useState(savedDraft?.ans ?? {});
  const [graded,     setGraded]     = useState(savedDraft?.graded ?? {});
  const [screen,     setScreen]     = useState(savedDraft?.screen ?? "quiz");
  const [revIdx,     setRevIdx]     = useState(savedDraft?.revIdx ?? 0);
  const [stickyOpen, setStickyOpen] = useState(savedDraft?.stickyOpen ?? true);
  const reportedResult = useRef(false);

  const q          = QUESTIONS[cur];
  const isRevealed = !!graded[q.id];
  const allGraded  = QUESTIONS.every(q=>graded[q.id]);
  const wrongQs    = QUESTIONS.filter(q=>graded[q.id]&&graded[q.id].correct<graded[q.id].total);
  const filled     = allFilled(q,ans);
  const needsSticky = !!q.sticky;

  useEffect(()=>{setStickyOpen(true);},[cur]);

  const gradeThis = ()=>setGraded(p=>({...p,[q.id]:scoreQuestion(q,ans)}));
  const clearThis = ()=>{
    setGraded(p=>{const n={...p};delete n[q.id];return n;});
    setAns(p=>{const n={...p};Object.keys(n).filter(k=>k.startsWith(q.id+"_")).forEach(k=>delete n[k]);return {...n};});
  };
  const resetAll = ()=>{setAns({});setGraded({});setScreen("quiz");setCur(0);setRevIdx(0);reportedResult.current=false;};

  useEffect(() => {
    if (screen !== "results" || reportedResult.current) return;
    reportedResult.current = true;
    const totals = Object.values(graded).reduce(
      (acc, item) => {
        acc.correct += item.correct || 0;
        acc.total += item.total || 0;
        return acc;
      },
      { correct: 0, total: 0 },
    );
    onComplete?.({
      chapterId: "ch10",
      chapterLabel: "Chapter 10",
      percent: pctCalc(totals.correct, totals.total),
      correct: totals.correct,
      total: totals.total,
      completedAt: new Date().toISOString(),
    });
  }, [screen, graded, onComplete]);

  useEffect(() => {
    if (screen === "results") return;
    saveQuizDraft("ch10", { cur, ans, graded, screen, revIdx, stickyOpen });
  }, [cur, ans, graded, screen, revIdx, stickyOpen]);

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;}
    @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    select{-webkit-appearance:auto;appearance:auto;}
    input:focus,select:focus{box-shadow:0 0 0 3px rgba(13,148,136,.18)!important;outline:none!important;}
    button:hover:not(:disabled){filter:brightness(.9);}
    ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
  `;
  const wrap={minHeight:"100vh",background:"#e9eef5",color:"#0f172a",fontFamily:"'DM Sans',system-ui,sans-serif"};
  const inner={maxWidth:1060,margin:"0 auto",padding:"24px 16px"};
  const card={background:"#f1f5f9",borderRadius:12,border:"1.5px solid #e2e8f0",overflow:"hidden",boxShadow:"0 2px 16px rgba(0,0,0,.07)"};

  const g=graded[q.id];
  const scoreBadge=isRevealed&&g?(()=>{
    const p=pctCalc(g.correct,g.total),c=p===100?"#10b981":p>=70?"#d97706":"#ef4444";
    return <span style={{fontSize:13,fontWeight:700,color:c,background:c+"18",
      padding:"4px 12px",borderRadius:20,border:`1px solid ${c}33`}}>{g.correct}/{g.total} · {p}%</span>;
  })():null;

  if(screen==="review"&&wrongQs.length>0){
    const rq=wrongQs[revIdx];
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={{marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <h1 style={{fontWeight:800,fontSize:20,margin:0}}>Review — Wrong Answers</h1>
          <span style={{fontSize:12,background:"#fff",padding:"2px 10px",borderRadius:20,
            border:"1.5px solid #e2e8f0",fontWeight:600,color:"#6b7280"}}>{revIdx+1}/{wrongQs.length}</span>
          <button onClick={()=>setScreen("results")}
            style={{marginLeft:"auto",padding:"7px 16px",borderRadius:8,background:"#10b981",
              border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>← Results</button>
        </div>
        <div style={card}>
          <div style={{margin:"10px 16px 4px",padding:"8px 12px",background:"#fefce8",
            border:"1.5px solid #fde047",borderRadius:7,fontSize:12.5,color:"#854d0e",fontWeight:500}}>
            Review mode — correct answers shown
          </div>
          <DescCard q={rq}/>
          <div style={{animation:"fadein .2s ease"}}>
            <QuestionBody q={rq} ans={ans} setAns={()=>{}} revealed={true}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid #e2e8f0"}}>
            <button onClick={()=>setRevIdx(i=>Math.max(0,i-1))} disabled={revIdx===0}
              style={{padding:"8px 20px",borderRadius:8,background:revIdx===0?"#9ca3af":TEAL,
                border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:revIdx===0?"not-allowed":"pointer"}}>← Prev</button>
            <button onClick={()=>setRevIdx(i=>Math.min(wrongQs.length-1,i+1))} disabled={revIdx===wrongQs.length-1}
              style={{padding:"8px 20px",borderRadius:8,background:revIdx===wrongQs.length-1?"#9ca3af":TEAL,
                border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:revIdx===wrongQs.length-1?"not-allowed":"pointer"}}>Next →</button>
          </div>
        </div>
      </div></div>
    );
  }

  if(screen==="results"){
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={card}><ResultsScreen grades={graded} onRetry={resetAll}
          onReview={()=>{setRevIdx(0);setScreen("review");}}/></div>
      </div></div>
    );
  }

  return (
    <div style={wrap}><style>{CSS}</style><div style={inner}>
      <div style={{marginBottom:14}}>
        <h1 style={{fontWeight:800,fontSize:22,margin:0}}>Chapter 10 — How Do Managers Evaluate Performance Using Cost Variance Analysis?</h1>
        <p style={{fontSize:12,color:"#64748b",margin:"3px 0 0"}}>
          Q19–22 · Q29 · Q30 · Q31 · Q32 · Q33 · Q34 — Variance Formulas, Standard Costs, Variance Diagrams, Journal Entries & Threshold Analysis
        </p>
      </div>

      {needsSticky&&<StickyBar q={q} open={stickyOpen} setOpen={setStickyOpen}/>}

      <div style={card}>
        <NavRow questions={QUESTIONS} cur={cur} setCur={setCur} grades={graded}/>
        {Object.keys(graded).length>0&&<div style={{paddingTop:8}}><ProgressBar questions={QUESTIONS} grades={graded}/></div>}
        {!needsSticky&&<DescCard q={q}/>}

        <div key={q.id} style={{animation:"fadein .2s ease"}}>
          <QuestionBody q={q} ans={ans} setAns={setAns} revealed={isRevealed}/>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"10px 16px 18px",gap:10,flexWrap:"wrap",borderTop:"1px solid #e2e8f0"}}>
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
            {cur<QUESTIONS.length-1
              ?<button onClick={()=>setCur(c=>c+1)}
                  style={{padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                    cursor:"pointer",background:"#10b981",color:"#fff"}}>Next →</button>
              :<button onClick={()=>{if(allGraded)setScreen("results");else{gradeThis();setTimeout(()=>setScreen("results"),100);}}}
                  style={{padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                    cursor:"pointer",background:"#10b981",color:"#fff"}}>Final Score</button>
            }
          </div>
        </div>
      </div>

      {allGraded&&screen==="quiz"&&(
        <div style={{marginTop:14,textAlign:"center"}}>
          <button onClick={()=>setScreen("results")}
            style={{padding:"10px 40px",borderRadius:8,fontSize:14,fontWeight:600,
              border:"none",cursor:"pointer",background:"#10b981",color:"#fff"}}>See Final Score</button>
        </div>
      )}
    </div></div>
  );
}
