import { useState, useRef, useEffect } from "react";
import { loadQuizDraft, saveQuizDraft, clearQuizDraft } from "./quiz-progress.js";

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
const closeEq = (v,c,tol=1) => { const r=parseNum(v); return r!==null && Math.abs(r-c)<=tol; };
const pctCalc = (a,b) => b?Math.round(a/b*100):0;
const MONO  = {fontFamily:"'JetBrains Mono','Courier New',monospace"};
const SLATE = {background:"linear-gradient(135deg,#334155,#475569)"};
const TEAL  = "#0d9488";

// ─── QUESTION DATA ─────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id:"q1", nav:"Q1",
    title:"Q1 · CVP Basics — CM, Break-Even, Margin of Safety, DOL",
    desc:"A manufacturer: Fixed costs = $400,000 | Selling price = $170/unit | Variable cost = $150/unit | Predicted unit sales = 25,000",
    type:"calc_steps",
    steps:[
      {label:"Contribution margin per unit",                               correct:20,      tol:0.01},
      {label:"Break-even point in units",                                  correct:20000,   tol:1},
      {label:"Margin of safety in units",                                  correct:5000,    tol:1},
      {label:"Operating income at 25,000 units",                          correct:100000,  tol:1},
      {label:"Contribution margin at 25,000 units",                       correct:500000,  tol:1},
      {label:"Degree of operating leverage (CM ÷ OI)",                    correct:5,       tol:0.01, isTotal:true},
    ],
  },
  {
    id:"q2", nav:"Q2",
    title:"Q2 · Target Income — CM Ratio, Dollar Sales, Unit Sales",
    desc:"A manufacturer: Fixed costs = $502,000 | Selling price = $180/unit | Variable cost = $126/unit | Target pretax income = $200,000",
    type:"calc_steps",
    steps:[
      {label:"Contribution margin per unit",                               correct:54,      tol:0.01},
      {label:"Contribution margin ratio",                                  correct:30,      tol:0.1, unit:"%"},
      {label:"Dollar sales needed to yield target income",                 correct:2340000, tol:1, isTotal:true},
      {label:"Unit sales needed to yield target income",                   correct:13000,   tol:1, isTotal:true},
    ],
  },
  {
    id:"q3", nav:"Q3",
    title:"Q3 · Sensitivity Analysis — Doral Company",
    desc:"Doral Company: Annual sales = 5,000,000 pens | Selling price = $0.50 | Variable cost = $0.30/pen | Annual fixed costs = $900,000",
    type:"multi_part", sticky:true,
    parts:[
      {
        partLabel:"(a) Current yearly operating income",
        type:"calc_steps",
        steps:[
          {label:"Total contribution margin (5,000,000 × $0.20)", correct:1000000, tol:1},
          {label:"Less: Fixed costs",                              correct:900000,  tol:1},
          {label:"Operating income",                              correct:100000,  tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(b) Current break-even point in sales dollars",
        type:"calc_steps",
        steps:[
          {label:"Contribution margin ratio",             correct:40,      tol:0.1, unit:"%"},
          {label:"Break-even in sales dollars",           correct:2250000, tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(c) New operating income with $0.04 per-unit increase in variable costs",
        type:"calc_steps",
        steps:[
          {label:"New variable cost per pen",            correct:0.34,    tol:0.001},
          {label:"New CM per pen",                       correct:0.16,    tol:0.001},
          {label:"New total CM (5,000,000 pens)",        correct:800000,  tol:1},
          {label:"Less: Fixed costs",                    correct:900000,  tol:1},
          {label:"New operating income (loss)",          correct:-100000, tol:1, isTotal:true, allowNeg:true},
        ],
      },
      {
        partLabel:"(d) New OI: 20% decrease in FC and price, 10% decrease in VC, 40% increase in units",
        type:"calc_steps",
        steps:[
          {label:"New fixed costs (× 0.80)",             correct:720000,  tol:1},
          {label:"New selling price (× 0.80)",           correct:0.40,    tol:0.001},
          {label:"New variable cost (× 0.90)",           correct:0.27,    tol:0.001},
          {label:"New CM per unit",                      correct:0.13,    tol:0.001},
          {label:"New units sold (× 1.40)",              correct:7000000, tol:1},
          {label:"New total CM",                         correct:910000,  tol:1},
          {label:"New operating income",                 correct:190000,  tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(e) New break-even in units: 10% increase in fixed costs (original price & VC)",
        type:"calc_steps",
        steps:[
          {label:"New fixed costs",                      correct:990000,  tol:1},
          {label:"CM per unit (unchanged)",              correct:0.20,    tol:0.001},
          {label:"New break-even in units",              correct:4950000, tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(f) New break-even in units: 10% increase in selling price + $20,000 increase in FC",
        type:"calc_steps",
        steps:[
          {label:"New selling price",                    correct:0.55,    tol:0.001},
          {label:"New CM per unit",                      correct:0.25,    tol:0.001},
          {label:"New fixed costs",                      correct:920000,  tol:1},
          {label:"New break-even in units",              correct:3680000, tol:1, isTotal:true},
        ],
      },
    ],
  },
  {
    id:"q4", nav:"Q4",
    title:"Q4 · After-Tax Target Income — RapidMeal Co.",
    desc:"RapidMeal Co.: Fixed costs = $450,000 | Avg sales check = $8.00 | Avg variable cost = $3.20 | Tax rate = 30% | Target net income = $105,000",
    type:"multi_part",
    parts:[
      {
        partLabel:"(a) Total dollar sales needed to obtain target net income",
        type:"calc_steps",
        steps:[
          {label:"Target pretax income ($105,000 ÷ (1 − 0.30))", correct:150000,  tol:1},
          {label:"CM per check",                                  correct:4.80,    tol:0.01},
          {label:"CM ratio",                                      correct:60,      tol:0.1, unit:"%"},
          {label:"Total dollar sales required",                   correct:1000000, tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(b) Number of sales checks needed to earn the target net income",
        type:"calc_steps",
        steps:[
          {label:"Total sales dollars required (from part a)",    correct:1000000, tol:1},
          {label:"Average check amount",                          correct:8.00,    tol:0.01},
          {label:"Number of sales checks needed",                 correct:125000,  tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(c) Number of sales checks needed to break even",
        type:"calc_steps",
        steps:[
          {label:"Fixed costs",                                   correct:450000,  tol:1},
          {label:"CM per check",                                  correct:4.80,    tol:0.01},
          {label:"Break-even sales checks",                       correct:93750,   tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(d) Net income if 150,000 sales checks are made",
        type:"calc_steps",
        steps:[
          {label:"Total CM (150,000 × $4.80)",                   correct:720000,  tol:1},
          {label:"Less: Fixed costs",                             correct:450000,  tol:1},
          {label:"Operating income (pretax)",                     correct:270000,  tol:1},
          {label:"Income tax (30%)",                              correct:81000,   tol:1},
          {label:"Net income",                                    correct:189000,  tol:1, isTotal:true},
        ],
      },
    ],
  },
  {
    id:"q5", nav:"Q5",
    title:"Q5 · CVP Assumptions MCQ",
    desc:"Cost-volume-profit analysis includes some inherent, simplifying assumptions. Which of the following is NOT one of these assumptions?",
    type:"mcq",
    choices:[
      {id:"a", text:"Costs and revenues are predictable and are linear over the relevant range."},
      {id:"b", text:"Variable costs per unit will fluctuate proportionally with volume."},
      {id:"c", text:"Changes in beginning and ending inventory levels are insignificant in amount."},
      {id:"d", text:"Fixed costs will remain constant over the relevant range."},
    ],
    answer:"b",
    explain:"CVP analysis assumes variable costs per unit are CONSTANT (not fluctuating). It is total variable costs that change proportionally with volume. The other three are genuine CVP assumptions.",
  },
  {
    id:"q6", nav:"Q6",
    title:"Q6 · Sales Increase → Operating Income — Alpha Company",
    desc:"Alpha Company: Sales = $300,000 | Variable costs = $240,000 | Fixed costs = $40,000\nIf Alpha increases sales by 20%, what should be the new operating income?",
    type:"calc_steps",
    steps:[
      {label:"Current operating income",                          correct:20000,  tol:1},
      {label:"VC ratio",                                          correct:80,     tol:0.1, unit:"%"},
      {label:"New sales (× 1.20)",                               correct:360000, tol:1},
      {label:"New variable costs (× 1.20)",                      correct:288000, tol:1},
      {label:"New operating income",                              correct:32000,  tol:1, isTotal:true},
    ],
  },
  {
    id:"q7", nav:"Q7",
    title:"Q7 · Maximum Fixed Cost Increase — Beta Corporation",
    desc:"Beta Corporation: Variable cost = $3.50/unit | CM = $1.50/unit | Break-even sales = $1,000,000\nBeta wants to sell an additional 50,000 units at the same price. Variable costs won't change, but fixed costs may increase. By how much can fixed costs increase before the additional units are not worthwhile?",
    type:"calc_steps",
    steps:[
      {label:"Selling price per unit (VC + CM)",                  correct:5.00,   tol:0.01},
      {label:"Break-even units ($1,000,000 ÷ $5.00)",            correct:200000, tol:1},
      {label:"Current fixed costs (BEP units × CM)",             correct:300000, tol:1},
      {label:"Incremental CM from 50,000 units (× $1.50)",       correct:75000,  tol:1},
      {label:"Maximum fixed cost increase",                       correct:75000,  tol:1, isTotal:true},
    ],
  },
  {
    id:"q8", nav:"Q8",
    title:"Q8 · Selling Price from Break-Even — Gamma Company",
    desc:"Gamma Company: Fixed costs = $360,000 | Break-even point = 120,000 units | Variable cost = $9.00/unit\nWhat is the selling price per unit?",
    type:"calc_steps",
    steps:[
      {label:"Contribution margin per unit (FC ÷ BEP units)",    correct:3,  tol:0.01},
      {label:"Selling price (VC + CM)",                          correct:12, tol:0.01, isTotal:true},
    ],
  },
  {
    id:"q9", nav:"Q9",
    title:"Q9 · Multi-Scenario CVP — Azucar Company",
    desc:"Azucar Company: Selling price = $0.40/bar | Variable cost = $0.25/bar | Fixed costs = $60,000\nUnits sold last year = 1,000,000 bars | Current OI = $90,000\nTarget OI = 50% increase over last year = $135,000",
    type:"multi_part", sticky:true,
    parts:[
      {
        partLabel:"(a) Maximum advertising spend if doubling volume achieves 50% OI increase",
        type:"calc_steps",
        steps:[
          {label:"Current OI",                                     correct:90000,  tol:1},
          {label:"Target OI (150% of current)",                   correct:135000, tol:1},
          {label:"New total CM at 2M units (2M × $0.15)",         correct:300000, tol:1},
          {label:"Max advertising = New CM − FC − Target OI",     correct:105000, tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(b) Price increase needed to maintain same break-even if VC increases to $0.30",
        type:"calc_steps",
        steps:[
          {label:"Current break-even (FC ÷ current CM = $60k ÷ $0.15)", correct:400000, tol:1},
          {label:"New VC per bar",                                        correct:0.30,   tol:0.001},
          {label:"Required CM to keep same BEP ($60,000 ÷ 400,000)",    correct:0.15,   tol:0.001},
          {label:"Required new price (new VC + required CM)",           correct:0.45,   tol:0.001},
          {label:"Price increase per bar",                               correct:0.05,   tol:0.001, isTotal:true},
        ],
      },
      {
        partLabel:"(c) Price increases to $0.50, volume drops to 800,000 — was this a good decision? Volume needed for same OI.",
        type:"calc_steps",
        steps:[
          {label:"New CM per bar at $0.50 price",                  correct:0.25,   tol:0.001},
          {label:"New OI (800,000 × $0.25 − $60,000)",            correct:140000, tol:1},
          {label:"Good decision? (New OI > $90,000 → 1=Yes, 0=No)", correct:1,    tol:0, unit:"(1=Yes)"},
          {label:"Volume for same OI at $0.50 price",             correct:600000, tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(d) VC=$0.30, advertising +$100k, double volume. What selling price achieves 50% OI increase? (max 20% price increase)",
        type:"calc_steps",
        steps:[
          {label:"New fixed costs ($60k + $100k advertising)",     correct:160000, tol:1},
          {label:"Target OI",                                      correct:135000, tol:1},
          {label:"New units (1M × 2)",                             correct:2000000,tol:1},
          {label:"Required CM per unit: (New FC + Target OI) ÷ 2M", correct:0.1475,tol:0.0005},
          {label:"Required price (VC $0.30 + CM $0.1475)",         correct:0.4475, tol:0.001},
          {label:"Maximum allowed price (20% above $0.40)",        correct:0.48,   tol:0.001},
          {label:"Is required price ≤ max price? (1=Yes=Feasible, 0=No)", correct:1, tol:0, unit:"(1=Yes)"},
        ],
      },
    ],
  },
  {
    id:"q10", nav:"Q10",
    title:"Q10 · Tiered Pricing CVP — CableVision",
    desc:"CableVision revenue: $20/subscriber.\nLease: $50,000/mo fixed + 10% of revenue from first 10,000 subs ($1/sub for subs 1–10k) + 5% of revenue from subs above 10,000 ($1/sub for subs 10k+).\nInterlink: $20,000/mo fixed + $8/sub (subs 1–20,000) + $6/sub (subs above 20,000).\nCableVision own ops: $60,000/mo fixed + $2/sub.\n\nRange summary:\n• 0–10,000 subs: var cost = $2+$8+$2 = $12/sub | fixed = $50k+$20k+$60k = $130k\n• 10,001–20,000 subs: var cost = $1+$8+$2 = $11/sub | additional fixed from 10k boundary\n• 20,001–30,000 subs: var cost = $1+$6+$2 = $9/sub | additional fixed from 20k boundary",
    type:"multi_part", sticky:true,
    parts:[
      {
        partLabel:"(1) Contribution margin per subscriber for each range",
        type:"calc_steps",
        steps:[
          {label:"Revenue per subscriber",                         correct:20, tol:0.01},
          {label:"CM per sub — Range 0 to 10,000 ($20 − $12)",    correct:8,  tol:0.01},
          {label:"CM per sub — Range 10,001 to 20,000 ($20 − $11)",correct:9, tol:0.01},
          {label:"CM per sub — Range 20,001 to 30,000 ($20 − $9)", correct:11,tol:0.01},
        ],
      },
      {
        partLabel:"(2) Total monthly operating income at each subscriber level",
        type:"calc_steps",
        steps:[
          {label:"OI at 10,000 subscribers",                       correct:-50000, tol:1, allowNeg:true},
          {label:"OI at 20,000 subscribers",                       correct:40000,  tol:1},
          {label:"OI at 30,000 subscribers",                       correct:150000, tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(3) Break-even number of subscribers per month",
        type:"calc_steps",
        steps:[
          {label:"OI at 10,000 subs (from above, negative = loss)", correct:-50000, tol:1, allowNeg:true},
          {label:"BEP falls between 10,000 and 20,000 subs — additional subs needed above 10,000", correct:5556, tol:5},
          {label:"Break-even subscribers (10,000 + additional)",   correct:15556, tol:5, isTotal:true},
        ],
      },
      {
        partLabel:"(4) Should CableVision run the cable operations for the city of Miranda?",
        type:"mcq",
        prompt:"Based on the analysis (OI = −$50,000 at 10,000 subs; +$40,000 at 20,000; +$150,000 at 30,000), should CableVision accept this contract?",
        choices:[
          {id:"a", text:"No — the break-even point of ~15,556 subscribers is too high to achieve in a city of 800,000."},
          {id:"b", text:"Yes — with a city of 800,000, reaching 15,556+ subscribers is very achievable. Once past break-even, operating income grows quickly ($9/sub at 10k–20k range, $11/sub above 20k). At 30,000 subs the company earns $150,000/month. The contract offers significant upside."},
          {id:"c", text:"No — the fixed costs of $130,000/month make the investment too risky."},
          {id:"d", text:"Yes — but only because the city of Miranda is responsible for maintaining the physical facilities."},
        ],
        answer:"b",
        explain:"With 800,000 residents, capturing even 2% penetration gives 16,000 subscribers — above break-even. At 30,000 subs (3.75% penetration) the company earns $150,000/month = $1.8M/year. The tiered cost structure means profitability improves as scale increases. CableVision should accept, but should validate subscriber projections carefully.",
      },
    ],
  },
  {
    id:"q11", nav:"Q11",
    title:"Q11 · Multi-Product Break-Even — Max Company",
    desc:"Max Company: Fixed costs = $3,315,000\n• Good: 30% of mix | Price $250 | VC $100 | CM $150\n• Better: 50% of mix | Price $350 | VC $150 | CM $200\n• Best: 20% of mix | Price $500 | VC $250 | CM $250",
    type:"multi_part",
    parts:[
      {
        partLabel:"(A) Weighted-average unit contribution margin",
        type:"calc_steps",
        steps:[
          {label:"Weighted CM — Good (30% × $150)",               correct:45,    tol:0.01},
          {label:"Weighted CM — Better (50% × $200)",             correct:100,   tol:0.01},
          {label:"Weighted CM — Best (20% × $250)",               correct:50,    tol:0.01},
          {label:"Weighted-average unit CM",                      correct:195,   tol:0.01, isTotal:true},
        ],
      },
      {
        partLabel:"(B) Break-even volume in units for each product",
        type:"calc_steps",
        steps:[
          {label:"Total break-even units ($3,315,000 ÷ $195)",   correct:17000, tol:1},
          {label:"Break-even units — Good (17,000 × 30%)",        correct:5100,  tol:1},
          {label:"Break-even units — Better (17,000 × 50%)",      correct:8500,  tol:1},
          {label:"Break-even units — Best (17,000 × 20%)",        correct:3400,  tol:1},
        ],
      },
      {
        partLabel:"(C) Total units needed for $234,000 profit",
        type:"calc_steps",
        steps:[
          {label:"Fixed costs + target profit",                    correct:3549000, tol:1},
          {label:"Weighted-average CM",                            correct:195,     tol:0.01},
          {label:"Total units needed",                             correct:18200,   tol:1, isTotal:true},
        ],
      },
      {
        partLabel:"(D) New mix — Good 50%, Better 30%, Best 20%. Will break-even increase or decrease?",
        type:"mcq",
        prompt:"If the sales mix changes to 50% Good, 30% Better, 20% Best, will the break-even point increase, decrease, or stay the same?",
        choices:[
          {id:"a", text:"Decrease — shifting mix to Best (highest CM) improves overall profitability."},
          {id:"b", text:"Increase — the new weighted-average CM = (50%×$150) + (30%×$200) + (20%×$250) = $75 + $60 + $50 = $185, which is LOWER than the original $195. A lower weighted-average CM means more total units are needed to cover the same fixed costs. New BEP = $3,315,000 ÷ $185 = 17,919 units vs. original 17,000 units."},
          {id:"c", text:"Stay the same — changing the mix doesn't affect break-even since total fixed costs don't change."},
          {id:"d", text:"Decrease — having more units sold of Good at the lowest price increases total revenue."},
        ],
        answer:"b",
        explain:"New weighted-average CM = 0.50×$150 + 0.30×$200 + 0.20×$250 = $75+$60+$50 = $185. This is lower than original $195 because the shift increases the proportion of Good (lowest CM). Lower blended CM → more total units needed to recover fixed costs. New BEP = $3,315,000÷$185 ≈ 17,919 units > 17,000 original.",
      },
    ],
  },
];

// ─── SCORING ─────────────────────────────────────────────────────────────────
function scoreCalcSteps(steps, ans, pfx) {
  let total=0, correct=0;
  steps.forEach((step,i) => {
    total++;
    if (closeEq(ans[`${pfx}s${i}`], step.correct, step.tol||1)) correct++;
  });
  return {total,correct};
}

function scoreQuestion(q, ans) {
  let total=0, correct=0;
  const add = r => { total+=r.total; correct+=r.correct; };
  const chkSel = (k,c) => { total++; if(ans[k]===c) correct++; };

  if (q.type==="calc_steps") add(scoreCalcSteps(q.steps, ans, `${q.id}_`));
  if (q.type==="mcq") chkSel(`${q.id}_mcq`, q.answer);
  if (q.type==="multi_part") {
    q.parts.forEach((part,pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type==="calc_steps") add(scoreCalcSteps(part.steps, ans, pfx));
      if (part.type==="mcq") chkSel(`${pfx}mcq`, part.answer);
    });
  }
  return {total,correct};
}

function allFilled(q, ans) {
  const csF = (steps,pfx) => steps.every((_,i) => !!ans[`${pfx}s${i}`]);
  if (q.type==="calc_steps") return csF(q.steps, `${q.id}_`);
  if (q.type==="mcq") return !!ans[`${q.id}_mcq`];
  if (q.type==="multi_part") {
    return q.parts.every((part,pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type==="calc_steps") return csF(part.steps, pfx);
      if (part.type==="mcq") return !!ans[`${pfx}mcq`];
      return true;
    });
  }
  return true;
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────

function NumInput({ sk, ans, setAns, correct, tol, revealed, width, allowNeg, unit }) {
  const raw = parseNum(ans[sk]||"");
  const ok  = revealed && raw!==null && Math.abs(raw-correct)<=(tol||1);
  const bad = revealed && ans[sk] && (raw===null||Math.abs(raw-correct)>(tol||1));
  const noA = revealed && !ans[sk];
  const showC = unit==="%"?`${correct}%`:fmtD(correct);
  return (
    <div style={{display:"flex",alignItems:"center",gap:5}}>
      <input value={ans[sk]||""} disabled={revealed} placeholder="0"
        onChange={e=>!revealed&&setAns(p=>({...p,[sk]:fmtComma(e.target.value)}))}
        style={{
          width:width||120, padding:"6px 8px", textAlign:"right", outline:"none",
          ...MONO, fontSize:13,
          border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
          borderRadius:6,
          background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
          color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a", transition:"all .15s",
        }}/>
      {unit && <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>{unit}</span>}
      {ok         && <span style={{color:"#10b981",fontWeight:700,fontSize:14,flexShrink:0}}>✓</span>}
      {(bad||noA) && <span style={{color:"#ef4444",fontSize:11,fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}>→ {showC}</span>}
    </div>
  );
}

// ─── CALC STEP ROW ────────────────────────────────────────────────────────────

function CSRow({ step, si, pfx, ans, setAns, revealed, isLast }) {
  const isTotal = !!step.isTotal;
  const bg = isTotal?"#f1f5f9":si%2===0?"#fff":"#f8fafc";
  return (
    <div style={{
      display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:`${isTotal?8:6}px 14px`, background:bg,
      borderBottom:isLast?"none":"1px solid #f1f5f9",
      borderTop:isTotal?"1.5px solid #cbd5e1":"none", transition:"background .15s",
    }}>
      <span style={{fontSize:13,color:isTotal?"#0f172a":"#374151",fontWeight:isTotal?700:400}}>{step.label}</span>
      <NumInput sk={`${pfx}s${si}`} ans={ans} setAns={setAns}
        correct={step.correct} tol={step.tol||1} revealed={revealed}
        width={130} allowNeg={step.allowNeg||step.correct<0} unit={step.unit||""} />
    </div>
  );
}

function CalcStepsBody({ steps, pfx, ans, setAns, revealed }) {
  return (
    <div style={{border:"1.5px solid #e2e8f0",borderRadius:8,overflow:"hidden"}}>
      {steps.map((step,si)=>(
        <CSRow key={si} step={step} si={si} pfx={pfx} ans={ans} setAns={setAns}
          revealed={revealed} isLast={si===steps.length-1} />
      ))}
    </div>
  );
}

// ─── MCQ BODY ─────────────────────────────────────────────────────────────────

function MCQBody({ q_or_part, ans, setAns, revealed, stateKey }) {
  const k = stateKey, sel = ans[k]||"";
  return (
    <div>
      <div style={{fontSize:13.5,color:"#0f172a",lineHeight:1.5,marginBottom:12}}>{q_or_part.prompt||q_or_part.desc}</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {q_or_part.choices.map(ch=>{
          const isSel=sel===ch.id, isRight=revealed&&ch.id===q_or_part.answer;
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
          <strong>Explanation: </strong>{q_or_part.explain}
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
              {part.type==="calc_steps" && <CalcStepsBody steps={part.steps} pfx={pfx} ans={ans} setAns={setAns} revealed={revealed}/>}
              {part.type==="mcq" && <MCQBody q_or_part={part} ans={ans} setAns={setAns} revealed={revealed} stateKey={`${pfx}mcq`}/>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── QUESTION BODY ────────────────────────────────────────────────────────────

function QuestionBody({ q, ans, setAns, revealed }) {
  if (q.type==="calc_steps") return (
    <div style={{padding:"0 16px 16px"}}>
      <CalcStepsBody steps={q.steps} pfx={`${q.id}_`} ans={ans} setAns={setAns} revealed={revealed}/>
    </div>
  );
  if (q.type==="mcq") return (
    <div style={{padding:"0 16px 16px"}}>
      <MCQBody q_or_part={q} ans={ans} setAns={setAns} revealed={revealed} stateKey={`${q.id}_mcq`}/>
    </div>
  );
  if (q.type==="multi_part") return <MultiPartBody q={q} ans={ans} setAns={setAns} revealed={revealed}/>;
  return null;
}

// ─── CHROME ───────────────────────────────────────────────────────────────────

function Confetti({ active }) {
  const ref=useRef(null), af=useRef(null);
  useEffect(()=>{
    if(!active)return;
    const c=ref.current; if(!c)return;
    const ctx=c.getContext("2d");
    const W=c.width=c.parentElement.offsetWidth, H=c.height=c.parentElement.offsetHeight;
    const cols=["#0ea5e9","#10b981","#f59e0b","#f43f5e","#a855f7","#22d3ee"];
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
    <div style={{display:"flex",alignItems:"center",gap:5,padding:"10px 14px",
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
            style={{minWidth:isCur?60:46,height:34,padding:"0 8px",borderRadius:isCur?7:20,
              background:bg,border:isCur?`2px solid ${TEAL}`:"2px solid transparent",
              color:isCur?"#0f172a":"#fff",cursor:"pointer",fontSize:isCur?12:11,fontWeight:700,
              transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",boxShadow:isCur?`0 2px 8px ${TEAL}44`:"none",lineHeight:1.2}}>
            <span>{q.nav}</span>
            {g&&!isCur&&<span style={{fontSize:8,opacity:.85}}>{g.correct}/{g.total}</span>}
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
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>
          Ch6 Special · Final Score
        </div>
        <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",
          padding:"20px 52px",borderRadius:12,background:"#f8fafc",border:`2px solid ${c}22`,marginBottom:20}}>
          <div style={{fontSize:54,fontWeight:800,color:c,lineHeight:1}}>
            {correct}<span style={{fontSize:26,color:"#94a3b8"}}>/{total}</span>
          </div>
          <div style={{fontSize:14,color:c,marginTop:4,fontWeight:700}}>{p}%</div>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"center",marginBottom:24}}>
          {QUESTIONS.map(q=>{
            const g=grades[q.id]; if(!g)return null;
            const qp=pctCalc(g.correct,g.total),qc=qp===100?"#10b981":qp>=70?"#d97706":"#ef4444";
            return <div key={q.id} style={{padding:"4px 10px",borderRadius:20,
              background:qc+"15",border:`1px solid ${qc}33`,fontSize:11.5,fontWeight:600,color:qc}}>
              {q.nav}: {g.correct}/{g.total}
            </div>;
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
export default function Ch06Special({ onComplete } = {}) {
  const [savedDraft] = useState(() => {
    const draft = loadQuizDraft("ch06sp");
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) return null;
    const grades = draft.graded;
    const isComplete = grades && typeof grades === "object" && QUESTIONS.every(q => grades[q.id]);
    if (isComplete) {
      clearQuizDraft("ch06sp");
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
    const totals = Object.values(graded).reduce((acc, item) => {
      acc.correct += item.correct || 0;
      acc.total += item.total || 0;
      return acc;
    }, { correct: 0, total: 0 });
    onComplete?.({
      chapterId: "ch06sp",
      chapterLabel: "Ch6 SP",
      ...totals,
      percent: pctCalc(totals.correct, totals.total),
      completedAt: new Date().toISOString(),
    });
  }, [screen, graded, onComplete]);

  useEffect(() => {
    if (screen === "results") clearQuizDraft("ch06sp");
  }, [screen]);

  useEffect(() => {
    if (screen === "results") return;
    saveQuizDraft("ch06sp", { cur, ans, graded, screen, revIdx, stickyOpen });
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
  const inner={maxWidth:1000,margin:"0 auto",padding:"24px 16px"};
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
    return <div style={wrap}><style>{CSS}</style><div style={inner}><div style={card}>
      <ResultsScreen grades={graded} onRetry={resetAll} onReview={()=>{setRevIdx(0);setScreen("review");}}/>
    </div></div></div>;
  }

  return (
    <div style={wrap}><style>{CSS}</style><div style={inner}>
      <div style={{marginBottom:14}}>
        <h1 style={{fontWeight:800,fontSize:22,margin:0}}>Chapter 6 Special — CVP Analysis Practice</h1>
        <p style={{fontSize:12,color:"#64748b",margin:"3px 0 0"}}>
          Q1–Q11 · CM, Break-Even, Target Income, Sensitivity, Multi-Product, Tiered Pricing
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
