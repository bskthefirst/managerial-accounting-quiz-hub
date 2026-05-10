import { useState, useRef, useEffect } from "react";
import { loadQuizDraft, saveQuizDraft } from "./quiz-progress.js";

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
const MONO  = { fontFamily: "'JetBrains Mono','Courier New',monospace" };
const SLATE = { background: "linear-gradient(135deg,#334155,#475569)" };
const TEAL  = "#0d9488";

// ─── QUESTIONS ────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: "q17", nav: "Q17",
    title: "Q17 · Job Costing vs. Process Costing",
    desc: "Indicate whether each firm would use Job Order Costing or Process Costing to accumulate production costs.",
    type: "single_classifier",
    options: ["Job Order Costing","Process Costing"],
    items: [
      { label: "Custom home builder",           correct: "Job Order Costing" },
      { label: "Dairy farm",                    correct: "Process Costing"   },
      { label: "Surgical unit of a hospital",   correct: "Job Order Costing" },
      { label: "Candy bar producer",            correct: "Process Costing"   },
      { label: "Auto body repair shop",         correct: "Job Order Costing" },
      { label: "Producer of basketballs",       correct: "Process Costing"   },
      { label: "Producer of T-shirts",          correct: "Process Costing"   },
      { label: "Plumber",                       correct: "Job Order Costing" },
    ],
  },

  {
    id: "q19", nav: "Q19",
    title: "Q19 · Predetermined Overhead Rate",
    desc: "A company expects manufacturing overhead costs of $1,000,000 for the coming year and estimates 20,000 direct labor hours will be used.\n\nPart (a): Calculate the predetermined overhead rate.\nPart (b): Select the best description of how this rate is used in a job costing system.",
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Calculate the Predetermined Overhead Rate",
        type: "single_calc",
        rows: [
          { label: "Estimated manufacturing overhead",           value: { given: 1000000 } },
          { label: "Estimated direct labor hours",               value: { given: 20000   } },
          { label: "Predetermined overhead rate ($ per DL hr)",  value: { answer: 50 }, tol: 0.01 },
        ],
      },
      {
        partLabel: "(b) How is the Predetermined Overhead Rate Used?",
        type: "mcq",
        stem: "Select the statement that best describes how the predetermined overhead rate is used in a job costing system.",
        options: [
          "To calculate the total actual overhead costs incurred during the accounting period",
          "To apply overhead costs to individual jobs based on their direct labor hours used",
          "To set the selling price for each job produced during the period",
          "To allocate direct labor costs across multiple product lines or departments",
        ],
        correct: 1,
        explanation: "The predetermined overhead rate is multiplied by actual DL hours on each job to apply (assign) overhead. E.g., a job that uses 5 DL hours gets $50 × 5 = $250 of overhead applied.",
      },
    ],
  },

  {
    id: "q22", nav: "Q22",
    title: "Q22 · Raw Materials Journal Entries — Sedona Company",
    desc: "Sedona Company: RM inventory beginning = $110,000 | RM purchased = $50,000 (on account) | Direct materials used = $17,000 | Indirect materials used = $8,000.\n\nPrepare three separate journal entries: (1) purchase on account, (2) direct materials to production, (3) indirect materials to production.",
    type: "journal_entry",
    accountPool: [
      "Raw Materials Inventory",
      "Work-in-Process Inventory",
      "Manufacturing Overhead",
      "Accounts Payable",
      "Finished Goods Inventory",
      "Cost of Goods Sold",
      "Salaries Payable",
    ],
    entries: [
      {
        label: "Entry 1 — Raw materials purchased on account",
        rows: [
          { side:"Dr", account:"Raw Materials Inventory", amount:50000 },
          { side:"Cr", account:"Accounts Payable",        amount:50000 },
        ],
      },
      {
        label: "Entry 2 — Direct materials transferred to production",
        rows: [
          { side:"Dr", account:"Work-in-Process Inventory", amount:17000 },
          { side:"Cr", account:"Raw Materials Inventory",   amount:17000 },
        ],
      },
      {
        label: "Entry 3 — Indirect materials transferred to production",
        rows: [
          { side:"Dr", account:"Manufacturing Overhead",  amount:8000 },
          { side:"Cr", account:"Raw Materials Inventory", amount:8000 },
        ],
      },
    ],
  },

  {
    id: "q23", nav: "Q23",
    title: "Q23 · WIP Inventory Journal Entries — Reid Company",
    desc: "Reid Company, March: Direct materials = $40,000 | Direct labor = $70,000 | Manufacturing overhead applied = $200,000 | Cost of goods manufactured = $290,000.\n\nPrepare four separate journal entries: (1) direct materials to production, (2) direct labor (paid next month), (3) overhead applied, (4) transfer to finished goods.",
    type: "journal_entry",
    accountPool: [
      "Work-in-Process Inventory",
      "Raw Materials Inventory",
      "Manufacturing Overhead",
      "Salaries Payable",
      "Finished Goods Inventory",
      "Cost of Goods Sold",
      "Accounts Payable",
    ],
    entries: [
      {
        label: "Entry 1 — Direct materials placed in production",
        rows: [
          { side:"Dr", account:"Work-in-Process Inventory", amount:40000 },
          { side:"Cr", account:"Raw Materials Inventory",   amount:40000 },
        ],
      },
      {
        label: "Entry 2 — Direct labor incurred (to be paid next month)",
        rows: [
          { side:"Dr", account:"Work-in-Process Inventory", amount:70000 },
          { side:"Cr", account:"Salaries Payable",          amount:70000 },
        ],
      },
      {
        label: "Entry 3 — Manufacturing overhead applied to jobs",
        rows: [
          { side:"Dr", account:"Work-in-Process Inventory", amount:200000 },
          { side:"Cr", account:"Manufacturing Overhead",    amount:200000 },
        ],
      },
      {
        label: "Entry 4 — Transfer completed goods to finished goods inventory",
        rows: [
          { side:"Dr", account:"Finished Goods Inventory",  amount:290000 },
          { side:"Cr", account:"Work-in-Process Inventory", amount:290000 },
        ],
      },
    ],
  },

  {
    id: "q24", nav: "Q24",
    title: "Q24 · Cost of Goods Sold Journal Entries — Blue Oak Company",
    desc: "Blue Oak Company: FG inventory beginning = $25,000 | Cost of goods manufactured = $17,000 | Cost of goods sold = $14,000.\n\nPrepare two separate journal entries: (1) cost of goods manufactured transferred to FG, (2) cost of goods sold.",
    type: "journal_entry",
    accountPool: [
      "Finished Goods Inventory",
      "Work-in-Process Inventory",
      "Cost of Goods Sold",
      "Manufacturing Overhead",
      "Raw Materials Inventory",
      "Accounts Receivable",
      "Sales Revenue",
    ],
    entries: [
      {
        label: "Entry 1 — Cost of goods manufactured transferred to finished goods",
        rows: [
          { side:"Dr", account:"Finished Goods Inventory",  amount:17000 },
          { side:"Cr", account:"Work-in-Process Inventory", amount:17000 },
        ],
      },
      {
        label: "Entry 2 — Cost of goods sold to customers",
        rows: [
          { side:"Dr", account:"Cost of Goods Sold",       amount:14000 },
          { side:"Cr", account:"Finished Goods Inventory", amount:14000 },
        ],
      },
    ],
  },

  {
    id: "q32", nav: "Q32",
    title: "Q32 · Actual & Applied Overhead — Marine Products, Inc.",
    desc: "Marine Products actual overhead for June: Indirect materials $20,000 | Indirect labor $18,000 | Rent (prepaid) $3,000 | Equipment depreciation $6,500.\nPredetermined overhead rate: $12 per machine hour. Machine hours used in June: 5,100.\n\nComplete all four required parts.",
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Journal entry — Record actual overhead costs for June",
        type: "journal_entry",
        accountPool: [
          "Manufacturing Overhead",
          "Indirect Materials",
          "Indirect Labor",
          "Prepaid Rent",
          "Accumulated Depreciation",
          "Work-in-Process Inventory",
          "Accounts Payable",
          "Salaries Payable",
          "Raw Materials Inventory",
        ],
        entries: [{
          label: "Record actual overhead costs incurred in June",
          rows: [
            { side:"Dr", account:"Manufacturing Overhead",    amount:47500 },
            { side:"Cr", account:"Indirect Materials",        amount:20000 },
            { side:"Cr", account:"Indirect Labor",            amount:18000 },
            { side:"Cr", account:"Prepaid Rent",              amount:3000  },
            { side:"Cr", account:"Accumulated Depreciation",  amount:6500  },
          ],
        }],
      },
      {
        partLabel: "(b) Journal entry — Record overhead applied to jobs in June",
        type: "journal_entry_calc",
        calcLabel: "Calculate applied overhead: $12/MH × 5,100 MH =",
        calcCorrect: 61200,
        calcTol: 1,
        accountPool: [
          "Work-in-Process Inventory",
          "Manufacturing Overhead",
          "Raw Materials Inventory",
          "Finished Goods Inventory",
          "Cost of Goods Sold",
        ],
        entries: [{
          label: "Record manufacturing overhead applied to jobs",
          rows: [
            { side:"Dr", account:"Work-in-Process Inventory", amount:61200 },
            { side:"Cr", account:"Manufacturing Overhead",    amount:61200 },
          ],
        }],
      },
      {
        partLabel: "(c) T-Account — Manufacturing Overhead",
        type: "t_account",
        title: "Manufacturing Overhead",
        note: "The T-account summarizes your entries from parts (a) and (b). Post those amounts, then compute the ending balance.",
        debits:  [{ label: "Actual overhead costs (Part a)", amount: { given: 47500 } }],
        credits: [{ label: "Applied overhead costs (Part b)", amount: { given: 61200 } }],
        balance: { answer: 13700, side: "Credit" },
      },
      {
        partLabel: "(d) Close Manufacturing Overhead to Cost of Goods Sold",
        type: "over_under",
        prompt: "Is manufacturing overhead overapplied or underapplied for June?",
        correct: "Overapplied",
        explanation: "Applied overhead ($61,200) > Actual overhead ($47,500) → The MOH account has a Credit balance of $13,700 → Overapplied. To close: debit MOH (remove the credit balance) and credit COGS.",
        closingLabel: "Journal entry to close manufacturing overhead to COGS:",
        closingAccountPool: [
          "Manufacturing Overhead",
          "Cost of Goods Sold",
          "Work-in-Process Inventory",
          "Raw Materials Inventory",
          "Finished Goods Inventory",
        ],
        closingRows: [
          { side:"Dr", account:"Manufacturing Overhead", amount:13700 },
          { side:"Cr", account:"Cost of Goods Sold",     amount:13700 },
        ],
      },
    ],
  },
];

// ─── SCORING + allFilled ──────────────────────────────────────────────────────
function scoreJournalEntry(part, ans, prefix="") {
  let total = 0, correct = 0;
  (part.entries||[]).forEach((entry, ei) => {
    entry.rows.forEach((row, ri) => {
      const acctKey = `${prefix}e${ei}_r${ri}_acct`;
      const amtKey  = `${prefix}e${ei}_r${ri}_amt`;
      total += 2;
      if (ans[acctKey] === row.account) correct++;
      const rawAmt = parseInput(ans[amtKey]||"");
      if (rawAmt !== null && Math.abs(rawAmt - row.amount) < 1) correct++;
    });
  });
  return { total, correct };
}

function allFilledJournalEntry(part, ans, prefix="") {
  return (part.entries||[]).every((entry, ei) =>
    entry.rows.every((_, ri) => ans[`${prefix}e${ei}_r${ri}_acct`] && ans[`${prefix}e${ei}_r${ri}_amt`])
  );
}

function scoreQuestion(q, ans) {
  let total = 0, correct = 0;
  const add = (res) => { total += res.total; correct += res.correct; };
  const mark = (key, expected, tol=0) => {
    total++;
    if (tol===0) { if (ans[key]===expected) correct++; }
    else { const r=parseInput(ans[key]||""); if (r!==null && Math.abs(r-expected)<tol) correct++; }
  };

  if (q.type === "single_classifier") {
    q.items.forEach((it,i) => mark(`c${i}`, it.correct));
  }
  if (q.type === "journal_entry") {
    add(scoreJournalEntry(q, ans, ""));
  }
  if (q.type === "multi_part") {
    q.parts.forEach((part, pi) => {
      const pfx = `p${pi}_`;
      if (part.type === "single_calc") {
        part.rows.forEach((row, ri) => {
          if (row.value?.answer !== undefined)
            mark(`${pfx}r${ri}`, row.value.answer, row.tol || 1);
        });
      }
      if (part.type === "mcq") {
        mark(`${pfx}mcq`, String(part.correct));
      }
      if (part.type === "journal_entry" || part.type === "journal_entry_calc") {
        if (part.type === "journal_entry_calc") mark(`${pfx}calc`, part.calcCorrect, part.calcTol||1);
        add(scoreJournalEntry(part, ans, pfx));
      }
      if (part.type === "t_account") {
        mark(`${pfx}bal_amt`, part.balance.answer, 1);
        mark(`${pfx}bal_side`, part.balance.side);
      }
      if (part.type === "over_under") {
        mark(`${pfx}decision`, part.correct);
        part.closingRows.forEach((row, ri) => {
          total += 2;
          const acctKey = `${pfx}cl_e0_r${ri}_acct`;
          const amtKey = `${pfx}cl_e0_r${ri}_amt`;
          if (ans[acctKey] === row.account) correct++;
          const raw = parseInput(ans[amtKey]||"");
          if (raw !== null && Math.abs(raw - row.amount) < 1) correct++;
        });
      }
    });
  }
  return { total, correct };
}

function allFilled(q, ans) {
  if (q.type === "single_classifier")
    return q.items.every((_,i) => !!ans[`c${i}`]);
  if (q.type === "journal_entry")
    return allFilledJournalEntry(q, ans, "");
  if (q.type === "multi_part") {
    return q.parts.every((part, pi) => {
      const pfx = `p${pi}_`;
      if (part.type === "single_calc")
        return part.rows.every((row, ri) => row.value?.answer === undefined || !!ans[`${pfx}r${ri}`]);
      if (part.type === "mcq")
        return !!ans[`${pfx}mcq`];
      if (part.type === "journal_entry" || part.type === "journal_entry_calc") {
        const calcOk = part.type !== "journal_entry_calc" || !!ans[`${pfx}calc`];
        return calcOk && allFilledJournalEntry(part, ans, pfx);
      }
      if (part.type === "t_account")
        return !!ans[`${pfx}bal_amt`] && !!ans[`${pfx}bal_side`];
      if (part.type === "over_under")
        return !!ans[`${pfx}decision`] &&
          part.closingRows.every((_,ri) => ans[`${pfx}cl_e0_r${ri}_acct`] && ans[`${pfx}cl_e0_r${ri}_amt`]);
      return true;
    });
  }
  return true;
}

// ─── SHARED ATOMS ─────────────────────────────────────────────────────────────
function NumInput({ stateKey, ans, setAns, correct, tol=1, checked, width=120 }) {
  const raw = parseInput(ans[stateKey]||"");
  const ok  = checked && raw !== null && Math.abs(raw - correct) < tol;
  const bad = checked && ans[stateKey] && (raw===null||Math.abs(raw-correct)>=tol);
  const noA = checked && !ans[stateKey];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <input
        value={ans[stateKey]||""} disabled={checked} placeholder="0"
        onChange={e => !checked && setAns(p=>({...p,[stateKey]:fmtNum(e.target.value)}))}
        style={{
          width, padding:"6px 8px", textAlign:"right", outline:"none",
          ...MONO, fontSize:13,
          border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
          borderRadius:6,
          background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
          color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a",
          transition:"all .15s",
        }}
      />
      {ok        && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
      {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600 }}>→ {fmtDisplay(correct)}</span>}
    </div>
  );
}

// ─── SINGLE CLASSIFIER ────────────────────────────────────────────────────────
function SingleClassifierBody({ q, ans, setAns, checked }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", margin:"0 16px 16px" }}>
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:"1fr 220px" }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:12 }}>Company / Industry</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:12 }}>Costing System</div>
      </div>
      {q.items.map((item, i) => {
        const k = `c${i}`;
        const ok  = checked && ans[k]===item.correct;
        const bad = checked && ans[k] && ans[k]!==item.correct;
        const noA = checked && !ans[k];
        return (
          <div key={i} style={{
            display:"grid", gridTemplateColumns:"1fr 220px", alignItems:"center",
            background:checked?(ok?"#f0fdf4":bad||noA?"#fef2f2":i%2===0?"#fff":"#f8fafc"):i%2===0?"#fff":"#f8fafc",
            borderBottom:i<q.items.length-1?"1px solid #f0f4f8":"none", transition:"background .2s",
          }}>
            <div style={{ padding:"9px 12px", fontSize:13, color:"#374151" }}>{item.label}</div>
            <div style={{ padding:"6px 8px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <select value={ans[k]||""} disabled={checked}
                  onChange={e => !checked && setAns(p=>({...p,[k]:e.target.value}))}
                  style={{
                    flex:1, padding:"5px 6px", borderRadius:6, fontSize:12, cursor:"pointer",
                    border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                    background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
                    color:ans[k]?"#0f172a":"#94a3b8", outline:"none",
                  }}>
                  <option value="">—</option>
                  {q.options.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
                {ok && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
              </div>
              {(bad||noA) && <div style={{ fontSize:10.5, color:"#ef4444", fontWeight:600, mt:2 }}>→ {item.correct}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SINGLE CALC ─────────────────────────────────────────────────────────────
function SingleCalcBody({ part, ans, setAns, checked, prefix="" }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      {part.rows.map((row, i) => {
        const k = `${prefix}r${i}`;
        const isTotal = !!row.total || !!row.bold;
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
        const raw = parseInput(ans[k]||"");
        const tol = row.tol || 1;
        const ok  = checked && raw !== null && Math.abs(raw - row.value.answer) < tol;
        const bad = checked && ans[k] && (raw===null || Math.abs(raw - row.value.answer) >= tol);
        const noA = checked && !ans[k];
        return (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:`${isTotal?7:5}px 14px`,
            background:checked?(ok?"#f0fdf4":bad||noA?"#fef2f2":bg):bg,
            borderBottom:"1px solid #f0f4f8",
            borderTop:isTotal?"1.5px solid #cbd5e1":"none",
            transition:"background .2s" }}>
            <span style={{ fontSize:13, color:isTotal?"#0f172a":"#374151", fontWeight:isTotal?700:400 }}>{row.label}</span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input value={ans[k]||""} disabled={checked} placeholder="0"
                onChange={e => !checked && setAns(p=>({...p,[k]:fmtNum(e.target.value)}))}
                style={{
                  width:130, padding:"5px 8px", textAlign:"right", outline:"none",
                  ...MONO, fontSize:13, fontWeight:isTotal?700:400,
                  border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
                  borderRadius:6,
                  background:ok?"#dcfce7":bad||noA?"#fee2e2":"#fff",
                  color:ok?"#065f46":bad||noA?"#7f1d1d":"#0f172a",
                  transition:"all .15s",
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

// ─── MCQ ─────────────────────────────────────────────────────────────────────
function MCQBody({ part, ans, setAns, checked, prefix="" }) {
  const k   = `${prefix}mcq`;
  const val = ans[k] || "";
  return (
    <div>
      <div style={{ fontSize:13, color:"#374151", marginBottom:10, lineHeight:1.6 }}>{part.stem}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {part.options.map((opt, i) => {
          const isSelected = val === String(i);
          const isCorrect  = i === part.correct;
          const ok  = checked && isSelected && isCorrect;
          const bad = checked && isSelected && !isCorrect;
          const reveal = checked && isCorrect && !isSelected;
          let bg = "#fff", border = "#e2e8f0", color = "#374151";
          if (!checked && isSelected) { bg="#ecfeff"; border=TEAL; color="#0f766e"; }
          if (ok)     { bg="#f0fdf4"; border="#10b981"; color="#065f46"; }
          if (bad)    { bg="#fef2f2"; border="#ef4444"; color="#7f1d1d"; }
          if (reveal) { bg="#fffbeb"; border="#d97706"; color="#92400e"; }
          return (
            <button key={i} disabled={checked}
              onClick={() => !checked && setAns(p=>({...p,[k]:String(i)}))}
              style={{
                display:"flex", alignItems:"flex-start", gap:10, padding:"10px 14px",
                background:bg, border:`1.5px solid ${border}`, borderRadius:8,
                color, cursor:checked?"default":"pointer", textAlign:"left",
                fontSize:13, lineHeight:1.5, transition:"all .15s",
              }}>
              <span style={{
                minWidth:22, height:22, borderRadius:11, border:`2px solid ${border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:700, flexShrink:0, color,
                background: (isSelected || ok || bad || reveal) ? border : "transparent",
                color: (isSelected || ok || bad || reveal) ? "#fff" : color,
              }}>{String.fromCharCode(65+i)}</span>
              <span>{opt}</span>
              {ok     && <span style={{ marginLeft:"auto", color:"#10b981", fontWeight:700 }}>✓</span>}
              {bad    && <span style={{ marginLeft:"auto", color:"#ef4444", fontWeight:700 }}>✗</span>}
              {reveal && <span style={{ marginLeft:"auto", color:"#d97706", fontWeight:700, fontSize:11 }}>← Correct</span>}
            </button>
          );
        })}
      </div>
      {checked && (
        <div style={{ marginTop:10, padding:"10px 12px",
          background: val===String(part.correct)?"#ecfdf5":"#fffbeb",
          border:`1px solid ${val===String(part.correct)?"#bbf7d0":"#fde68a"}`,
          borderRadius:7, fontSize:12.5, color:"#374151", lineHeight:1.6 }}>
          <strong>Explanation:</strong> {part.explanation}
        </div>
      )}
    </div>
  );
}

// ─── JOURNAL ENTRY ────────────────────────────────────────────────────────────
function JournalEntryRows({ entry, ei, ans, setAns, checked, prefix="", accountPool }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", marginBottom:10 }}>
      <div style={{ padding:"7px 12px", background:"#f8fafc",
        borderBottom:"1px solid #e2e8f0", fontSize:12, fontWeight:700, color:"#475569" }}>
        {entry.label}
      </div>
      {/* Column headers */}
      <div style={{ display:"grid", gridTemplateColumns:"44px 1fr 140px",
        background:"#f1f5f9", borderBottom:"1px solid #e2e8f0" }}>
        <div style={{ padding:"6px 10px", fontSize:11, fontWeight:700, color:"#64748b" }}>Side</div>
        <div style={{ padding:"6px 10px", fontSize:11, fontWeight:700, color:"#64748b" }}>Account</div>
        <div style={{ padding:"6px 10px", fontSize:11, fontWeight:700, color:"#64748b", textAlign:"right" }}>Amount</div>
      </div>
      {entry.rows.map((row, ri) => {
        const acctKey = `${prefix}e${ei}_r${ri}_acct`;
        const amtKey  = `${prefix}e${ei}_r${ri}_amt`;
        const acctVal = ans[acctKey]||"";
        const amtRaw  = parseInput(ans[amtKey]||"");
        const okAcct  = checked && acctVal === row.account;
        const badAcct = checked && acctVal && acctVal !== row.account;
        const noAcct  = checked && !acctVal;
        const okAmt   = checked && amtRaw !== null && Math.abs(amtRaw - row.amount) < 1;
        const badAmt  = checked && ans[amtKey] && (amtRaw===null || Math.abs(amtRaw - row.amount) >= 1);
        const noAmt   = checked && !ans[amtKey];
        const isCr    = row.side === "Cr";
        return (
          <div key={ri} style={{
            display:"grid", gridTemplateColumns:"44px 1fr 140px", alignItems:"center",
            background:ri%2===0?"#fff":"#f9fafb",
            borderBottom:ri<entry.rows.length-1?"1px solid #f0f4f8":"none",
          }}>
            {/* Dr/Cr badge */}
            <div style={{ padding:"6px 10px" }}>
              <span style={{
                display:"inline-block", padding:"2px 7px", borderRadius:5, fontSize:11.5, fontWeight:700,
                background: isCr?"#e0f2fe":"#dcfce7",
                color: isCr?"#0284c7":"#16a34a",
                marginLeft: isCr ? 10 : 0,
              }}>{row.side}</span>
            </div>
            {/* Account dropdown */}
            <div style={{ padding:"4px 8px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <select value={acctVal} disabled={checked}
                  onChange={e => !checked && setAns(p=>({...p,[acctKey]:e.target.value}))}
                  style={{
                    flex:1, padding:"5px 8px", borderRadius:6, fontSize:12, cursor:"pointer",
                    border:`1.5px solid ${okAcct?"#10b981":badAcct||noAcct?"#ef4444":"#cbd5e1"}`,
                    background:okAcct?"#f0fdf4":badAcct||noAcct?"#fef2f2":"#fff",
                    color:acctVal?"#0f172a":"#94a3b8", outline:"none",
                  }}>
                  <option value="">— Account —</option>
                  {accountPool.map(a=><option key={a} value={a}>{a}</option>)}
                </select>
                {okAcct        && <span style={{ color:"#10b981", fontWeight:700, fontSize:13 }}>✓</span>}
                {(badAcct||noAcct) && <span style={{ color:"#ef4444", fontSize:10.5, fontWeight:600, whiteSpace:"nowrap" }}>→ {row.account}</span>}
              </div>
            </div>
            {/* Amount */}
            <div style={{ padding:"4px 8px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, justifyContent:"flex-end" }}>
                {okAmt        && <span style={{ color:"#10b981", fontWeight:700 }}>✓</span>}
                {(badAmt||noAmt) && <span style={{ color:"#ef4444", fontSize:10.5, fontWeight:600 }}>→{fmtDisplay(row.amount)}</span>}
                <input value={ans[amtKey]||""} disabled={checked} placeholder="0"
                  onChange={e => !checked && setAns(p=>({...p,[amtKey]:fmtNum(e.target.value)}))}
                  style={{
                    width:110, padding:"5px 8px", textAlign:"right", outline:"none",
                    ...MONO, fontSize:12.5,
                    border:`1.5px solid ${okAmt?"#10b981":badAmt||noAmt?"#ef4444":"#cbd5e1"}`,
                    borderRadius:6,
                    background:okAmt?"#dcfce7":badAmt||noAmt?"#fee2e2":"#fff",
                    color:okAmt?"#065f46":badAmt||noAmt?"#7f1d1d":"#0f172a",
                    transition:"all .15s",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JournalEntryBody({ q, ans, setAns, checked, prefix="" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
      {(q.entries||[]).map((entry, ei) => (
        <JournalEntryRows key={ei} entry={entry} ei={ei}
          ans={ans} setAns={setAns} checked={checked}
          prefix={prefix} accountPool={q.accountPool||[]} />
      ))}
    </div>
  );
}

// ─── T-ACCOUNT ────────────────────────────────────────────────────────────────
function TAccountBody({ part, ans, setAns, checked, prefix="" }) {
  const kAmt  = `${prefix}bal_amt`;
  const kSide = `${prefix}bal_side`;
  const rawAmt  = parseInput(ans[kAmt]||"");
  const rawSide = ans[kSide]||"";
  const okAmt   = checked && rawAmt !== null && Math.abs(rawAmt - part.balance.answer) < 1;
  const okSide  = checked && rawSide === part.balance.side;
  const badAmt  = checked && ans[kAmt] && !okAmt;
  const badSide = checked && ans[kSide] && !okSide;
  const noAmt   = checked && !ans[kAmt];
  const noSide  = checked && !ans[kSide];

  const drTotal = part.debits.reduce((s,r) => s + (r.amount.given||0), 0);
  const crTotal = part.credits.reduce((s,r) => s + (r.amount.given||0), 0);
  const maxRows = Math.max(part.debits.length, part.credits.length) + 1; // +1 for total row

  return (
    <div>
      {part.note && (
        <div style={{ marginBottom:10, padding:"8px 12px", background:"#fefce8",
          border:"1px solid #fde047", borderRadius:6, fontSize:12.5, color:"#854d0e" }}>
          {part.note}
        </div>
      )}
      <div style={{ border:"2px solid #475569", borderRadius:8, overflow:"hidden", maxWidth:520 }}>
        {/* Account name */}
        <div style={{ ...SLATE, textAlign:"center", padding:"8px 12px",
          fontWeight:700, fontSize:14, color:"#fff" }}>{part.title}</div>
        {/* Column headers */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:"1px solid #e2e8f0" }}>
          <div style={{ padding:"6px 14px", fontWeight:700, fontSize:12, color:"#475569",
            borderRight:"2px solid #475569", textAlign:"center" }}>Debit (Dr)</div>
          <div style={{ padding:"6px 14px", fontWeight:700, fontSize:12, color:"#475569",
            textAlign:"center" }}>Credit (Cr)</div>
        </div>
        {/* Data rows */}
        {Array.from({ length: Math.max(part.debits.length, part.credits.length) }).map((_,i) => {
          const dr = part.debits[i];
          const cr = part.credits[i];
          return (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
              background:i%2===0?"#fff":"#f8fafc", borderBottom:"1px solid #f0f4f8" }}>
              <div style={{ padding:"8px 14px", borderRight:"2px solid #475569",
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                {dr && <>
                  <span style={{ fontSize:12, color:"#374151" }}>{dr.label}</span>
                  <span style={{ ...MONO, fontSize:13, color:"#64748b" }}>{fmtDisplay(dr.amount.given)}</span>
                </>}
              </div>
              <div style={{ padding:"8px 14px",
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                {cr && <>
                  <span style={{ fontSize:12, color:"#374151" }}>{cr.label}</span>
                  <span style={{ ...MONO, fontSize:13, color:"#64748b" }}>{fmtDisplay(cr.amount.given)}</span>
                </>}
              </div>
            </div>
          );
        })}
        {/* Totals row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          background:"#f1f5f9", borderTop:"1.5px solid #cbd5e1" }}>
          <div style={{ padding:"7px 14px", borderRight:"2px solid #475569",
            display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#374151" }}>Total</span>
            <span style={{ ...MONO, fontSize:13, fontWeight:700, color:"#374151" }}>{fmtDisplay(drTotal)}</span>
          </div>
          <div style={{ padding:"7px 14px",
            display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#374151" }}>Total</span>
            <span style={{ ...MONO, fontSize:13, fontWeight:700, color:"#374151" }}>{fmtDisplay(crTotal)}</span>
          </div>
        </div>
        {/* Balance row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          background:"#e9eef5", borderTop:"2px solid #475569" }}>
          <div style={{ padding:"8px 14px", borderRight:"2px solid #475569",
            display:"flex", alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>Ending Balance</span>
          </div>
          <div style={{ padding:"6px 10px", display:"flex", alignItems:"center", gap:6 }}>
            <input value={ans[kAmt]||""} disabled={checked} placeholder="0"
              onChange={e => !checked && setAns(p=>({...p,[kAmt]:fmtNum(e.target.value)}))}
              style={{
                width:100, padding:"5px 8px", textAlign:"right", outline:"none",
                ...MONO, fontSize:13,
                border:`1.5px solid ${okAmt?"#10b981":badAmt||noAmt?"#ef4444":"#9ca3af"}`,
                borderRadius:6,
                background:okAmt?"#dcfce7":badAmt||noAmt?"#fee2e2":"#fff",
                color:okAmt?"#065f46":badAmt||noAmt?"#7f1d1d":"#0f172a",
              }}
            />
            <select value={rawSide} disabled={checked}
              onChange={e => !checked && setAns(p=>({...p,[kSide]:e.target.value}))}
              style={{
                padding:"5px 6px", borderRadius:6, fontSize:12, cursor:"pointer",
                border:`1.5px solid ${okSide?"#10b981":badSide||noSide?"#ef4444":"#9ca3af"}`,
                background:okSide?"#f0fdf4":badSide||noSide?"#fef2f2":"#fff",
                outline:"none", color:rawSide?"#0f172a":"#94a3b8",
              }}>
              <option value="">Side?</option>
              <option value="Debit">Debit</option>
              <option value="Credit">Credit</option>
            </select>
          </div>
        </div>
      </div>
      {checked && (
        <div style={{ marginTop:8, padding:"8px 12px",
          background:(okAmt&&okSide)?"#ecfdf5":"#fef2f2",
          border:`1px solid ${(okAmt&&okSide)?"#bbf7d0":"#fecaca"}`,
          borderRadius:7, fontSize:12, color:"#374151" }}>
          Balance = Cr ${fmtDisplay(crTotal)} − Dr ${fmtDisplay(drTotal)} = <strong>{fmtDisplay(part.balance.answer)}</strong> on the <strong>{part.balance.side}</strong> side
          {(badAmt||noAmt||badSide||noSide) && <span style={{ color:"#ef4444" }}> ← check your entries above</span>}
        </div>
      )}
    </div>
  );
}

// ─── OVER / UNDER ────────────────────────────────────────────────────────────
function OverUnderBody({ part, ans, setAns, checked, prefix="" }) {
  const kDec = `${prefix}decision`;
  const val  = ans[kDec]||"";
  const ok   = checked && val === part.correct;
  const bad  = checked && val && val !== part.correct;
  const noA  = checked && !val;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {/* Decision */}
      <div style={{ padding:"12px 14px", background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:8 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#475569", marginBottom:8 }}>{part.prompt}</div>
        <select value={val} disabled={checked}
          onChange={e => !checked && setAns(p=>({...p,[kDec]:e.target.value}))}
          style={{
            padding:"8px 12px", borderRadius:7, fontSize:13, cursor:"pointer",
            width:"100%", maxWidth:280,
            border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
            background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
            outline:"none", color:val?"#0f172a":"#94a3b8",
          }}>
          <option value="">— Select —</option>
          <option value="Overapplied">Overapplied</option>
          <option value="Underapplied">Underapplied</option>
        </select>
        {(bad||noA) && <div style={{ marginTop:5, fontSize:11.5, color:"#ef4444", fontWeight:600 }}>→ {part.correct}</div>}
        {checked && (
          <div style={{ marginTop:8, padding:"8px 12px",
            background:ok?"#ecfdf5":"#fff5f5",
            border:`1px solid ${ok?"#bbf7d0":"#fecaca"}`,
            borderRadius:6, fontSize:12.5, color:"#374151", lineHeight:1.6 }}>
            {part.explanation}
          </div>
        )}
      </div>
      {/* Closing JE */}
      <div>
        <div style={{ fontSize:12.5, fontWeight:700, color:"#475569", marginBottom:6 }}>{part.closingLabel}</div>
        <JournalEntryRows
          entry={{ label:"Closing Entry — Manufacturing Overhead to COGS", rows:part.closingRows }}
          ei={0} ans={ans} setAns={setAns} checked={checked}
          prefix={`${prefix}cl_`} accountPool={part.closingAccountPool||[]}
        />
      </div>
    </div>
  );
}

// ─── MULTI PART ──────────────────────────────────────────────────────────────
function MultiPartBody({ q, ans, setAns, checked }) {
  return (
    <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:16 }}>
      {q.parts.map((part, pi) => {
        const pfx = `p${pi}_`;
        const pSetAns = fn => setAns(prev => fn(prev));
        return (
          <div key={pi} style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
            <div style={{ ...SLATE, padding:"8px 12px" }}>
              <span style={{ fontSize:12.5, fontWeight:700, color:"#fff" }}>{part.partLabel}</span>
            </div>
            <div style={{ padding:"12px" }}>
              {(part.type === "single_calc") && (
                <SingleCalcBody part={part} ans={ans} setAns={pSetAns} checked={checked} prefix={pfx} />
              )}
              {(part.type === "mcq") && (
                <MCQBody part={part} ans={ans} setAns={pSetAns} checked={checked} prefix={pfx} />
              )}
              {(part.type === "journal_entry") && (
                <JournalEntryBody q={part} ans={ans} setAns={pSetAns} checked={checked} prefix={pfx} />
              )}
              {(part.type === "journal_entry_calc") && (
                <div>
                  {/* Calculation field */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12,
                    padding:"10px 12px", background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:7 }}>
                    <span style={{ fontSize:13, color:"#92400e", fontWeight:600 }}>{part.calcLabel}</span>
                    <NumInput stateKey={`${pfx}calc`} ans={ans} setAns={pSetAns}
                      correct={part.calcCorrect} tol={part.calcTol||1} checked={checked} width={120} />
                  </div>
                  <JournalEntryBody q={part} ans={ans} setAns={pSetAns} checked={checked} prefix={pfx} />
                </div>
              )}
              {(part.type === "t_account") && (
                <TAccountBody part={part} ans={ans} setAns={pSetAns} checked={checked} prefix={pfx} />
              )}
              {(part.type === "over_under") && (
                <OverUnderBody part={part} ans={ans} setAns={pSetAns} checked={checked} prefix={pfx} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── QUESTION BODY DISPATCHER ─────────────────────────────────────────────────
function QuestionBody({ q, ans, setAns, checked }) {
  if (q.type === "single_classifier") return <SingleClassifierBody q={q} ans={ans} setAns={setAns} checked={checked} />;
  if (q.type === "journal_entry")     return <div style={{padding:"0 16px 16px"}}><JournalEntryBody q={q} ans={ans} setAns={setAns} checked={checked} prefix="" /></div>;
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
  const wrongCount = QUESTIONS.filter((_,i) => grades[i] && grades[i].correct < grades[i].total).length;
  return (
    <div style={{ position:"relative", overflow:"hidden" }}>
      <Confetti active={p===100} />
      <div style={{ textAlign:"center", padding:"40px 20px 24px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", letterSpacing:1.5,
          textTransform:"uppercase", marginBottom:16 }}>Chapter 2 · Final Score</div>
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
            const qp = pct(g.correct,g.total);
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
export default function Ch02Quiz({ onComplete } = {}) {
  const [savedDraft] = useState(() => loadQuizDraft("ch02"));
  const [current,  setCurrent]  = useState(() => Number.isInteger(savedDraft?.current) ? savedDraft.current : 0);
  const [answers,  setAnswers]  = useState(() => Array.isArray(savedDraft?.answers) && savedDraft.answers.length === QUESTIONS.length ? savedDraft.answers : QUESTIONS.map(() => ({})));
  const [checked,  setChecked]  = useState(() => Array.isArray(savedDraft?.checked) && savedDraft.checked.length === QUESTIONS.length ? savedDraft.checked : QUESTIONS.map(() => false));
  const [grades,   setGrades]   = useState(() => (savedDraft?.grades && typeof savedDraft.grades === "object" && !Array.isArray(savedDraft.grades) ? savedDraft.grades : {}));
  const [screen,   setScreen]   = useState(() => (savedDraft?.screen === "quiz" || savedDraft?.screen === "review") ? savedDraft.screen : "quiz");
  const [revIdx,   setRevIdx]   = useState(() => Number.isInteger(savedDraft?.revIdx) ? savedDraft.revIdx : 0);
  const [stickyOpen, setStickyOpen] = useState(() => savedDraft?.stickyOpen !== false);
  const reportedResult = useRef(false);

  const q       = QUESTIONS[current];
  const ans     = answers[current];
  const isChkd  = checked[current];
  const setAns  = fn => setAnswers(prev => { const n=[...prev]; n[current]=fn(n[current]); return n; });
  const filled  = allFilled(q, ans);
  const allDone = QUESTIONS.every((_,i) => checked[i]);
  const wrongQs = QUESTIONS.filter((_,i) => grades[i] && grades[i].correct < grades[i].total);
  const needsSticky = ["multi_part"].includes(q.type);

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
  // Reset sticky bar to open whenever the question changes
  useEffect(() => { setStickyOpen(true); }, [current]);
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
      chapterId: "ch02",
      chapterLabel: "Chapter 2",
      ...totals,
      percent: pct(totals.correct, totals.total),
      completedAt: new Date().toISOString(),
    });
  }, [screen, grades, onComplete]);

  useEffect(() => {
    if (screen === "results") return;
    saveQuizDraft("ch02", { current, answers, checked, grades, screen, revIdx, stickyOpen });
  }, [current, answers, checked, grades, screen, revIdx, stickyOpen]);

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
    const p = pct(g.correct, g.total);
    const c = p===100?"#10b981":p>=70?"#d97706":"#ef4444";
    return <span style={{ fontSize:13, fontWeight:700, color:c, background:c+"18",
      padding:"4px 12px", borderRadius:20, border:`1px solid ${c}33` }}>{g.correct}/{g.total} · {p}%</span>;
  })() : null;

  return (
    <div style={wrap}><style>{CSS}</style><div style={inner}>
      <div style={{ marginBottom:14 }}>
        <h1 style={{ fontWeight:800, fontSize:22, margin:0 }}>Chapter 2 — Job Order Costing</h1>
        <p style={{ fontSize:12, color:"#64748b", margin:"3px 0 0" }}>
          Q17 · Q19 · Q22 · Q23 · Q24 · Q32 — Costing Systems, Overhead Rates, Journal Entries & T-Accounts
        </p>
      </div>

      {/* ── Sticky scenario bar (long questions only) ── */}
      {needsSticky && (
        <div style={{
          position:"sticky", top:0, zIndex:100,
          background:"#1e293b", borderBottom:"2px solid #0d9488",
          boxShadow:"0 3px 14px rgba(0,0,0,.3)",
          marginBottom:8, borderRadius:"0 0 8px 8px",
        }}>
          <div style={{ padding:"0 16px" }}>
            {/* Toggle row */}
            <div
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"9px 0", cursor:"pointer", userSelect:"none" }}
              onClick={() => setStickyOpen(o => !o)}
            >
              <span style={{ fontSize:11.5, fontWeight:700, color:"#94a3b8",
                letterSpacing:.8, textTransform:"uppercase" }}>
                📋 Question Data — {q.title}
              </span>
              <span style={{
                fontSize:11, color:"#94a3b8", fontWeight:600,
                background:"#334155", borderRadius:20, padding:"2px 12px",
                border:"1px solid #475569",
              }}>
                {stickyOpen ? "Hide ▲" : "Show ▼"}
              </span>
            </div>
            {/* Collapsible body */}
            {stickyOpen && (
              <div style={{
                fontSize:12.5, color:"#cbd5e1", lineHeight:1.75,
                paddingBottom:12, borderTop:"1px solid #334155", paddingTop:8,
              }}>
                {q.desc.split("\n").map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={card}>
        <NavRow questions={QUESTIONS} current={current} setCurrent={setCurrent} grades={grades} />
        {Object.keys(grades).length > 0 && <ProgressBar grades={grades} />}
        {/* Inline desc only for short questions — sticky bar handles long ones */}
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
