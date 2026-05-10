import { useState, useRef, useEffect } from "react";
import { loadQuizDraft, saveQuizDraft, clearQuizDraft } from "./quiz-progress.js";

// ─── UTILS ────────────────────────────────────────────────────────────────────
const parseNum = s => {
  if (!s || !s.trim()) return null;
  const neg = s.includes("(") || s.trim().startsWith("-");
  const num = parseFloat(s.replace(/[$,()\-\s]/g, ""));
  return isNaN(num) ? null : (neg ? -num : num);
};
const fmtComma = v => {
  const neg = v.trim().startsWith("-") || v.includes("(");
  const s = v.replace(/[^0-9.]/g, "");
  if (!s) return neg ? "-" : "";
  const p = s.split(".");
  const i = parseInt(p[0] || "0", 10).toLocaleString();
  return (neg ? "-" : "") + (p.length > 1 ? i + "." + p[1].slice(0, 2) : i);
};
const fmtFactor = v => {
  const s = v.replace(/[^0-9.]/g, "");
  if (!s) return "";
  const p = s.split(".");
  return p[0] + (p.length > 1 ? "." + p[1].slice(0, 4) : "");
};
const fmtPercent = v => {
  const s = v.replace(/[^0-9.]/g, "");
  if (!s) return "";
  const p = s.split(".");
  return p[0] + (p.length > 1 ? "." + p[1].slice(0, 2) : "");
};
const fmtD = n => {
  if (n === null || n === undefined) return "";
  const abs = Math.abs(n).toLocaleString();
  return n < 0 ? `(${abs})` : abs;
};
const closeEq = (stateVal, correct, tol = 1) => {
  const r = parseNum(stateVal);
  return r !== null && Math.abs(r - correct) <= tol;
};
const pctCalc = (a, b) => b ? Math.round(a / b * 100) : 0;
const MONO  = { fontFamily: "'JetBrains Mono','Courier New',monospace" };
const SLATE = { background: "linear-gradient(135deg,#334155,#475569)" };
const TEAL  = "#0d9488";
const INDIGO_G = { background: "linear-gradient(135deg,#4f46e5,#6366f1)" };
const NPV_GRID_COLS = "60px minmax(220px,1fr) 150px 180px";
const NPV_MIN_WIDTH = 760;

// ─── QUESTION DATA ─────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: "q19", nav: "Q19",
    title: "Q19 · Present Value of $1 (Single Amount)",
    desc: "Use the Present Value of $1 table (Figure 8.9) to look up the PV factor for each scenario, then compute the present value.",
    type: "pv_lookup_table",
    tableType: "single",
    rows: [
      { desc: "$10,000 received 4 years from today",  cf: 10000,   n: 4,  rate: "10%", factorCorrect: 0.6830, pvCorrect: 6830,  pvTol: 5  },
      { desc: "$10,000 received 4 years from today",  cf: 10000,   n: 4,  rate: "20%", factorCorrect: 0.4823, pvCorrect: 4823,  pvTol: 5  },
      { desc: "$50,000 received 15 years from today", cf: 50000,   n: 15, rate: "12%", factorCorrect: 0.1827, pvCorrect: 9135,  pvTol: 10 },
      { desc: "$50,000 received 15 years from today", cf: 50000,   n: 15, rate: "6%",  factorCorrect: 0.4173, pvCorrect: 20865, pvTol: 10 },
    ],
  },

  {
    id: "q20", nav: "Q20",
    title: "Q20 · Present Value of Annuity",
    desc: "Use the Present Value of $1 Annuity table (Figure 8.10) to look up the PV factor for each scenario, then compute the present value. Round to the nearest dollar.",
    type: "pv_lookup_table",
    tableType: "annuity",
    rows: [
      { desc: "$1,000/year for 6 years",    cf: 1000,   n: 6, rate: "12%", factorCorrect: 4.1114, pvCorrect: 4111,   pvTol: 5   },
      { desc: "$1,000/year for 6 years",    cf: 1000,   n: 6, rate: "15%", factorCorrect: 3.7845, pvCorrect: 3785,   pvTol: 5   },
      { desc: "$10,000/year for 6 years",   cf: 10000,  n: 6, rate: "7%",  factorCorrect: 4.7665, pvCorrect: 47665,  pvTol: 10  },
      { desc: "$250,000/year for 4 years",  cf: 250000, n: 4, rate: "10%", factorCorrect: 3.1699, pvCorrect: 792475, pvTol: 50  },
    ],
  },

  {
    id: "q21", nav: "Q21",
    title: "Q21 · NPV Comparison — Freefall, Inc.",
    desc: "Freefall, Inc. has two independent investments, each requiring $65,000 initial investment. Required rate of return: 8%.\n• Investment Y: Year 1 $35,000 | Year 2 $25,000 | Year 3 $15,000 | Year 4 $5,000\n• Investment Z: Year 1 $5,000 | Year 2 $15,000 | Year 3 $25,000 | Year 4 $35,000\nBoth total $80,000 in inflows.",
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Without Calculating — Which Investment Has the Higher NPV?",
        type: "mcq",
        prompt: "Without performing any calculations, which investment — Y or Z — do you expect to have the higher net present value? Why?",
        choices: [
          { id: "a", text: "Investment Z — it receives larger cash flows in the later years, which allows the initial investment more time to grow." },
          { id: "b", text: "Investment Y — it receives larger cash flows in the early years. A dollar received sooner is worth more under the time value of money, so the earlier-weighted inflows have a higher present value than the same total received later." },
          { id: "c", text: "They are equal — both investments have $80,000 total inflows from the same $65,000 investment." },
          { id: "d", text: "Investment Z — the later years have higher discount factors, which amplifies the present value of the larger payments." },
        ],
        answer: "b",
        explain: "Time value of money: a dollar received today is worth more than a dollar received in the future. Investment Y's cash inflows are front-loaded ($35,000 in Year 1 vs. $5,000), so they are discounted less. This gives Investment Y a higher net present value even though total inflows are identical.",
      },
      {
        partLabel: "(b) Calculate NPV for Each Investment at 8% — Should the Company Invest?",
        type: "twin_npv",
        rate: 8,
        schedules: [
          {
            name: "Investment Y",
            rows: [
              { year: "0", cfCorrect: -65000, factorCorrect: 1.0000, pvCorrect: -65000 },
              { year: "1", cfCorrect: 35000,  factorCorrect: 0.9259, pvCorrect: 32407 },
              { year: "2", cfCorrect: 25000,  factorCorrect: 0.8573, pvCorrect: 21433 },
              { year: "3", cfCorrect: 15000,  factorCorrect: 0.7938, pvCorrect: 11907 },
              { year: "4", cfCorrect: 5000,   factorCorrect: 0.7350, pvCorrect: 3675  },
            ],
            npvCorrect: 4422, npvTol: 10,
          },
          {
            name: "Investment Z",
            rows: [
              { year: "0", cfCorrect: -65000, factorCorrect: 1.0000, pvCorrect: -65000 },
              { year: "1", cfCorrect: 5000,   factorCorrect: 0.9259, pvCorrect: 4630  },
              { year: "2", cfCorrect: 15000,  factorCorrect: 0.8573, pvCorrect: 12860 },
              { year: "3", cfCorrect: 25000,  factorCorrect: 0.7938, pvCorrect: 19845 },
              { year: "4", cfCorrect: 35000,  factorCorrect: 0.7350, pvCorrect: 25725 },
            ],
            npvCorrect: -1940, npvTol: 10,
          },
        ],
        decisionMCQ: {
          prompt: "Should the company invest in either investment?",
          choices: [
            { id: "a", text: "Invest in both — both have positive total inflows over the life of the project." },
            { id: "b", text: "Invest in Investment Y only — it has a positive NPV ($4,421), meaning it earns more than the 8% required return. Investment Z has a negative NPV (−$1,941), meaning it fails to earn the required rate of return." },
            { id: "c", text: "Invest in Investment Z only — it has a larger final-year cash flow, making it more predictable." },
            { id: "d", text: "Do not invest in either — neither investment generates sufficient cash flow to justify the $65,000 outlay." },
          ],
          answer: "b",
          explain: "Accept projects where NPV ≥ 0 (earns at least the required return). Investment Y: NPV ≈ +$4,421 → Accept. Investment Z: NPV ≈ −$1,941 → Reject (fails to earn 8% return).",
        },
      },
    ],
  },

  {
    id: "q29", nav: "Q29",
    title: "Q29 · NPV Analysis — Architect Services, Inc.",
    desc: "Architect Services, Inc. — blueprint machine purchase:\n• Initial cost: $50,000 | Expected life: 4 years | Salvage value: $10,000\n• Annual maintenance costs: $14,000 | Annual savings: $30,000\n• Required rate of return: 11%",
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Net Cash Flow — Ignoring Time Value of Money",
        type: "calc_steps",
        steps: [
          { label: "Annual savings",                          correct: 30000  },
          { label: "Less: Annual maintenance costs",          correct: 14000  },
          { label: "Annual net cash inflow",                  correct: 16000,  isTotal: true },
          { label: "Life of machine (years)",                 correct: 4      },
          { label: "Total net inflows over life of machine",  correct: 64000  },
          { label: "Plus: Salvage value",                     correct: 10000  },
          { label: "Less: Initial investment",                correct: 50000  },
          { label: "Net cash inflow (ignoring TVM)",          correct: 24000,  isTotal: true, bold: true },
        ],
      },
      {
        partLabel: "(b) NPV Calculation at 11% — Figure 8.2 Format",
        type: "npv_schedule",
        title: "Architect Services, Inc. — Blueprint Machine NPV at 11%",
        rows: [
          { year: "0", cfCorrect: -50000, factorCorrect: 1.0000, pvCorrect: -50000, cfTol: 1,  pvTol: 5 },
          { year: "1", cfCorrect: 16000,  factorCorrect: 0.9009, pvCorrect: 14414,  cfTol: 1,  pvTol: 10 },
          { year: "2", cfCorrect: 16000,  factorCorrect: 0.8116, pvCorrect: 12986,  cfTol: 1,  pvTol: 10 },
          { year: "3", cfCorrect: 16000,  factorCorrect: 0.7312, pvCorrect: 11699,  cfTol: 1,  pvTol: 10 },
          { year: "4", cfCorrect: 26000,  factorCorrect: 0.6587, pvCorrect: 17126,  cfTol: 1,  pvTol: 10 },
        ],
        npvCorrect: 6225, npvTol: 20,
        note: "Year 4 CF = annual net cash inflow ($16,000) + salvage value ($10,000)",
      },
      {
        partLabel: "(c) Investment Decision",
        type: "mcq",
        prompt: "Should Architect Services purchase the blueprint machine? Explain.",
        choices: [
          { id: "a", text: "No — the machine's annual savings ($30,000) are not significantly higher than its annual maintenance cost ($14,000), making the investment marginal at best." },
          { id: "b", text: "Yes — the NPV is positive ($6,225), indicating the investment earns more than the required 11% rate of return. The positive NPV means the present value of future cash inflows exceeds the initial investment." },
          { id: "c", text: "No — the NPV, while positive, is less than 10% of the initial investment ($50,000), making it insufficient." },
          { id: "d", text: "Yes — because the total undiscounted cash inflows ($74,000) exceed the initial investment ($50,000)." },
        ],
        answer: "b",
        explain: "The decision rule: accept if NPV > 0. NPV = $6,225 > 0 → the investment earns more than the 11% required rate of return. The NPV represents the surplus value created above the required return. Purchase the machine.",
      },
    ],
  },

  {
    id: "q30", nav: "Q30",
    title: "Q30 · IRR — Architect Services, Inc. (Same Data as Q29)",
    desc: "Same data as Q29: Initial cost $50,000 | Life 4 years | Salvage $10,000 | Annual maintenance $14,000 | Annual savings $30,000 | Required rate 11%.\nAnnual net CF = $16,000 | Year 4 CF = $26,000 (includes $10,000 salvage)\n\nUse trial and error to bracket the IRR. Try 15%, then 17%.",
    type: "multi_part",
    sticky: true,
    parts: [
      {
        partLabel: "(a) Trial-and-Error IRR — Try 15% and 17%",
        type: "irr_bracket",
        cfLabel: "Cash Flow (given)",
        baseCFs: [
          { year: "0", cf: -50000 },
          { year: "1", cf: 16000  },
          { year: "2", cf: 16000  },
          { year: "3", cf: 16000  },
          { year: "4", cf: 26000  },
        ],
        trials: [
          {
            rate: 15,
            rows: [
              { year: "0", factorCorrect: 1.0000, pvCorrect: -50000, pvTol: 1  },
              { year: "1", factorCorrect: 0.8696, pvCorrect: 13914,  pvTol: 10 },
              { year: "2", factorCorrect: 0.7561, pvCorrect: 12098,  pvTol: 10 },
              { year: "3", factorCorrect: 0.6575, pvCorrect: 10520,  pvTol: 10 },
              { year: "4", factorCorrect: 0.5718, pvCorrect: 14867,  pvTol: 10 },
            ],
            npvCorrect: 1399, npvTol: 20,
          },
          {
            rate: 17,
            rows: [
              { year: "0", factorCorrect: 1.0000, pvCorrect: -50000, pvTol: 1  },
              { year: "1", factorCorrect: 0.8547, pvCorrect: 13675,  pvTol: 10 },
              { year: "2", factorCorrect: 0.7305, pvCorrect: 11688,  pvTol: 10 },
              { year: "3", factorCorrect: 0.6244, pvCorrect: 9990,   pvTol: 10 },
              { year: "4", factorCorrect: 0.5337, pvCorrect: 13876,  pvTol: 10 },
            ],
            npvCorrect: -771, npvTol: 20,
          },
        ],
        conclusion: {
          bracketOpts: ["Between 8% and 11%", "Between 11% and 13%", "Between 13% and 15%", "Between 15% and 17%", "Between 17% and 20%"],
          bracketCorrect: "Between 15% and 17%",
          estimateOpts: ["13%", "14%", "15%", "16%", "17%"],
          estimateCorrect: "16%",
        },
      },
      {
        partLabel: "(b) Should the Company Purchase the Blueprint Machine?",
        type: "mcq",
        prompt: "Based on the IRR analysis, should Architect Services purchase the blueprint machine?",
        choices: [
          { id: "a", text: "No — the IRR (≈16%) is too close to the required rate (11%) to provide a comfortable margin of safety." },
          { id: "b", text: "Yes — the IRR (≈16%) exceeds the required rate of return (11%). When IRR > required rate, the investment earns more than the minimum acceptable return, creating value for the company." },
          { id: "c", text: "No — the NPV turned negative at 17%, indicating the investment cannot sustain higher interest rates." },
          { id: "d", text: "Yes — but only because the IRR exceeds the inflation rate." },
        ],
        answer: "b",
        explain: "IRR decision rule: accept when IRR ≥ required rate of return. IRR ≈ 16% > required rate 11%. This means the investment earns a 16% return on invested capital, which exceeds the 11% minimum. Consistent with the positive NPV in Q29 — both methods recommend purchasing.",
      },
    ],
  },

  {
    id: "q31", nav: "Q31",
    title: "Q31 · Payback Period — Architect Services, Inc. (Same Data)",
    desc: "Same data: Initial investment $50,000 | Annual savings $30,000 | Annual maintenance $14,000 | Annual net CF = $16,000\n\nPrepare the payback table and determine the payback period.",
    type: "payback_table",
    initialInvestment: 50000,
    rows: [
      { year: 1, cfCorrect: 16000, cumCorrect: 16000 },
      { year: 2, cfCorrect: 16000, cumCorrect: 32000 },
      { year: 3, cfCorrect: 16000, cumCorrect: 48000 },
      { year: 4, cfCorrect: 16000, cumCorrect: 64000 },
    ],
    paybackCorrect: 3.125, paybackTol: 0.01,
    paybackNote: "After Year 3: $48,000 recovered. Remaining: $50,000 − $48,000 = $2,000. Fraction: $2,000 ÷ $16,000 = 0.125",
  },

  {
    id: "q32", nav: "Q32",
    title: "Q32 · Alternative Format NPV — Conway Construction Corporation",
    desc: "Conway Construction — fleet of trucks:\n• Truck purchase (Year 0): $260,000 | Additional equipment (end of Year 2): $40,000\n• Life: 8 years | Salvage value (Year 8): $20,000\n• Annual net cash receipts: $135,000 | Annual maintenance, insurance & other expenses: $42,000\n• Required rate of return: 14%",
    type: "multi_part",
    sticky: true,
    parts: [
      {
        partLabel: "(a) NPV Calculation — Alternative Format (Figure 8.4)",
        type: "alt_npv_table",
        title: "Conway Construction — Fleet of Trucks NPV at 14%",
        rows: [
          { desc: "Initial investment — truck purchase",                                     cfCorrect: -260000, factorCorrect: 1.0000, pvCorrect: -260000, pvTol: 5  },
          { desc: "Additional equipment purchased (end of Year 2)",                          cfCorrect: -40000,  factorCorrect: 0.7695, pvCorrect: -30780,  pvTol: 10 },
          { desc: "Annual net cash receipts (8-year annuity)",                               cfCorrect: 135000,  factorCorrect: 4.6389, pvCorrect: 626252,  pvTol: 50 },
          { desc: "Annual maintenance, insurance, and other expenses (8-year annuity)",      cfCorrect: -42000,  factorCorrect: 4.6389, pvCorrect: -194834, pvTol: 50 },
          { desc: "Salvage value received (end of Year 8)",                                  cfCorrect: 20000,   factorCorrect: 0.3506, pvCorrect: 7012,    pvTol: 10 },
        ],
        npvCorrect: 147650, npvTol: 100,
        note: "Use Figure 8.10 annuity factor (4.6389) for 8 years at 14%. Use Figure 8.9 single-payment factors for Year 2 and Year 8.",
      },
      {
        partLabel: "(b) Investment Decision",
        type: "mcq",
        prompt: "Should Conway Construction Corporation purchase the fleet of trucks?",
        choices: [
          { id: "a", text: "No — the investment requires two separate cash outflows ($260,000 and $40,000), which creates too much financial risk." },
          { id: "b", text: "Yes — the NPV is positive ($147,650), indicating the fleet generates returns well above the 14% required rate. The trucks create $147,650 of surplus value in present value terms." },
          { id: "c", text: "No — annual maintenance and insurance costs ($42,000) are too close to annual receipts ($135,000) to justify the purchase." },
          { id: "d", text: "Yes — but only because the trucks generate a higher total cash inflow than their combined cost on an undiscounted basis." },
        ],
        answer: "b",
        explain: "NPV = $147,650 > 0 → accept. The present value of all future cash inflows ($147,650 surplus) significantly exceeds the required 14% return. This is a strong positive NPV — the truck investment creates substantial value for Conway Construction.",
      },
    ],
  },

  {
    id: "q33", nav: "Q33",
    title: "Q33 · NPV & IRR Using Excel — Wood Products Company",
    desc: "Wood Products Company — computerized wood lathe:\n• Purchase price: $100,000 | Life: 5 years | Salvage value: $5,000\n• Annual maintenance: $20,000 | Annual net cash receipts: $45,000\n• Required rate of return: 15%\n• Annual net CF = $25,000 ($45,000 − $20,000) | Year 5 CF = $30,000 ($25,000 + $5,000 salvage)",
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Read NPV and IRR from Excel Output",
        type: "excel_npv_irr",
        cashFlows: [
          { year: 0, cf: -100000 },
          { year: 1, cf: 25000  },
          { year: 2, cf: 25000  },
          { year: 3, cf: 25000  },
          { year: 4, cf: 25000  },
          { year: 5, cf: 30000  },
        ],
        rate: 15,
        npvCorrect: -13710, npvTol: 10,
        irrCorrect: 9.18,   irrTol: 0.05,
      },
      {
        partLabel: "(b) Investment Decision",
        type: "mcq",
        prompt: "Should Wood Products Company purchase the wood lathe?",
        choices: [
          { id: "a", text: "Yes — the company needs the machine to remain competitive, regardless of the NPV." },
          { id: "b", text: "Yes — the IRR (9.18%) is within 6 percentage points of the required rate (15%), which is close enough to justify the purchase." },
          { id: "c", text: "No — the NPV is negative (−$13,710), meaning the investment fails to earn the required 15% rate of return. The IRR (9.18%) is also below the required rate, confirming the project should be rejected." },
          { id: "d", text: "No — only because the salvage value ($5,000) is too small relative to the initial investment." },
        ],
        answer: "c",
        explain: "Both decision criteria give the same answer: NPV < 0 and IRR (9.18%) < required rate (15%) → Reject. The investment does not generate returns sufficient to compensate for the cost of capital at 15%. Accepting it would destroy value.",
      },
    ],
  },
];

// ─── SCORING ──────────────────────────────────────────────────────────────────
function scorePVLookup(q, ans) {
  let total = 0, correct = 0;
  q.rows.forEach((row, i) => {
    total += 2;
    if (closeEq(ans[`${q.id}_f${i}`], row.factorCorrect, 0.0005)) correct++;
    if (closeEq(ans[`${q.id}_pv${i}`], row.pvCorrect, row.pvTol || 5)) correct++;
  });
  return { total, correct };
}

function scoreNPVSchedule(rows, npvCorrect, npvTol, ans, pfx) {
  let total = 0, correct = 0;
  rows.forEach((row, i) => {
    total += 3; // CF + factor + PV
    if (closeEq(ans[`${pfx}cf${i}`], row.cfCorrect, row.cfTol || 1)) correct++;
    if (closeEq(ans[`${pfx}fc${i}`], row.factorCorrect, 0.0005)) correct++;
    if (closeEq(ans[`${pfx}pv${i}`], row.pvCorrect, row.pvTol || 10)) correct++;
  });
  total++; if (closeEq(ans[`${pfx}npv`], npvCorrect, npvTol)) correct++;
  return { total, correct };
}

function scoreAltNPV(rows, npvCorrect, npvTol, ans, pfx) {
  let total = 0, correct = 0;
  rows.forEach((row, i) => {
    total += 3;
    if (closeEq(ans[`${pfx}cf${i}`], row.cfCorrect, row.cfTol || 1)) correct++;
    if (closeEq(ans[`${pfx}fc${i}`], row.factorCorrect, 0.0005)) correct++;
    if (closeEq(ans[`${pfx}pv${i}`], row.pvCorrect, row.pvTol || 10)) correct++;
  });
  total++; if (closeEq(ans[`${pfx}npv`], npvCorrect, npvTol)) correct++;
  return { total, correct };
}

function scoreQuestion(q, ans) {
  let total = 0, correct = 0;
  const add = r => { total += r.total; correct += r.correct; };

  if (q.type === "pv_lookup_table") add(scorePVLookup(q, ans));
  if (q.type === "payback_table") {
    q.rows.forEach((row, i) => {
      total += 2;
      if (closeEq(ans[`${q.id}_cf${i}`], row.cfCorrect)) correct++;
      if (closeEq(ans[`${q.id}_cum${i}`], row.cumCorrect)) correct++;
    });
    total++; if (closeEq(ans[`${q.id}_pp`], q.paybackCorrect, q.paybackTol)) correct++;
  }
  if (q.type === "multi_part") {
    q.parts.forEach((part, pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type === "mcq") {
        total++; if (ans[`${pfx}mcq`] === part.answer) correct++;
      }
      if (part.type === "calc_steps") {
        part.steps.forEach((step, si) => {
          total++; if (closeEq(ans[`${pfx}cs${si}`], step.correct, step.tol || 1)) correct++;
        });
      }
      if (part.type === "twin_npv") {
        part.schedules.forEach((sched, si) => {
          add(scoreNPVSchedule(sched.rows, sched.npvCorrect, sched.npvTol, ans, `${pfx}s${si}_`));
        });
        if (part.decisionMCQ) {
          total++; if (ans[`${pfx}dmcq`] === part.decisionMCQ.answer) correct++;
        }
      }
      if (part.type === "npv_schedule") {
        add(scoreNPVSchedule(part.rows, part.npvCorrect, part.npvTol, ans, pfx));
      }
      if (part.type === "irr_bracket") {
        part.trials.forEach((trial, ti) => {
          const tpfx = `${pfx}t${ti}_`;
          trial.rows.forEach((row, ri) => {
            total += 2;
            if (closeEq(ans[`${tpfx}fc${ri}`], row.factorCorrect, 0.0005)) correct++;
            if (closeEq(ans[`${tpfx}pv${ri}`], row.pvCorrect, row.pvTol || 10)) correct++;
          });
          total++; if (closeEq(ans[`${tpfx}npv`], trial.npvCorrect, trial.npvTol)) correct++;
        });
        total++; if (ans[`${pfx}bracket`] === part.conclusion.bracketCorrect) correct++;
        total++; if (ans[`${pfx}estimate`] === part.conclusion.estimateCorrect) correct++;
      }
      if (part.type === "alt_npv_table") {
        add(scoreAltNPV(part.rows, part.npvCorrect, part.npvTol, ans, pfx));
      }
      if (part.type === "excel_npv_irr") {
        total++;
        const npvRaw = parseNum(ans[`${pfx}npv`]);
        if (npvRaw !== null && Math.abs(npvRaw - part.npvCorrect) <= part.npvTol) correct++;
        total++;
        const irrRaw = parseNum(ans[`${pfx}irr`]);
        if (irrRaw !== null && Math.abs(irrRaw - part.irrCorrect) <= part.irrTol) correct++;
      }
    });
  }
  return { total, correct };
}

function allFilled(q, ans) {
  if (q.type === "pv_lookup_table")
    return q.rows.every((_, i) => ans[`${q.id}_f${i}`] && ans[`${q.id}_pv${i}`]);
  if (q.type === "payback_table")
    return q.rows.every((_, i) => ans[`${q.id}_cf${i}`] && ans[`${q.id}_cum${i}`]) && !!ans[`${q.id}_pp`];
  if (q.type === "multi_part") {
    return q.parts.every((part, pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type === "mcq") return !!ans[`${pfx}mcq`];
      if (part.type === "calc_steps") return part.steps.every((_, si) => !!ans[`${pfx}cs${si}`]);
      if (part.type === "twin_npv") {
        const sched = part.schedules.every((s, si) =>
          s.rows.every((_, ri) =>
            ans[`${pfx}s${si}_cf${ri}`] && ans[`${pfx}s${si}_fc${ri}`] && ans[`${pfx}s${si}_pv${ri}`]
          ) && !!ans[`${pfx}s${si}_npv`]
        );
        const dm = part.decisionMCQ ? !!ans[`${pfx}dmcq`] : true;
        return sched && dm;
      }
      if (part.type === "npv_schedule")
        return part.rows.every((_, ri) =>
          ans[`${pfx}cf${ri}`] && ans[`${pfx}fc${ri}`] && ans[`${pfx}pv${ri}`]
        ) && !!ans[`${pfx}npv`];
      if (part.type === "irr_bracket") {
        const trials = part.trials.every((trial, ti) => {
          const tpfx = `${pfx}t${ti}_`;
          return trial.rows.every((_, ri) => ans[`${tpfx}fc${ri}`] && ans[`${tpfx}pv${ri}`])
            && !!ans[`${tpfx}npv`];
        });
        return trials && !!ans[`${pfx}bracket`] && !!ans[`${pfx}estimate`];
      }
      if (part.type === "alt_npv_table")
        return part.rows.every((_, ri) =>
          ans[`${pfx}cf${ri}`] && ans[`${pfx}fc${ri}`] && ans[`${pfx}pv${ri}`]
        ) && !!ans[`${pfx}npv`];
      if (part.type === "excel_npv_irr")
        return !!ans[`${pfx}npv`] && !!ans[`${pfx}irr`];
      return true;
    });
  }
  return true;
}

// ─── ATOMS (ALL MODULE SCOPE) ──────────────────────────────────────────────────

// Standard dollar NumInput
function NumInput({ sk, ans, setAns, correct, tol, revealed, width, allowNeg }) {
  const raw = parseNum(ans[sk] || "");
  const ok  = revealed && raw !== null && Math.abs(raw - correct) <= tol;
  const bad = revealed && ans[sk]  && (raw === null || Math.abs(raw - correct) > tol);
  const noA = revealed && !ans[sk];
  const showC = fmtD(correct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input value={ans[sk] || ""} disabled={revealed} placeholder="0"
        onChange={e => !revealed && setAns(p => ({ ...p, [sk]: fmtComma(e.target.value) }))}
        style={{
          width: width || 118, padding: "5px 8px", textAlign: "right", outline: "none",
          ...MONO, fontSize: 12.5,
          border: `1.5px solid ${ok ? "#10b981" : bad || noA ? "#ef4444" : "#cbd5e1"}`,
          borderRadius: 6,
          background: ok ? "#f0fdf4" : bad || noA ? "#fef2f2" : "#fff",
          color: ok ? "#065f46" : bad || noA ? "#7f1d1d" : "#0f172a",
          transition: "all .15s",
        }} />
      {ok         && <span style={{ color: "#10b981", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>✓</span>}
      {(bad || noA) && <span style={{ color: "#ef4444", fontSize: 10.5, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>→ {showC}</span>}
    </div>
  );
}

// PV Factor input (4 decimal places, no commas)
function FactorInput({ sk, ans, setAns, correct, revealed, width }) {
  const raw = parseFloat(ans[sk] || "");
  const ok  = revealed && !isNaN(raw) && Math.abs(raw - correct) <= 0.0005;
  const bad = revealed && ans[sk] && (isNaN(raw) || Math.abs(raw - correct) > 0.0005);
  const noA = revealed && !ans[sk];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input value={ans[sk] || ""} disabled={revealed} placeholder="0.0000"
        onChange={e => !revealed && setAns(p => ({ ...p, [sk]: fmtFactor(e.target.value) }))}
        style={{
          width: width || 90, padding: "5px 8px", textAlign: "right", outline: "none",
          ...MONO, fontSize: 12.5,
          border: `1.5px solid ${ok ? "#10b981" : bad || noA ? "#ef4444" : "#cbd5e1"}`,
          borderRadius: 6,
          background: ok ? "#f0fdf4" : bad || noA ? "#fef2f2" : "#fff",
          color: ok ? "#065f46" : bad || noA ? "#7f1d1d" : "#0f172a",
          transition: "all .15s",
        }} />
      {ok         && <span style={{ color: "#10b981", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>✓</span>}
      {(bad || noA) && <span style={{ color: "#ef4444", fontSize: 10.5, fontWeight: 600, flexShrink: 0 }}>→ {correct.toFixed(4)}</span>}
    </div>
  );
}

// Given value span (static, non-editable)
function GivenSpan({ value, negative }) {
  const display = negative ? `(${Math.abs(value).toLocaleString()})` : value.toLocaleString();
  return (
    <span style={{ ...MONO, fontSize: 12.5, color: "#64748b", display: "block",
      textAlign: "right", padding: "5px 8px", minWidth: 90 }}>{display}</span>
  );
}

// NPV table header row
function NPVTableHeader({ col1Label }) {
  return (
    <div style={{ ...SLATE, display: "grid", gridTemplateColumns: NPV_GRID_COLS,
      borderBottom: "1px solid #334155" }}>
      <div style={{ padding: "8px 10px", color: "#94a3b8", fontWeight: 700, fontSize: 11 }}>{col1Label || "Year"}</div>
      <div style={{ padding: "8px 10px", color: "#fff", fontWeight: 700, fontSize: 11 }}>Cash Flow</div>
      <div style={{ padding: "8px 10px", color: "#fff", fontWeight: 700, fontSize: 11, textAlign: "right" }}>PV Factor</div>
      <div style={{ padding: "8px 10px", color: "#fff", fontWeight: 700, fontSize: 11, textAlign: "right" }}>Present Value</div>
    </div>
  );
}

// Alt NPV table header (Description instead of Year/CF)
function AltNPVTableHeader() {
  return (
    <div style={{ ...SLATE, display: "grid", gridTemplateColumns: "1fr 130px 110px 130px",
      borderBottom: "1px solid #334155" }}>
      <div style={{ padding: "8px 12px", color: "#fff", fontWeight: 700, fontSize: 11 }}>Description</div>
      <div style={{ padding: "8px 10px", color: "#fff", fontWeight: 700, fontSize: 11, textAlign: "right" }}>Cash Flow (a)</div>
      <div style={{ padding: "8px 10px", color: "#fff", fontWeight: 700, fontSize: 11, textAlign: "right" }}>PV Factor (b)</div>
      <div style={{ padding: "8px 10px", color: "#fff", fontWeight: 700, fontSize: 11, textAlign: "right" }}>Present Value (a×b)</div>
    </div>
  );
}

// Single NPV data row (CF + Factor + PV all as inputs)
function NPVDataRow({ row, rowIdx, cfSk, fcSk, pvSk, ans, setAns, revealed, isLast, yearLabel }) {
  const isCFNeg = row.cfCorrect < 0;
  const isPVNeg = row.pvCorrect < 0;
  const bg = rowIdx % 2 === 0 ? "#fff" : "#f8fafc";
  return (
    <div style={{ display: "grid", gridTemplateColumns: NPV_GRID_COLS,
      background: bg, borderBottom: isLast ? "none" : "1px solid #f1f5f9",
      alignItems: "center" }}>
      <div style={{ padding: "6px 10px", fontSize: 12.5, fontWeight: 600, color: "#475569",
        ...MONO }}>{yearLabel || row.year}</div>
      <div style={{ padding: "4px 8px" }}>
        <NumInput sk={cfSk} ans={ans} setAns={setAns} correct={row.cfCorrect}
          tol={row.cfTol || 1} revealed={revealed} width={120} allowNeg={isCFNeg} />
      </div>
      <div style={{ padding: "4px 6px" }}>
        <FactorInput sk={fcSk} ans={ans} setAns={setAns} correct={row.factorCorrect}
          revealed={revealed} width={88} />
      </div>
      <div style={{ padding: "4px 8px" }}>
        <NumInput sk={pvSk} ans={ans} setAns={setAns} correct={row.pvCorrect}
          tol={row.pvTol || 10} revealed={revealed} width={110} allowNeg={isPVNeg} />
      </div>
    </div>
  );
}

// IRR trial row (CF given, Factor + PV as inputs)
function IRRDataRow({ row, rowIdx, cf, fcSk, pvSk, ans, setAns, revealed, isLast }) {
  const isPVNeg = row.pvCorrect < 0;
  const bg = rowIdx % 2 === 0 ? "#fff" : "#f8fafc";
  return (
    <div style={{ display: "grid", gridTemplateColumns: NPV_GRID_COLS,
      background: bg, borderBottom: isLast ? "none" : "1px solid #f1f5f9",
      alignItems: "center" }}>
      <div style={{ padding: "6px 10px", fontSize: 12.5, fontWeight: 600, color: "#475569", ...MONO }}>{row.year}</div>
      <div style={{ padding: "6px 10px" }}>
        <GivenSpan value={cf} negative={cf < 0} />
      </div>
      <div style={{ padding: "4px 6px" }}>
        <FactorInput sk={fcSk} ans={ans} setAns={setAns} correct={row.factorCorrect}
          revealed={revealed} width={88} />
      </div>
      <div style={{ padding: "4px 8px" }}>
        <NumInput sk={pvSk} ans={ans} setAns={setAns} correct={row.pvCorrect}
          tol={row.pvTol || 10} revealed={revealed} width={110} allowNeg={isPVNeg} />
      </div>
    </div>
  );
}

// NPV total row
function NPVTotalRow({ npvSk, ans, setAns, correct, tol, revealed }) {
  const isNeg = correct < 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: NPV_GRID_COLS,
      background: "#f1f5f9", borderTop: "2px solid #cbd5e1" }}>
      <div style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, color: "#334155",
        gridColumn: "1/4", display: "flex", alignItems: "center" }}>
        <span style={{ ...MONO }}>NPV</span>
      </div>
      <div style={{ padding: "5px 8px" }}>
        <NumInput sk={npvSk} ans={ans} setAns={setAns} correct={correct}
          tol={tol || 20} revealed={revealed} width={110} allowNeg={isNeg} />
      </div>
    </div>
  );
}

// ─── FORMAT BODIES (ALL MODULE SCOPE) ─────────────────────────────────────────

// PV Lookup Table (Q19, Q20)
function PVLookupTableBody({ q, ans, setAns, revealed }) {
  const isAnnuity = q.tableType === "annuity";
  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ marginBottom: 10, padding: "8px 12px", background: "#eff6ff",
        border: "1.5px solid #bfdbfe", borderRadius: 7, fontSize: 12.5, color: "#1e40af" }}>
        📖 Reference: {isAnnuity ? "Figure 8.10 — Present Value of $1 Annuity" : "Figure 8.9 — Present Value of $1"}
        {" "}(from textbook appendix). Look up the factor, then multiply to find the present value.
      </div>
      <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ ...SLATE, display: "grid", gridTemplateColumns: "1fr 100px 60px 60px 110px 130px" }}>
          {["Scenario", "Cash Flow", "Periods", "Rate", "PV Factor", "Present Value"].map((h, i) => (
            <div key={i} style={{ padding: "8px 10px", color: "#fff", fontWeight: 700,
              fontSize: 11, textAlign: i >= 3 ? "right" : "left" }}>{h}</div>
          ))}
        </div>
        {q.rows.map((row, i) => {
          const fSk = `${q.id}_f${i}`, pvSk = `${q.id}_pv${i}`;
          const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 60px 60px 110px 130px",
              background: bg, borderBottom: i < q.rows.length - 1 ? "1px solid #f1f5f9" : "none",
              alignItems: "center" }}>
              <div style={{ padding: "8px 10px", fontSize: 12.5, color: "#334151" }}>{row.desc}</div>
              <div style={{ padding: "8px 10px", ...MONO, fontSize: 12.5, color: "#64748b",
                textAlign: "right" }}>${row.cf.toLocaleString()}{isAnnuity ? "/yr" : ""}</div>
              <div style={{ padding: "8px 10px", ...MONO, fontSize: 12.5, color: "#64748b",
                textAlign: "right" }}>{row.n}</div>
              <div style={{ padding: "8px 10px", ...MONO, fontSize: 12.5, color: "#64748b",
                textAlign: "right" }}>{row.rate}</div>
              <div style={{ padding: "4px 6px", display: "flex", justifyContent: "flex-end" }}>
                <FactorInput sk={fSk} ans={ans} setAns={setAns}
                  correct={row.factorCorrect} revealed={revealed} width={90} />
              </div>
              <div style={{ padding: "4px 8px", display: "flex", justifyContent: "flex-end" }}>
                <NumInput sk={pvSk} ans={ans} setAns={setAns}
                  correct={row.pvCorrect} tol={row.pvTol || 5} revealed={revealed} width={118} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Single NPV Schedule (Q29b)
function NPVScheduleBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div>
      {part.note && (
        <div style={{ marginBottom: 10, padding: "7px 12px", background: "#fef3c7",
          border: "1.5px solid #fde68a", borderRadius: 6, fontSize: 12, color: "#92400e" }}>
          💡 {part.note}
        </div>
      )}
      <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
        {part.title && (
          <div style={{ ...INDIGO_G, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, color: "#fff" }}>
            {part.title}
          </div>
        )}
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: NPV_MIN_WIDTH }}>
            <NPVTableHeader />
            {part.rows.map((row, i) => (
              <NPVDataRow key={i} row={row} rowIdx={i} ans={ans} setAns={setAns}
                cfSk={`${prefix}cf${i}`} fcSk={`${prefix}fc${i}`} pvSk={`${prefix}pv${i}`}
                revealed={revealed} isLast={i === part.rows.length - 1} />
            ))}
            <NPVTotalRow npvSk={`${prefix}npv`} ans={ans} setAns={setAns}
              correct={part.npvCorrect} tol={part.npvTol} revealed={revealed} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Twin NPV Schedule (Q21b — Investment Y and Z side by side via stacking)
function TwinNPVBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {part.schedules.map((sched, si) => (
        <div key={si} style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ ...INDIGO_G, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, color: "#fff" }}>
            {sched.name} — NPV at {part.rate}%
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: NPV_MIN_WIDTH }}>
              <NPVTableHeader />
              {sched.rows.map((row, ri) => (
                <NPVDataRow key={ri} row={row} rowIdx={ri} ans={ans} setAns={setAns}
                  cfSk={`${prefix}s${si}_cf${ri}`} fcSk={`${prefix}s${si}_fc${ri}`} pvSk={`${prefix}s${si}_pv${ri}`}
                  revealed={revealed} isLast={ri === sched.rows.length - 1} />
              ))}
              <NPVTotalRow npvSk={`${prefix}s${si}_npv`} ans={ans} setAns={setAns}
                correct={sched.npvCorrect} tol={sched.npvTol} revealed={revealed} />
            </div>
          </div>
        </div>
      ))}

      {part.decisionMCQ && (
        <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "#f1f5f9",
            borderBottom: "1px solid #e2e8f0", fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
            Decision — Should the Company Invest?
          </div>
          <div style={{ padding: "12px" }}>
            <MCQBody part={part.decisionMCQ} ans={ans} setAns={setAns}
              revealed={revealed} stateKey={`${prefix}dmcq`} />
          </div>
        </div>
      )}
    </div>
  );
}

// IRR Bracket (Q30a — two trial tables + conclusion)
function IRRBracketBody({ part, ans, setAns, revealed, prefix }) {
  const { trials, baseCFs, conclusion } = part;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Reference note */}
      <div style={{ padding: "8px 12px", background: "#f0fdf4", border: "1.5px solid #bbf7d0",
        borderRadius: 7, fontSize: 12.5, color: "#14532d" }}>
        💡 Cash flows are the same as Q29. The PV factor and Present Value columns change with each trial rate.
        Year 0 CF = initial investment (−$50,000). Year 4 CF includes salvage value.
      </div>

      {trials.map((trial, ti) => {
        const tpfx = `${prefix}t${ti}_`;
        const isPositive = trial.npvCorrect >= 0;
        return (
          <div key={ti} style={{ border: `1.5px solid ${isPositive ? "#bbf7d0" : "#fecaca"}`,
            borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "9px 12px", fontWeight: 700, fontSize: 12.5, color: "#fff",
              background: isPositive ? "linear-gradient(135deg,#059669,#10b981)" : "linear-gradient(135deg,#dc2626,#ef4444)" }}>
              Trial Rate: {trial.rate}% — {isPositive ? "NPV is positive → IRR is higher than this rate" : "NPV is negative → IRR is lower than this rate"}
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: NPV_MIN_WIDTH }}>
                <NPVTableHeader col1Label="Year" />
                {trial.rows.map((row, ri) => (
                  <IRRDataRow key={ri} row={row} rowIdx={ri} cf={baseCFs[ri].cf}
                    fcSk={`${tpfx}fc${ri}`} pvSk={`${tpfx}pv${ri}`}
                    ans={ans} setAns={setAns} revealed={revealed}
                    isLast={ri === trial.rows.length - 1} />
                ))}
                <NPVTotalRow npvSk={`${tpfx}npv`} ans={ans} setAns={setAns}
                  correct={trial.npvCorrect} tol={trial.npvTol} revealed={revealed} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Conclusion */}
      <div style={{ border: "1.5px solid #e0e7ff", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ ...INDIGO_G, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, color: "#fff" }}>
          IRR Conclusion — Bracket the Rate
        </div>
        <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#334155", fontWeight: 600, minWidth: 150 }}>
              IRR falls between:
            </span>
            <IRRDropdown sk={`${prefix}bracket`} ans={ans} setAns={setAns}
              options={conclusion.bracketOpts} correct={conclusion.bracketCorrect} revealed={revealed} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#334155", fontWeight: 600, minWidth: 150 }}>
              Best IRR estimate:
            </span>
            <IRRDropdown sk={`${prefix}estimate`} ans={ans} setAns={setAns}
              options={conclusion.estimateOpts} correct={conclusion.estimateCorrect} revealed={revealed} />
          </div>
        </div>
      </div>
    </div>
  );
}

// IRRDropdown helper (module scope)
function IRRDropdown({ sk, ans, setAns, options, correct, revealed }) {
  const val = ans[sk] || "";
  const ok  = revealed && val === correct;
  const bad = revealed && val && val !== correct;
  const noA = revealed && !val;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select value={val} disabled={revealed}
        onChange={e => !revealed && setAns(p => ({ ...p, [sk]: e.target.value }))}
        style={{ padding: "7px 10px", borderRadius: 6, fontSize: 13, cursor: "pointer",
          minWidth: 200,
          border: `1.5px solid ${ok ? "#10b981" : bad || noA ? "#ef4444" : "#cbd5e1"}`,
          background: ok ? "#f0fdf4" : bad || noA ? "#fef2f2" : "#fff",
          color: val ? "#0f172a" : "#94a3b8", outline: "none" }}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {ok         && <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>}
      {(bad || noA) && <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 600 }}>→ {correct}</span>}
    </div>
  );
}

// Alternative NPV Table (Q32)
function AltNPVTableBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div>
      {part.note && (
        <div style={{ marginBottom: 10, padding: "7px 12px", background: "#fef3c7",
          border: "1.5px solid #fde68a", borderRadius: 6, fontSize: 12, color: "#92400e" }}>
          💡 {part.note}
        </div>
      )}
      <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden", overflowX: "auto" }}>
        {part.title && (
          <div style={{ ...INDIGO_G, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, color: "#fff" }}>
            {part.title}
          </div>
        )}
        <AltNPVTableHeader />
        {part.rows.map((row, i) => {
          const cfSk = `${prefix}cf${i}`, fcSk = `${prefix}fc${i}`, pvSk = `${prefix}pv${i}`;
          const isCFNeg = row.cfCorrect < 0;
          const isPVNeg = row.pvCorrect < 0;
          const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 130px 110px 130px",
              background: bg, borderBottom: i < part.rows.length - 1 ? "1px solid #f1f5f9" : "none",
              alignItems: "center", minWidth: 560 }}>
              <div style={{ padding: "8px 12px", fontSize: 12.5, color: "#334151", lineHeight: 1.4 }}>
                {row.desc}
              </div>
              <div style={{ padding: "4px 8px", display: "flex", justifyContent: "flex-end" }}>
                <NumInput sk={cfSk} ans={ans} setAns={setAns} correct={row.cfCorrect}
                  tol={row.cfTol || 1} revealed={revealed} width={118} allowNeg={isCFNeg} />
              </div>
              <div style={{ padding: "4px 6px", display: "flex", justifyContent: "flex-end" }}>
                <FactorInput sk={fcSk} ans={ans} setAns={setAns} correct={row.factorCorrect}
                  revealed={revealed} width={88} />
              </div>
              <div style={{ padding: "4px 8px", display: "flex", justifyContent: "flex-end" }}>
                <NumInput sk={pvSk} ans={ans} setAns={setAns} correct={row.pvCorrect}
                  tol={row.pvTol || 10} revealed={revealed} width={118} allowNeg={isPVNeg} />
              </div>
            </div>
          );
        })}
        {/* NPV total */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 110px 130px",
          background: "#f1f5f9", borderTop: "2px solid #cbd5e1", minWidth: 560 }}>
          <div style={{ padding: "9px 12px", fontSize: 13, fontWeight: 700, color: "#0f172a",
            gridColumn: "1/4", ...MONO }}>Net Present Value</div>
          <div style={{ padding: "5px 8px", display: "flex", justifyContent: "flex-end" }}>
            <NumInput sk={`${prefix}npv`} ans={ans} setAns={setAns}
              correct={part.npvCorrect} tol={part.npvTol || 100} revealed={revealed}
              width={118} allowNeg={part.npvCorrect < 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Payback Table (Q31)
function PaybackTableBody({ q, ans, setAns, revealed }) {
  const pp = ans[`${q.id}_pp`] || "";
  const ppRaw = parseFloat(pp);
  const ppOk  = revealed && !isNaN(ppRaw) && Math.abs(ppRaw - q.paybackCorrect) <= q.paybackTol;
  const ppBad = revealed && pp && !ppOk;
  const ppNoA = revealed && !pp;
  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ ...SLATE, display: "grid", gridTemplateColumns: "60px 1fr 1fr",
          borderBottom: "1px solid #334155" }}>
          {["Year", "Annual Cash Flow", "Cumulative Cash Inflow"].map((h, i) => (
            <div key={i} style={{ padding: "8px 12px", color: "#fff", fontWeight: 700, fontSize: 12,
              textAlign: i > 0 ? "right" : "left" }}>{h}</div>
          ))}
        </div>
        {q.rows.map((row, i) => {
          const cfSk = `${q.id}_cf${i}`, cumSk = `${q.id}_cum${i}`;
          const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr",
              background: bg, borderBottom: i < q.rows.length - 1 ? "1px solid #f1f5f9" : "none",
              alignItems: "center" }}>
              <div style={{ padding: "8px 12px", fontWeight: 600, ...MONO, fontSize: 13, color: "#475569" }}>
                {row.year}
              </div>
              <div style={{ padding: "4px 8px", display: "flex", justifyContent: "flex-end" }}>
                <NumInput sk={cfSk} ans={ans} setAns={setAns} correct={row.cfCorrect}
                  tol={1} revealed={revealed} width={130} />
              </div>
              <div style={{ padding: "4px 8px", display: "flex", justifyContent: "flex-end" }}>
                <NumInput sk={cumSk} ans={ans} setAns={setAns} correct={row.cumCorrect}
                  tol={1} revealed={revealed} width={130} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Payback period calculation */}
      <div style={{ padding: "14px 16px", background: "#f1f5f9", border: "1.5px solid #e2e8f0",
        borderRadius: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
          Calculate the Payback Period (in years):
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#334155" }}>Payback period =</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <input value={pp} disabled={revealed} placeholder="0.000"
              onChange={e => !revealed && setAns(p => ({
                ...p, [`${q.id}_pp`]: fmtFactor(e.target.value)
              }))}
              style={{ width: 100, padding: "6px 8px", textAlign: "right", outline: "none",
                ...MONO, fontSize: 13,
                border: `1.5px solid ${ppOk ? "#10b981" : ppBad || ppNoA ? "#ef4444" : "#cbd5e1"}`,
                borderRadius: 6,
                background: ppOk ? "#f0fdf4" : ppBad || ppNoA ? "#fef2f2" : "#fff",
                color: ppOk ? "#065f46" : ppBad || ppNoA ? "#7f1d1d" : "#0f172a" }} />
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>years</span>
            {ppOk         && <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>}
            {(ppBad||ppNoA)&& <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 600 }}>→ {q.paybackCorrect}</span>}
          </div>
        </div>
        {revealed && q.paybackNote && (
          <div style={{ marginTop: 10, padding: "7px 12px", background: "#ecfdf5",
            border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 12.5, color: "#14532d" }}>
            💡 {q.paybackNote}
          </div>
        )}
      </div>
    </div>
  );
}

// Calc Steps Body (Q29a)
function CalcStepRow({ step, si, prefix, ans, setAns, revealed, isLast }) {
  const sk = `${prefix}cs${si}`;
  const isTotal = !!step.isTotal;
  const isBold  = !!step.bold || isTotal;
  const bg = isTotal ? "#f1f5f9" : si % 2 === 0 ? "#fff" : "#f8fafc";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: `${isTotal ? 8 : 6}px 14px`, background: bg,
      borderBottom: isLast ? "none" : "1px solid #f1f5f9",
      borderTop: isTotal ? "1.5px solid #cbd5e1" : "none", transition: "background .15s" }}>
      <span style={{ fontSize: 13, color: isBold ? "#0f172a" : "#374151", fontWeight: isBold ? 700 : 400 }}>
        {step.label}
      </span>
      <NumInput sk={sk} ans={ans} setAns={setAns} correct={step.correct}
        tol={step.tol || 1} revealed={revealed} width={118} />
    </div>
  );
}

function CalcStepsBody({ steps, prefix, ans, setAns, revealed }) {
  return (
    <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
      {steps.map((step, si) => (
        <CalcStepRow key={si} step={step} si={si} prefix={prefix}
          ans={ans} setAns={setAns} revealed={revealed}
          isLast={si === steps.length - 1} />
      ))}
    </div>
  );
}

// Excel NPV+IRR display (Q33)
function ExcelNPVIRRBody({ part, ans, setAns, revealed, prefix }) {
  const npvSk = `${prefix}npv`, irrSk = `${prefix}irr`;
  const npvRaw = parseNum(ans[npvSk]);
  const irrRaw = parseFloat((ans[irrSk] || "").replace(/[^0-9.]/g, ""));
  const npvOk  = revealed && npvRaw !== null && Math.abs(npvRaw - part.npvCorrect) <= part.npvTol;
  const npvBad = revealed && ans[npvSk] && !npvOk;
  const npvNoA = revealed && !ans[npvSk];
  const irrOk  = revealed && !isNaN(irrRaw) && Math.abs(irrRaw - part.irrCorrect) <= part.irrTol;
  const irrBad = revealed && ans[irrSk] && !irrOk;
  const irrNoA = revealed && !ans[irrSk];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Excel output display */}
      <div style={{ border: "1.5px solid #c7d2fe", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "8px 14px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
          fontSize: 13, fontWeight: 700, color: "#fff" }}>📊 Excel Spreadsheet Output</div>
        <div style={{ padding: "14px", overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", ...MONO, fontSize: 12.5, width: "100%", maxWidth: 420 }}>
            <thead>
              <tr style={{ background: "#e0e7ff" }}>
                <th style={{ padding: "5px 14px", color: "#3730a3", fontWeight: 700, width: 60 }}></th>
                <th style={{ padding: "5px 14px", color: "#3730a3", fontWeight: 700, textAlign: "left" }}>Year</th>
                <th style={{ padding: "5px 14px", color: "#3730a3", fontWeight: 700, textAlign: "right" }}>Cash Flow</th>
              </tr>
            </thead>
            <tbody>
              {part.cashFlows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : "#f5f3ff" }}>
                  <td style={{ padding: "4px 14px", color: "#6366f1" }}>{i + 2}</td>
                  <td style={{ padding: "4px 14px", color: "#374151" }}>{row.year}</td>
                  <td style={{ padding: "4px 14px", textAlign: "right",
                    color: row.cf < 0 ? "#dc2626" : "#0f172a" }}>{fmtD(row.cf)}</td>
                </tr>
              ))}
              <tr style={{ background: "#eef2ff", borderTop: "2px solid #c7d2fe" }}>
                <td style={{ padding: "4px 14px", color: "#6366f1" }}>{part.cashFlows.length + 2}</td>
                <td style={{ padding: "4px 14px", color: "#374151", fontWeight: 700 }}>NPV formula:</td>
                <td style={{ padding: "4px 14px", color: "#4338ca", fontSize: 11.5 }}>
                  =NPV({part.rate}%, C3:C{part.cashFlows.length + 1})+C2
                </td>
              </tr>
              <tr style={{ background: "#eef2ff" }}>
                <td style={{ padding: "4px 14px", color: "#6366f1" }}>{part.cashFlows.length + 3}</td>
                <td style={{ padding: "4px 14px", color: "#374151", fontWeight: 700 }}>IRR formula:</td>
                <td style={{ padding: "4px 14px", color: "#4338ca", fontSize: 11.5 }}>
                  =IRR(C2:C{part.cashFlows.length + 1})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Answer inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* NPV */}
        <div style={{ padding: "14px", border: "1.5px solid #e2e8f0", borderRadius: 8,
          background: revealed ? (npvOk ? "#f0fdf4" : "#fef2f2") : "#fff" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
            NPV (from Excel):
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>$</span>
            <input value={ans[npvSk] || ""} disabled={revealed} placeholder="0"
              onChange={e => !revealed && setAns(p => ({ ...p, [npvSk]: fmtComma(e.target.value) }))}
              style={{ width: 130, padding: "7px 8px", textAlign: "right", outline: "none",
                ...MONO, fontSize: 13,
                border: `1.5px solid ${npvOk ? "#10b981" : npvBad || npvNoA ? "#ef4444" : "#cbd5e1"}`,
                borderRadius: 6,
                background: npvOk ? "#dcfce7" : npvBad || npvNoA ? "#fee2e2" : "#fff",
                color: npvOk ? "#065f46" : npvBad || npvNoA ? "#7f1d1d" : "#0f172a" }} />
            {npvOk         && <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>}
            {(npvBad||npvNoA) && <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 600 }}>→ {fmtD(part.npvCorrect)}</span>}
          </div>
          <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>
            Enter negative as e.g. -13710
          </div>
        </div>

        {/* IRR */}
        <div style={{ padding: "14px", border: "1.5px solid #e2e8f0", borderRadius: 8,
          background: revealed ? (irrOk ? "#f0fdf4" : "#fef2f2") : "#fff" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
            IRR (from Excel):
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input value={ans[irrSk] || ""} disabled={revealed} placeholder="0.00"
              onChange={e => !revealed && setAns(p => ({ ...p, [irrSk]: fmtPercent(e.target.value) }))}
              style={{ width: 100, padding: "7px 8px", textAlign: "right", outline: "none",
                ...MONO, fontSize: 13,
                border: `1.5px solid ${irrOk ? "#10b981" : irrBad || irrNoA ? "#ef4444" : "#cbd5e1"}`,
                borderRadius: 6,
                background: irrOk ? "#dcfce7" : irrBad || irrNoA ? "#fee2e2" : "#fff",
                color: irrOk ? "#065f46" : irrBad || irrNoA ? "#7f1d1d" : "#0f172a" }} />
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>%</span>
            {irrOk         && <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>}
            {(irrBad||irrNoA) && <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 600 }}>→ {part.irrCorrect}%</span>}
          </div>
          <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>
            Enter as percentage e.g. 9.18
          </div>
        </div>
      </div>
    </div>
  );
}

// MCQ Body
function MCQBody({ part, ans, setAns, revealed, stateKey }) {
  const k   = stateKey;
  const sel = ans[k] || "";
  return (
    <div>
      <div style={{ fontSize: 13.5, color: "#0f172a", lineHeight: 1.5, marginBottom: 12 }}>{part.prompt}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {part.choices.map(ch => {
          const isSel    = sel === ch.id;
          const isRight  = revealed && ch.id === part.answer;
          const isWrong  = revealed && isSel && !isRight;
          const bd = isRight ? "#10b981" : isWrong ? "#ef4444" : isSel ? "#2563eb" : "#e2e8f0";
          const bg = isRight ? "#f0fdf4"  : isWrong ? "#fef2f2"  : isSel ? "#eff6ff" : "#fff";
          const cl = isRight ? "#065f46"  : isWrong ? "#7f1d1d"  : "#0f172a";
          return (
            <button key={ch.id} disabled={revealed}
              onClick={() => !revealed && setAns(p => ({ ...p, [k]: ch.id }))}
              style={{ textAlign: "left", padding: "11px 14px", borderRadius: 10,
                border: `1.5px solid ${bd}`, background: bg, cursor: revealed ? "default" : "pointer",
                display: "flex", gap: 10, alignItems: "flex-start", transition: "all .15s" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                border: `2px solid ${isSel ? "#2563eb" : "#cbd5e1"}`,
                background: isSel ? "#2563eb" : "transparent" }} />
              <span style={{ fontSize: 13, lineHeight: 1.4, color: cl }}>
                <span style={{ fontWeight: 700, marginRight: 6 }}>{ch.id.toUpperCase()}.</span>{ch.text}
              </span>
              {isRight && <span style={{ marginLeft: "auto", color: "#10b981", fontWeight: 700, flexShrink: 0 }}>✓</span>}
              {isWrong && <span style={{ marginLeft: "auto", color: "#ef4444", fontWeight: 700, flexShrink: 0 }}>✗</span>}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 8,
          border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, lineHeight: 1.6 }}>
          <strong>Explanation: </strong>{part.explain}
        </div>
      )}
    </div>
  );
}

// Multi Part Wrapper
function MultiPartBody({ q, ans, setAns, revealed }) {
  return (
    <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      {q.parts.map((part, pi) => {
        const pfx = `${q.id}_p${pi}_`;
        return (
          <div key={pi} style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ ...SLATE, padding: "8px 12px" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>{part.partLabel}</span>
            </div>
            <div style={{ padding: "12px" }}>
              {part.type === "mcq"           && <MCQBody part={part} ans={ans} setAns={setAns} revealed={revealed} stateKey={`${pfx}mcq`} />}
              {part.type === "calc_steps"    && <CalcStepsBody steps={part.steps} prefix={pfx} ans={ans} setAns={setAns} revealed={revealed} />}
              {part.type === "twin_npv"      && <TwinNPVBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type === "npv_schedule"  && <NPVScheduleBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type === "irr_bracket"   && <IRRBracketBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type === "alt_npv_table" && <AltNPVTableBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type === "excel_npv_irr" && <ExcelNPVIRRBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Question Body Dispatcher
function QuestionBody({ q, ans, setAns, revealed }) {
  if (q.type === "pv_lookup_table") return <PVLookupTableBody q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type === "payback_table")   return <PaybackTableBody  q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type === "multi_part")      return <MultiPartBody     q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  return null;
}

// ─── CHROME ────────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const ref = useRef(null), af = useRef(null);
  useEffect(() => {
    if (!active) return;
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width = c.parentElement.offsetWidth;
    const H = c.height = c.parentElement.offsetHeight;
    const cols = ["#0ea5e9","#10b981","#f59e0b","#f43f5e","#a855f7","#22d3ee","#84cc16"];
    const ps = Array.from({ length: 200 }, () => ({
      x: Math.random()*W, y: -Math.random()*H*.5, w: Math.random()*10+4, h: Math.random()*6+2,
      vx: (Math.random()-.5)*7, vy: Math.random()*5+1, rot: Math.random()*360,
      rv: (Math.random()-.5)*12, col: cols[~~(Math.random()*cols.length)], life: 1,
      dec: .002+Math.random()*.003,
    }));
    const go = () => {
      ctx.clearRect(0,0,W,H); let alive = false;
      ps.forEach(p => {
        if (p.life <= 0) return; alive = true;
        p.x+=p.vx; p.y+=p.vy; p.vy+=.05; p.rot+=p.rv; p.life-=p.dec;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha = Math.max(0,p.life); ctx.fillStyle = p.col;
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
    <div style={{ display:"flex",alignItems:"center",gap:6,padding:"10px 14px",
      flexWrap:"wrap",background:"#f1f5f9",borderBottom:"1px solid #e2e8f0" }}>
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
  const p = total>0?Math.round(correct/total*100):0;
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
          <span style={{ fontSize:11.5,fontWeight:700,color:"#94a3b8",letterSpacing:.8,textTransform:"uppercase" }}>
            📋 {q.title}
          </span>
          <span style={{ fontSize:11,color:"#94a3b8",fontWeight:600,background:"#334155",
            borderRadius:20,padding:"2px 12px",border:"1px solid #475569" }}>
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
  const total   = Object.values(grades).reduce((s,g) => s+g.total, 0);
  const correct = Object.values(grades).reduce((s,g) => s+g.correct, 0);
  const p = pctCalc(correct, total);
  const c = p===100?"#10b981":p>=80?"#d97706":p>=60?TEAL:"#ef4444";
  const wrongCount = QUESTIONS.filter(q => grades[q.id] && grades[q.id].correct < grades[q.id].total).length;
  return (
    <div style={{ position:"relative",overflow:"hidden" }}>
      <Confetti active={p===100} />
      <div style={{ textAlign:"center",padding:"48px 24px 32px" }}>
        <div style={{ fontSize:50,marginBottom:8 }}>{p===100?"🎉":p>=80?"🔥":p>=60?"👍":"💪"}</div>
        <div style={{ fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1.5,
          textTransform:"uppercase",marginBottom:12 }}>Chapter 8 · Final Score</div>
        <div style={{ display:"inline-flex",flexDirection:"column",alignItems:"center",
          padding:"20px 52px",borderRadius:12,background:"#f8fafc",border:`2px solid ${c}22`,marginBottom:20 }}>
          <div style={{ fontSize:54,fontWeight:800,color:c,lineHeight:1 }}>
            {correct}<span style={{ fontSize:26,color:"#94a3b8" }}>/{total}</span>
          </div>
          <div style={{ fontSize:14,color:c,marginTop:4,fontWeight:700 }}>{p}%</div>
        </div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:24 }}>
          {QUESTIONS.map(q => {
            const g = grades[q.id]; if (!g) return null;
            const qp = pctCalc(g.correct,g.total), qc = qp===100?"#10b981":qp>=70?"#d97706":"#ef4444";
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

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Ch08Quiz({ onComplete } = {}) {
  const [savedDraft] = useState(() => {
    const draft = loadQuizDraft("ch08");
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) return null;
    const grades = draft.graded;
    const isComplete = grades && typeof grades === "object" && QUESTIONS.every(q => grades[q.id]);
    if (isComplete) {
      clearQuizDraft("ch08");
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
  const needsSticky = !!q.sticky;

  useEffect(() => { setStickyOpen(true); }, [cur]);

  const gradeThis = () => setGraded(p => ({ ...p, [q.id]: scoreQuestion(q, ans) }));
  const clearThis = () => {
    setGraded(p => { const n = {...p}; delete n[q.id]; return n; });
    setAns(p => { const n = {...p}; Object.keys(n).filter(k => k.startsWith(q.id+"_")).forEach(k => delete n[k]); return {...n}; });
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
      chapterId: "ch08",
      chapterLabel: "Chapter 8",
      ...totals,
      percent: pctCalc(totals.correct, totals.total),
      completedAt: new Date().toISOString(),
    });
  }, [screen, graded, onComplete]);

  useEffect(() => {
    if (screen === "results") clearQuizDraft("ch08");
  }, [screen]);

  useEffect(() => {
    if (screen === "results") return;
    saveQuizDraft("ch08", { cur, ans, graded, screen, revIdx, stickyOpen });
  }, [cur, ans, graded, screen, revIdx, stickyOpen]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    select { -webkit-appearance:auto; appearance:auto; }
    input:focus, select:focus { box-shadow:0 0 0 3px rgba(13,148,136,.18)!important; outline:none!important; }
    button:hover:not(:disabled) { filter:brightness(.9); }
    ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
  `;
  const wrap = { minHeight:"100vh",background:"#e9eef5",color:"#0f172a",fontFamily:"'DM Sans',system-ui,sans-serif" };
  const inner = { maxWidth:960,margin:"0 auto",padding:"24px 16px" };
  const card  = { background:"#f1f5f9",borderRadius:12,border:"1.5px solid #e2e8f0",overflow:"hidden",boxShadow:"0 2px 16px rgba(0,0,0,.07)" };

  const g = graded[q.id];
  const scoreBadge = isRevealed && g ? (() => {
    const p = pctCalc(g.correct,g.total), c = p===100?"#10b981":p>=70?"#d97706":"#ef4444";
    return <span style={{ fontSize:13,fontWeight:700,color:c,background:c+"18",
      padding:"4px 12px",borderRadius:20,border:`1px solid ${c}33` }}>{g.correct}/{g.total} · {p}%</span>;
  })() : null;

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

  if (screen==="results") {
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={card}><ResultsScreen grades={graded} onRetry={resetAll}
          onReview={() => { setRevIdx(0); setScreen("review"); }} /></div>
      </div></div>
    );
  }

  return (
    <div style={wrap}><style>{CSS}</style><div style={inner}>
      <div style={{ marginBottom:14 }}>
        <h1 style={{ fontWeight:800,fontSize:22,margin:0 }}>Chapter 8 — How Is Capital Budgeting Used?</h1>
        <p style={{ fontSize:12,color:"#64748b",margin:"3px 0 0" }}>
          Q19 · Q20 · Q21 · Q29 · Q30 · Q31 · Q32 · Q33 — PV Tables, NPV Analysis, IRR, Payback Period
        </p>
      </div>

      {needsSticky && <StickyBar q={q} open={stickyOpen} setOpen={setStickyOpen} />}

      <div style={card}>
        <NavRow questions={QUESTIONS} cur={cur} setCur={setCur} grades={graded} />
        {Object.keys(graded).length>0 && <div style={{paddingTop:8}}><ProgressBar questions={QUESTIONS} grades={graded} /></div>}
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
