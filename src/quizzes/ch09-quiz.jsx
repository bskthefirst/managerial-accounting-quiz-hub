import { useState, useRef, useEffect } from "react";
import { loadQuizDraft, saveQuizDraft } from "./quiz-progress.js";

// ─── UTILS ─────────────────────────────────────────────────────────────────────
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
const closeEq = (v,correct,tol=1) => {
  const r = parseNum(v); return r!==null && Math.abs(r-correct)<=tol;
};
const pctCalc = (a,b) => b?Math.round(a/b*100):0;
const MONO  = {fontFamily:"'JetBrains Mono','Courier New',monospace"};
const SLATE = {background:"linear-gradient(135deg,#334155,#475569)"};
const TEAL  = "#0d9488";
const TEAL_G = {background:"linear-gradient(135deg,#0f766e,#0d9488)"};

// ─── QUESTION DATA ──────────────────────────────────────────────────────────────
const QUESTIONS = [

  {
    id:"q19", nav:"Q19",
    title:"Q19 · Budget Preparation Sequence",
    desc:"Indicate the correct order in which each budget schedule is prepared, where 1 = first and 10 = last. Think about which budgets depend on other budgets as inputs.",
    type:"ranking",
    positions:10,
    items:[
      {label:"Direct materials purchases budget", correct:3},
      {label:"Manufacturing overhead budget",     correct:5},
      {label:"Budgeted income statement",         correct:7},
      {label:"Direct labor budget",               correct:4},
      {label:"Selling and administrative budget", correct:6},
      {label:"Cash budget",                       correct:9},
      {label:"Production budget",                 correct:2},
      {label:"Budgeted balance sheet",            correct:10},
      {label:"Sales budget",                      correct:1},
      {label:"Capital expenditures budget",       correct:8},
    ],
  },

  {
    id:"q28", nav:"Q28",
    title:"Q28 · Sales & Production Budgets — Templeton Corporation",
    desc:"Templeton Corporation — Windows for residential construction.\nLast year's unit sales (ending Dec 31): Q1=40,000 | Q2=50,000 | Q3=52,000 | Q4=48,000\nUnit sales expected to increase 10% over the same quarter last year.\nSelling price: $200/unit (unchanged).\nFinished goods inventory policy: 5% of next quarter's unit sales.\nFG inventory at end of Q4 budget period: 2,300 units.",
    type:"multi_part", sticky:true,
    parts:[
      {
        partLabel:"(a) Sales Budget — Quarterly",
        type:"quarterly_table",
        cols:["Q1","Q2","Q3","Q4","Year"],
        rows:[
          {label:"Unit sales",
           cells:[{type:"answer",correct:44000},{type:"answer",correct:55000},
                  {type:"answer",correct:57200},{type:"answer",correct:52800},{type:"answer",correct:209000}]},
          {label:"Selling price per unit",
           cells:[{type:"given",value:200},{type:"given",value:200},
                  {type:"given",value:200},{type:"given",value:200},{type:"skip"}]},
          {label:"Total sales revenue",isTotal:true,bold:true,
           cells:[{type:"answer",correct:8800000},{type:"answer",correct:11000000},
                  {type:"answer",correct:11440000},{type:"answer",correct:10560000},{type:"answer",correct:41800000}]},
        ],
      },
      {
        partLabel:"(b) Production Budget — Quarterly (units)",
        type:"quarterly_table",
        cols:["Q1","Q2","Q3","Q4","Year"],
        rows:[
          {label:"Sales projection (units)",
           cells:[{type:"answer",correct:44000},{type:"answer",correct:55000},
                  {type:"answer",correct:57200},{type:"answer",correct:52800},{type:"answer",correct:209000}]},
          {label:"Add: Desired ending finished goods inventory",
           cells:[{type:"answer",correct:2750},{type:"answer",correct:2860},
                  {type:"answer",correct:2640},{type:"answer",correct:2300},{type:"skip"}]},
          {label:"Total units needed",isTotal:true,
           cells:[{type:"answer",correct:46750},{type:"answer",correct:57860},
                  {type:"answer",correct:59840},{type:"answer",correct:55100},{type:"skip"}]},
          {label:"Less: Beginning finished goods inventory",
           cells:[{type:"answer",correct:2200},{type:"answer",correct:2750},
                  {type:"answer",correct:2860},{type:"answer",correct:2640},{type:"skip"}]},
          {label:"Required production in units",isTotal:true,bold:true,
           cells:[{type:"answer",correct:44550},{type:"answer",correct:55110},
                  {type:"answer",correct:56980},{type:"answer",correct:52460},{type:"answer",correct:209100}]},
        ],
      },
    ],
  },

  {
    id:"q29", nav:"Q29",
    title:"Q29 · DM Purchases & DL Budgets — Templeton Corporation",
    desc:"Production units (from Q28): Q1=44,550 | Q2=55,110 | Q3=56,980 | Q4=52,460\nDirect materials: 12 sq ft of glass per unit at $1.50/sq ft.\nEnding RM inventory policy: 10% of next quarter's production needs (in sq ft).\nEnding RM inventory at end of Q4: 65,000 sq ft.\nDirect labor: 2 labor hours per unit at $15/hour.",
    type:"multi_part", sticky:true,
    parts:[
      {
        partLabel:"(a) Direct Materials Purchases Budget — Quarterly",
        type:"quarterly_table",
        cols:["Q1","Q2","Q3","Q4","Year"],
        rows:[
          {label:"Units to produce",
           cells:[{type:"given",value:44550},{type:"given",value:55110},
                  {type:"given",value:56980},{type:"given",value:52460},{type:"given",value:209100}]},
          {label:"Square feet needed for production",
           cells:[{type:"answer",correct:534600},{type:"answer",correct:661320},
                  {type:"answer",correct:683760},{type:"answer",correct:629520},{type:"answer",correct:2509200}]},
          {label:"Add: Desired ending RM inventory (sq ft)",
           cells:[{type:"answer",correct:66132},{type:"answer",correct:68376},
                  {type:"answer",correct:62952},{type:"answer",correct:65000},{type:"skip"}]},
          {label:"Total raw materials needed (sq ft)",isTotal:true,
           cells:[{type:"answer",correct:600732},{type:"answer",correct:729696},
                  {type:"answer",correct:746712},{type:"answer",correct:694520},{type:"skip"}]},
          {label:"Less: Beginning RM inventory (sq ft)",
           cells:[{type:"answer",correct:53460},{type:"answer",correct:66132},
                  {type:"answer",correct:68376},{type:"answer",correct:62952},{type:"skip"}]},
          {label:"Raw materials to purchase (sq ft)",isTotal:true,
           cells:[{type:"answer",correct:547272},{type:"answer",correct:663564},
                  {type:"answer",correct:678336},{type:"answer",correct:631568},{type:"answer",correct:2520740}]},
          {label:"Total direct materials purchases",isTotal:true,bold:true,
           cells:[{type:"answer",correct:820908},{type:"answer",correct:995346},
                  {type:"answer",correct:1017504},{type:"answer",correct:947352},{type:"answer",correct:3781110}]},
        ],
      },
      {
        partLabel:"(b) Direct Labor Budget — Quarterly",
        type:"quarterly_table",
        cols:["Q1","Q2","Q3","Q4","Year"],
        rows:[
          {label:"Units to produce",
           cells:[{type:"given",value:44550},{type:"given",value:55110},
                  {type:"given",value:56980},{type:"given",value:52460},{type:"given",value:209100}]},
          {label:"Total direct labor hours required",
           cells:[{type:"answer",correct:89100},{type:"answer",correct:110220},
                  {type:"answer",correct:113960},{type:"answer",correct:104920},{type:"answer",correct:418200}]},
          {label:"Total direct labor cost",isTotal:true,bold:true,
           cells:[{type:"answer",correct:1336500},{type:"answer",correct:1653300},
                  {type:"answer",correct:1709400},{type:"answer",correct:1573800},{type:"answer",correct:6273000}]},
        ],
      },
    ],
  },

  {
    id:"q30", nav:"Q30",
    title:"Q30 · Manufacturing Overhead Budget — Templeton Corporation",
    desc:"Production units: Q1=44,550 | Q2=55,110 | Q3=56,980 | Q4=52,460\nVariable overhead rates per unit: Indirect materials $2.50 | Indirect labor $3.20 | Other $1.70\nFixed overhead per quarter: Salaries $50,000 | Rent $60,000 | Depreciation $36,370\nDepreciation is a non-cash cost — deduct it to arrive at cash paid for overhead.",
    type:"moh_budget", sticky:true,
    varRateComponents:[
      {label:"Indirect materials",correct:2.50},
      {label:"Indirect labor",   correct:3.20},
      {label:"Other",            correct:1.70},
    ],
    totalVarRateCorrect:7.40,
    cols:["Q1","Q2","Q3","Q4","Year"],
    rows:[
      {label:"Units to produce",
       cells:[{type:"given",value:44550},{type:"given",value:55110},
              {type:"given",value:56980},{type:"given",value:52460},{type:"given",value:209100}]},
      {label:"Total variable overhead",
       cells:[{type:"answer",correct:329670},{type:"answer",correct:407814},
              {type:"answer",correct:421652},{type:"answer",correct:388204},{type:"answer",correct:1547340}]},
      {label:"Salaries",
       cells:[{type:"given",value:50000},{type:"given",value:50000},
              {type:"given",value:50000},{type:"given",value:50000},{type:"given",value:200000}]},
      {label:"Rent",
       cells:[{type:"given",value:60000},{type:"given",value:60000},
              {type:"given",value:60000},{type:"given",value:60000},{type:"given",value:240000}]},
      {label:"Depreciation",
       cells:[{type:"given",value:36370},{type:"given",value:36370},
              {type:"given",value:36370},{type:"given",value:36370},{type:"given",value:145480}]},
      {label:"Total fixed overhead",isTotal:true,
       cells:[{type:"answer",correct:146370},{type:"answer",correct:146370},
              {type:"answer",correct:146370},{type:"answer",correct:146370},{type:"answer",correct:585480}]},
      {label:"Total manufacturing overhead",isTotal:true,bold:true,
       cells:[{type:"answer",correct:476040},{type:"answer",correct:554184},
              {type:"answer",correct:568022},{type:"answer",correct:534574},{type:"answer",correct:2132820}]},
      {label:"Less: Depreciation (non-cash)",
       cells:[{type:"answer",correct:-36370,allowNeg:true},{type:"answer",correct:-36370,allowNeg:true},
              {type:"answer",correct:-36370,allowNeg:true},{type:"answer",correct:-36370,allowNeg:true},{type:"answer",correct:-145480,allowNeg:true}]},
      {label:"Cash paid for manufacturing overhead",isTotal:true,bold:true,
       cells:[{type:"answer",correct:439670},{type:"answer",correct:517814},
              {type:"answer",correct:531652},{type:"answer",correct:498204},{type:"answer",correct:1987340}]},
    ],
  },

  {
    id:"q31", nav:"Q31",
    title:"Q31 · Cash Collections & Cash Payments — Templeton Corporation",
    desc:"Quarterly sales and DM purchases (from prior exercises):\n• Q1: Sales $8,800,000 | DM purchases $820,908\n• Q2: Sales $11,000,000 | DM purchases $995,346\n• Q3: Sales $11,440,000 | DM purchases $1,017,504\n• Q4: Sales $10,560,000 | DM purchases $947,352\nSales — all on credit: 60% collected in quarter of sale, 40% in following quarter.\nPrior year Q4 accounts receivable: $3,000,000 (all collected in Q1).\nPurchases — all on credit: 70% paid in quarter of purchase, 30% in following quarter.\nPrior year Q4 accounts payable: $325,000 (all paid in Q1).",
    type:"multi_part", sticky:true,
    parts:[
      {
        partLabel:"(a) Budget for Cash Collections from Sales",
        type:"cash_timing_grid",
        totalLabel:"Total cash collections",
        cols:["Q1","Q2","Q3","Q4","Year"],
        sources:[
          {label:"Fourth quarter prior year ($3,000,000 AR)",
           cells:[{type:"answer",correct:3000000},{type:"skip"},{type:"skip"},{type:"skip"},{type:"answer",correct:3000000}]},
          {label:"First quarter ($8,800,000 sales)",
           cells:[{type:"answer",correct:5280000},{type:"answer",correct:3520000},{type:"skip"},{type:"skip"},{type:"answer",correct:8800000}]},
          {label:"Second quarter ($11,000,000 sales)",
           cells:[{type:"skip"},{type:"answer",correct:6600000},{type:"answer",correct:4400000},{type:"skip"},{type:"answer",correct:11000000}]},
          {label:"Third quarter ($11,440,000 sales)",
           cells:[{type:"skip"},{type:"skip"},{type:"answer",correct:6864000},{type:"answer",correct:4576000},{type:"answer",correct:11440000}]},
          {label:"Fourth quarter ($10,560,000 sales)",
           cells:[{type:"skip"},{type:"skip"},{type:"skip"},{type:"answer",correct:6336000},{type:"answer",correct:6336000}]},
        ],
        totals:[
          {type:"answer",correct:8280000},
          {type:"answer",correct:10120000},
          {type:"answer",correct:11264000},
          {type:"answer",correct:10912000},
          {type:"answer",correct:40576000},
        ],
      },
      {
        partLabel:"(b) Budget for Cash Payments for Direct Materials Purchases",
        type:"cash_timing_grid",
        totalLabel:"Total cash payments",
        cols:["Q1","Q2","Q3","Q4","Year"],
        sources:[
          {label:"Fourth quarter prior year ($325,000 AP)",
           cells:[{type:"answer",correct:325000},{type:"skip"},{type:"skip"},{type:"skip"},{type:"answer",correct:325000}]},
          {label:"First quarter ($820,908 purchases)",
           cells:[{type:"answer",correct:574636},{type:"answer",correct:246272},{type:"skip"},{type:"skip"},{type:"answer",correct:820908}]},
          {label:"Second quarter ($995,346 purchases)",
           cells:[{type:"skip"},{type:"answer",correct:696742},{type:"answer",correct:298604},{type:"skip"},{type:"answer",correct:995346}]},
          {label:"Third quarter ($1,017,504 purchases)",
           cells:[{type:"skip"},{type:"skip"},{type:"answer",correct:712253},{type:"answer",correct:305251},{type:"answer",correct:1017504}]},
          {label:"Fourth quarter ($947,352 purchases)",
           cells:[{type:"skip"},{type:"skip"},{type:"skip"},{type:"answer",correct:663146},{type:"answer",correct:663146}]},
        ],
        totals:[
          {type:"answer",correct:899636},
          {type:"answer",correct:943014},
          {type:"answer",correct:1010857},
          {type:"answer",correct:968397},
          {type:"answer",correct:3821904},
        ],
      },
    ],
  },
];

// ─── SCORING ──────────────────────────────────────────────────────────────────
function scoreQTable(rows, ans, prefix) {
  let total=0, correct=0;
  rows.forEach((row,ri) => {
    if (!row.cells) return;
    row.cells.forEach((cell,ci) => {
      if (cell.type!=="answer") return;
      total++;
      if (closeEq(ans[`${prefix}r${ri}_c${ci}`], cell.correct, cell.tol||1)) correct++;
    });
  });
  return {total,correct};
}

function scoreCTGrid(part, ans, prefix) {
  let total=0, correct=0;
  part.sources.forEach((src,si) => {
    src.cells.forEach((cell,ci) => {
      if (cell.type!=="answer") return;
      total++;
      if (closeEq(ans[`${prefix}s${si}_c${ci}`], cell.correct, cell.tol||1)) correct++;
    });
  });
  part.totals.forEach((cell,ti) => {
    if (cell.type!=="answer") return;
    total++;
    if (closeEq(ans[`${prefix}tot${ti}`], cell.correct, cell.tol||1)) correct++;
  });
  return {total,correct};
}

function scoreQuestion(q, ans) {
  let total=0, correct=0;
  const add = r => { total+=r.total; correct+=r.correct; };

  if (q.type==="ranking") {
    q.items.forEach((_,i) => {
      total++;
      if (ans[`${q.id}_pos${i}`] && parseInt(ans[`${q.id}_pos${i}`])===q.items[i].correct) correct++;
    });
  }
  if (q.type==="moh_budget") {
    // var rate components
    q.varRateComponents.forEach((_,i) => {
      total++;
      if (closeEq(ans[`${q.id}_vrc${i}`], q.varRateComponents[i].correct, 0.01)) correct++;
    });
    // total var rate
    total++; if (closeEq(ans[`${q.id}_tvr`], q.totalVarRateCorrect, 0.01)) correct++;
    // main table
    add(scoreQTable(q.rows, ans, `${q.id}_`));
  }
  if (q.type==="multi_part") {
    q.parts.forEach((part,pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type==="quarterly_table") add(scoreQTable(part.rows, ans, pfx));
      if (part.type==="cash_timing_grid") add(scoreCTGrid(part, ans, pfx));
    });
  }
  return {total,correct};
}

function allFilled(q, ans) {
  const qtFilled = (rows, pfx) => rows.every((row,ri) => {
    if (!row.cells) return true;
    return row.cells.every((cell,ci) => cell.type!=="answer" || !!ans[`${pfx}r${ri}_c${ci}`]);
  });
  const ctFilled = (part, pfx) => {
    const s = part.sources.every((src,si) =>
      src.cells.every((cell,ci) => cell.type!=="answer" || !!ans[`${pfx}s${si}_c${ci}`])
    );
    const t = part.totals.every((cell,ti) => cell.type!=="answer" || !!ans[`${pfx}tot${ti}`]);
    return s&&t;
  };
  if (q.type==="ranking") return q.items.every((_,i)=>!!ans[`${q.id}_pos${i}`]);
  if (q.type==="moh_budget") {
    const vrFilled = q.varRateComponents.every((_,i)=>!!ans[`${q.id}_vrc${i}`]) && !!ans[`${q.id}_tvr`];
    return vrFilled && qtFilled(q.rows, `${q.id}_`);
  }
  if (q.type==="multi_part") {
    return q.parts.every((part,pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type==="quarterly_table")  return qtFilled(part.rows, pfx);
      if (part.type==="cash_timing_grid") return ctFilled(part, pfx);
      return true;
    });
  }
  return true;
}

// ─── ATOMS (ALL MODULE SCOPE) ────────────────────────────────────────────────

function NumInput({ sk, ans, setAns, correct, tol, revealed, width, allowNeg }) {
  const raw = parseNum(ans[sk]||"");
  const ok  = revealed && raw!==null && Math.abs(raw-correct)<=(tol||1);
  const bad = revealed && ans[sk] && (raw===null||Math.abs(raw-correct)>(tol||1));
  const noA = revealed && !ans[sk];
  return (
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <input value={ans[sk]||""} disabled={revealed} placeholder="0"
        onChange={e=>!revealed&&setAns(p=>({...p,[sk]:fmtComma(e.target.value)}))}
        style={{
          width:width||118, padding:"5px 8px", textAlign:"right", outline:"none",
          ...MONO, fontSize:12,
          border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
          borderRadius:5,
          background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
          color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a", transition:"all .15s",
        }}
      />
      {ok          && <span style={{color:"#10b981",fontWeight:700,fontSize:13,flexShrink:0}}>✓</span>}
      {(bad||noA)  && <span style={{color:"#ef4444",fontSize:10,fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}>→ {fmtD(correct)}</span>}
    </div>
  );
}

function GivenSpan({ value }) {
  return (
    <span style={{...MONO,fontSize:12,color:"#64748b",display:"block",
      textAlign:"right",padding:"5px 8px",minWidth:90}}>
      {fmtD(value)}
    </span>
  );
}

function SkipCell() {
  return <div style={{background:"#f8fafc",minHeight:34,borderLeft:"1px solid #e9eef5"}} />;
}

// ─── RANKING BODY ────────────────────────────────────────────────────────────

function RankingBody({ q, ans, setAns, revealed }) {
  const opts = Array.from({length:q.positions},(_,i)=>i+1);
  return (
    <div style={{padding:"0 16px 16px"}}>
      <div style={{fontSize:12.5,color:"#475569",marginBottom:10,padding:"8px 12px",
        background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:7}}>
        Assign each budget a sequence number from 1 (first prepared) to {q.positions} (last prepared).
        The preparation order reflects which budgets serve as inputs to others.
      </div>
      <div style={{border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden"}}>
        <div style={{...SLATE,display:"grid",gridTemplateColumns:"1fr 130px"}}>
          <div style={{padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:11.5}}>Budget Schedule</div>
          <div style={{padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:11.5,textAlign:"center"}}>Preparation Order</div>
        </div>
        {q.items.map((item,i)=>{
          const k = `${q.id}_pos${i}`;
          const sel = ans[k]||"";
          const ok  = revealed && sel && parseInt(sel)===item.correct;
          const bad = revealed && sel && parseInt(sel)!==item.correct;
          const noA = revealed && !sel;
          return (
            <div key={i} style={{
              display:"grid",gridTemplateColumns:"1fr 130px",
              background:revealed?(ok?"#f0fdf4":bad||noA?"#fef2f2":i%2===0?"#fff":"#f8fafc"):i%2===0?"#fff":"#f8fafc",
              borderBottom:i<q.items.length-1?"1px solid #f0f4f8":"none",alignItems:"center",
              transition:"background .2s",
            }}>
              <div style={{padding:"10px 14px",fontSize:13,color:"#334151"}}>{item.label}</div>
              <div style={{padding:"6px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <select value={sel} disabled={revealed}
                  onChange={e=>!revealed&&setAns(p=>({...p,[k]:e.target.value}))}
                  style={{
                    width:80,padding:"5px 8px",borderRadius:6,fontSize:13,cursor:"pointer",textAlign:"center",
                    border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                    background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
                    color:sel?"#0f172a":"#94a3b8",outline:"none",fontWeight:600,
                  }}>
                  <option value="">—</option>
                  {opts.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
                {ok         && <span style={{color:"#10b981",fontWeight:700,fontSize:13}}>✓</span>}
                {(bad||noA) && <span style={{color:"#ef4444",fontSize:11,fontWeight:600}}>→ {item.correct}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {revealed && (
        <div style={{marginTop:12,padding:"10px 14px",background:"#f8fafc",border:"1.5px solid #e2e8f0",
          borderRadius:8,fontSize:12.5,color:"#475569",lineHeight:1.7}}>
          <strong>Correct order:</strong> Sales → Production → Direct Materials → Direct Labor →
          Manufacturing Overhead → Selling &amp; Administrative → Income Statement →
          Capital Expenditures → Cash → Balance Sheet
        </div>
      )}
    </div>
  );
}

// ─── QUARTERLY TABLE BODY ─────────────────────────────────────────────────────

function QTRow({ row, ri, cols, prefix, ans, setAns, revealed, isLast }) {
  const isTotal = !!row.isTotal;
  const isBold  = !!row.bold;
  const gridCols = `1fr ${cols.map(()=>"128px").join(" ")}`;
  const bg = isTotal?"#f1f5f9":ri%2===0?"#fff":"#f8fafc";
  return (
    <div style={{
      display:"grid",gridTemplateColumns:gridCols,
      background:bg,
      borderBottom:isLast?"none":"1px solid #f0f4f8",
      borderTop:isTotal?"1.5px solid #cbd5e1":"none",
      alignItems:"center",minWidth:680,
    }}>
      <div style={{padding:"7px 12px",fontSize:12.5,
        color:isBold?"#0f172a":"#374151",fontWeight:isBold?700:400}}>{row.label}</div>
      {(row.cells||[]).map((cell,ci)=>{
        if (cell.type==="skip") return <div key={ci} style={{background:"#f1f5f9",minHeight:36,borderLeft:"1px solid #e9eef5"}} />;
        if (cell.type==="given") return (
          <div key={ci} style={{padding:"4px 8px",display:"flex",justifyContent:"flex-end"}}>
            <GivenSpan value={cell.value} />
          </div>
        );
        const sk = `${prefix}r${ri}_c${ci}`;
        return (
          <div key={ci} style={{padding:"3px 6px",display:"flex",justifyContent:"flex-end"}}>
            <NumInput sk={sk} ans={ans} setAns={setAns} correct={cell.correct}
              tol={cell.tol||1} revealed={revealed} width={112}
              allowNeg={cell.allowNeg||cell.correct<0} />
          </div>
        );
      })}
    </div>
  );
}

function QuarterlyTableBody({ part, ans, setAns, revealed, prefix }) {
  const gridCols = `1fr ${part.cols.map(()=>"128px").join(" ")}`;
  return (
    <div style={{border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden",overflowX:"auto"}}>
      <div style={{...SLATE,display:"grid",gridTemplateColumns:gridCols,minWidth:680}}>
        <div style={{padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:11}} />
        {part.cols.map(c=>(
          <div key={c} style={{padding:"8px 10px",color:"#fff",fontWeight:700,fontSize:11.5,textAlign:"right"}}>{c}</div>
        ))}
      </div>
      {part.rows.map((row,ri)=>(
        <QTRow key={ri} row={row} ri={ri} cols={part.cols} prefix={prefix}
          ans={ans} setAns={setAns} revealed={revealed} isLast={ri===part.rows.length-1} />
      ))}
    </div>
  );
}

// ─── MOH BUDGET BODY ──────────────────────────────────────────────────────────

function MOHBudgetBody({ q, ans, setAns, revealed }) {
  const pfx = `${q.id}_`;
  return (
    <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:14}}>
      {/* Variable rate calculation */}
      <div style={{border:"1.5px solid #fde68a",borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"8px 12px",background:"#fef3c7",borderBottom:"1px solid #fde68a",
          fontSize:12.5,fontWeight:700,color:"#92400e"}}>
          Step 1 — Calculate Total Variable Overhead Rate per Unit
        </div>
        <div style={{padding:"12px 14px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 10px 1fr",
            gap:8,alignItems:"center",maxWidth:600}}>
            {q.varRateComponents.map((comp,i)=>{
              const sk = `${pfx}vrc${i}`;
              return (
                <div key={i} style={{display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
                  <span style={{fontSize:11.5,color:"#92400e",fontWeight:600,textAlign:"center"}}>{comp.label}</span>
                  <NumInput sk={sk} ans={ans} setAns={setAns} correct={comp.correct}
                    tol={0.01} revealed={revealed} width={90} />
                </div>
              );
            })}
            <div style={{textAlign:"center",fontSize:18,color:"#92400e",fontWeight:700}}>=</div>
            <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
              <span style={{fontSize:11.5,color:"#0f172a",fontWeight:700}}>Total Rate / Unit</span>
              <NumInput sk={`${pfx}tvr`} ans={ans} setAns={setAns}
                correct={q.totalVarRateCorrect} tol={0.01} revealed={revealed} width={90} />
            </div>
          </div>
        </div>
      </div>
      {/* Main quarterly table */}
      <QuarterlyTableBody
        part={{cols:q.cols, rows:q.rows}}
        ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />
    </div>
  );
}

// ─── CASH TIMING GRID BODY ────────────────────────────────────────────────────

function CTGRow({ src, si, cols, prefix, ans, setAns, revealed, isLast }) {
  const gridCols = `1fr ${cols.map(()=>"128px").join(" ")}`;
  return (
    <div style={{
      display:"grid",gridTemplateColumns:gridCols,
      background:si%2===0?"#fff":"#f8fafc",
      borderBottom:isLast?"none":"1px solid #f0f4f8",
      alignItems:"center",minWidth:680,
    }}>
      <div style={{padding:"7px 12px",fontSize:12.5,color:"#374151",lineHeight:1.4}}>{src.label}</div>
      {src.cells.map((cell,ci)=>{
        if (cell.type==="skip") return <div key={ci} style={{background:"#f1f5f9",minHeight:36,borderLeft:"1px solid #e9eef5"}} />;
        const sk = `${prefix}s${si}_c${ci}`;
        return (
          <div key={ci} style={{padding:"3px 6px",display:"flex",justifyContent:"flex-end"}}>
            <NumInput sk={sk} ans={ans} setAns={setAns} correct={cell.correct}
              tol={cell.tol||1} revealed={revealed} width={112} />
          </div>
        );
      })}
    </div>
  );
}

function CashTimingGridBody({ part, ans, setAns, revealed, prefix }) {
  const gridCols = `1fr ${part.cols.map(()=>"128px").join(" ")}`;
  return (
    <div style={{border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden",overflowX:"auto"}}>
      {/* Header */}
      <div style={{...TEAL_G,display:"grid",gridTemplateColumns:gridCols,minWidth:680}}>
        <div style={{padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:11}} />
        {part.cols.map(c=>(
          <div key={c} style={{padding:"8px 10px",color:"#fff",fontWeight:700,fontSize:11.5,textAlign:"right"}}>{c}</div>
        ))}
      </div>
      {/* Source rows */}
      {part.sources.map((src,si)=>(
        <CTGRow key={si} src={src} si={si} cols={part.cols} prefix={prefix}
          ans={ans} setAns={setAns} revealed={revealed}
          isLast={si===part.sources.length-1} />
      ))}
      {/* Totals row */}
      <div style={{
        display:"grid",gridTemplateColumns:gridCols,
        background:"#f1f5f9",borderTop:"2px solid #cbd5e1",minWidth:680,alignItems:"center",
      }}>
        <div style={{padding:"8px 12px",fontSize:13,fontWeight:700,color:"#0f172a"}}>{part.totalLabel}</div>
        {part.totals.map((cell,ti)=>(
          <div key={ti} style={{padding:"3px 6px",display:"flex",justifyContent:"flex-end"}}>
            <NumInput sk={`${prefix}tot${ti}`} ans={ans} setAns={setAns}
              correct={cell.correct} tol={cell.tol||1} revealed={revealed} width={112} />
          </div>
        ))}
      </div>
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
              {part.type==="quarterly_table"  && <QuarterlyTableBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="cash_timing_grid" && <CashTimingGridBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── QUESTION BODY DISPATCHER ─────────────────────────────────────────────────

function QuestionBody({ q, ans, setAns, revealed }) {
  if (q.type==="ranking")     return <RankingBody    q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type==="moh_budget")  return <MOHBudgetBody  q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type==="multi_part")  return <MultiPartBody  q={q} ans={ans} setAns={setAns} revealed={revealed} />;
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
          textTransform:"uppercase",marginBottom:12}}>Chapter 9 · Final Score</div>
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
export default function Ch09Quiz({ onComplete } = {}) {
  const [savedDraft] = useState(() => loadQuizDraft("ch09"));
  const [cur,        setCur]        = useState(() => Number.isInteger(savedDraft?.cur) ? savedDraft.cur : 0);
  const [ans,        setAns]        = useState(() => (savedDraft?.ans && typeof savedDraft.ans === "object" && !Array.isArray(savedDraft.ans) ? savedDraft.ans : {}));
  const [graded,     setGraded]     = useState(() => (savedDraft?.graded && typeof savedDraft.graded === "object" && !Array.isArray(savedDraft.graded) ? savedDraft.graded : {}));
  const [screen,     setScreen]     = useState(() => (savedDraft?.screen === "quiz" || savedDraft?.screen === "review") ? savedDraft.screen : "quiz");
  const [revIdx,     setRevIdx]     = useState(() => Number.isInteger(savedDraft?.revIdx) ? savedDraft.revIdx : 0);
  const [stickyOpen, setStickyOpen] = useState(() => savedDraft?.stickyOpen !== false);
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
    const totals = Object.values(graded).reduce((acc, g) => ({
      correct: acc.correct + g.correct,
      total: acc.total + g.total,
    }), { correct: 0, total: 0 });
    onComplete?.({
      chapterId: "ch09",
      chapterLabel: "Chapter 9",
      ...totals,
      percent: pctCalc(totals.correct, totals.total),
      completedAt: new Date().toISOString(),
    });
  }, [screen, graded, onComplete]);

  useEffect(() => {
    if (screen === "results") return;
    saveQuizDraft("ch09", { cur, ans, graded, screen, revIdx, stickyOpen });
  }, [cur, ans, graded, screen, revIdx, stickyOpen]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;}
    @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    select{-webkit-appearance:auto;appearance:auto;}
    input:focus,select:focus{box-shadow:0 0 0 3px rgba(13,148,136,.18)!important;outline:none!important;}
    button:hover:not(:disabled){filter:brightness(.9);}
    ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
  `;
  const wrap={minHeight:"100vh",background:"#e9eef5",color:"#0f172a",fontFamily:"'DM Sans',system-ui,sans-serif"};
  const inner={maxWidth:1100,margin:"0 auto",padding:"24px 16px"};
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
        <h1 style={{fontWeight:800,fontSize:22,margin:0}}>Chapter 9 — How Are Operating Budgets Created?</h1>
        <p style={{fontSize:12,color:"#64748b",margin:"3px 0 0"}}>
          Q19 · Q28 · Q29 · Q30 · Q31 — Budget Sequence, Sales, Production, DM Purchases, DL, MOH, Cash Collections & Payments
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
