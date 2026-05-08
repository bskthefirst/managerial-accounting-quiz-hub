import { useEffect, useRef, useState } from "react";

const fmtDisplay = (n) => {
  if (n === null || n === undefined || n === "") return "";
  const num = typeof n === "string"
    ? parseFloat(n.replace(/[$,()]/g, "")) * (n.includes("(") ? -1 : 1)
    : n;
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
  const parts = s.split(".");
  const whole = parseInt(parts[0] || "0", 10).toLocaleString("en-US");
  return `${neg ? "-" : ""}${parts.length > 1 ? `${whole}.${parts[1].slice(0, 2)}` : whole}`;
};

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const close = (actual, expected, tol = 0.01) => actual !== null && Math.abs(actual - expected) <= tol;
const MONO = { fontFamily: "'JetBrains Mono','Courier New',monospace" };
const TEAL = "#0d9488";

const ACCOUNT_POOL = [
  "Work-in-Process Inventory",
  "Manufacturing Overhead",
  "Raw Materials Inventory",
  "Accounts Payable",
  "Salaries Payable",
  "Finished Goods Inventory",
  "Cost of Goods Sold",
];

const QUESTIONS = [
  {
    id: "q26",
    nav: "Q26",
    title: "Q26 · Identifying Cost Drivers",
    desc: "Ehrman Company identified the activities below as important activities and formed cost pools for each. Select a possible cost driver for each activity.",
    type: "classifier",
    options: [
      "Number of purchase orders processed",
      "Number of inspections",
      "Days in storage",
      "Maintenance hours",
      "Number of machine setups",
      "Number of tests performed",
    ],
    rows: [
      { label: "Purchasing raw materials", correct: "Number of purchase orders processed" },
      { label: "Inspecting raw materials", correct: "Number of inspections" },
      { label: "Storing raw materials", correct: "Days in storage" },
      { label: "Maintaining production equipment", correct: "Maintenance hours" },
      { label: "Setting up machines to produce batches of product", correct: "Number of machine setups" },
      { label: "Testing finished products", correct: "Number of tests performed" },
    ],
  },
  {
    id: "q28",
    nav: "Q28",
    title: "Q28 · Value-Added and Non-Value-Added Activities",
    desc: "Novak Corporation manufactures custom-made kayaks and accessories. Label each activity as value-added or non-value-added.",
    type: "classifier",
    options: ["Value-added", "Non-value-added"],
    rows: [
      { label: "Storing parts and materials", correct: "Non-value-added" },
      { label: "Queuing orders before beginning production", correct: "Non-value-added" },
      { label: "Assembling kayaks", correct: "Value-added" },
      { label: "Waiting for materials to arrive to continue production", correct: "Non-value-added" },
      { label: "Painting kayaks", correct: "Value-added" },
      { label: "Designing kayaks to maximize comfort", correct: "Value-added" },
      { label: "Scrapping defective materials", correct: "Non-value-added" },
    ],
  },
  {
    id: "q30",
    nav: "Q30",
    title: "Q30 · Plantwide Versus Department Allocations of Overhead",
    desc: "San Juan Company expects overhead costs of $600,000 this year: Cutting $100,000, Assembly $300,000, and Finishing $200,000. Direct labor hours companywide are expected to total 40,000. Cutting expects 20,000 machine hours, Assembly expects 25,000 direct labor hours, and Finishing expects $100,000 in direct labor cost.",
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Plantwide predetermined overhead rate",
        type: "calc_table",
        rows: [
          { label: "Estimated total overhead", given: 600000 },
          { label: "Estimated total direct labor hours", given: 40000 },
          { label: "Plantwide predetermined overhead rate per direct labor hour", answer: 15, tol: 0.01 },
        ],
      },
      {
        partLabel: "(a) How the plantwide rate is used",
        type: "mcq",
        stem: "How is the plantwide overhead rate used to allocate overhead?",
        options: [
          "Multiply the plantwide rate by the direct labor hours used by a job.",
          "Multiply each department's rate by that department's cost driver.",
          "Multiply the plantwide rate by total direct materials cost.",
          "Apply overhead only to jobs completed during the period.",
        ],
        correct: 0,
      },
      {
        partLabel: "(b) Department predetermined overhead rates",
        type: "calc_table",
        rows: [
          { label: "Cutting department rate per machine hour", answer: 5, tol: 0.01 },
          { label: "Assembly department rate per direct labor hour", answer: 12, tol: 0.01 },
          { label: "Finishing department rate as a percent of direct labor cost", answer: 200, tol: 0.01 },
        ],
      },
      {
        partLabel: "(b) How department rates are used",
        type: "mcq",
        stem: "How are department overhead rates used to allocate overhead?",
        options: [
          "Each department applies overhead using its own cost driver and rate.",
          "All departments use the same direct labor hour rate.",
          "Only the largest department applies overhead to products.",
          "Department rates are used only after actual overhead is known.",
        ],
        correct: 0,
      },
    ],
  },
  {
    id: "q31",
    nav: "Q31",
    title: "Q31 · Product Costs Using Activity-Based Costing",
    desc: "Stillwater Company identified activities, estimated annual costs, and cost drivers. For January, it produces products Z1, Z2, and Z3.",
    details: [
      "Estimated rates: Ordering parts $400,000 / 5,000 requisitions; Tracking inventory $560,000 / 80,000 parts; Running machines $350,000 / 7,000 machine hours; Inspecting finished products $200,000 / 1,000 inspection hours.",
      "January activity: Z1 uses 50 requisitions, 4,000 parts, 330 machine hours, 10 inspection hours.",
      "January activity: Z2 uses 70 requisitions, 3,300 parts, 240 machine hours, 50 inspection hours.",
      "January activity: Z3 uses 100 requisitions, 3,600 parts, 310 machine hours, 30 inspection hours.",
      "Unit data: Z1 DM $100, DL $35, 250 units; Z2 DM $75, DL $25, 500 units; Z3 DM $200, DL $70, 700 units.",
    ],
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Predetermined overhead rate for each activity",
        type: "calc_table",
        rows: [
          { label: "Ordering parts rate per purchase requisition", answer: 80, tol: 0.01 },
          { label: "Tracking inventory of parts rate per part purchased", answer: 7, tol: 0.01 },
          { label: "Running machines rate per machine hour", answer: 50, tol: 0.01 },
          { label: "Inspecting finished products rate per inspection hour", answer: 200, tol: 0.01 },
        ],
      },
      {
        partLabel: "(b) Allocate overhead to each product for January",
        type: "matrix",
        columns: ["Z1", "Z2", "Z3"],
        rows: [
          { label: "Ordering parts", answers: [4000, 5600, 8000] },
          { label: "Tracking inventory of parts", answers: [28000, 23100, 25200] },
          { label: "Running machines", answers: [16500, 12000, 15500] },
          { label: "Inspecting finished products", answers: [2000, 10000, 6000] },
          { label: "Total overhead allocated", answers: [50500, 50700, 54700], total: true },
        ],
      },
      {
        partLabel: "(c) Overhead cost per unit for January",
        type: "matrix",
        columns: ["Z1", "Z2", "Z3"],
        rows: [
          { label: "Overhead cost per unit", answers: [202, 101.40, 78.14], tol: 0.05 },
        ],
      },
      {
        partLabel: "(d) Product cost per unit for January",
        type: "matrix",
        columns: ["Z1", "Z2", "Z3"],
        rows: [
          { label: "Product cost per unit", answers: [337, 201.40, 348.14], tol: 0.05 },
        ],
      },
    ],
  },
  {
    id: "q32",
    nav: "Q32",
    title: "Q32 · Journal Entry to Apply Overhead",
    desc: "Caspian Company is deciding which of three approaches it should use to apply overhead to products.",
    details: [
      "Plantwide rate: 150% of direct labor cost; direct labor cost for the year totaled $80,000.",
      "Department rates: Machining $55 per machine hour and Assembly $35 per direct labor hour; Machining used 1,000 machine hours and Assembly used 1,200 direct labor hours.",
      "ABC rates: purchase requisitions $15 each, production setups $50 each, quality control $70 each; the year had 900 requisitions, 1,300 setups, and 400 inspections.",
    ],
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Plantwide method",
        type: "calc_plus_journal",
        calcLabel: "Overhead applied using the plantwide method",
        answer: 120000,
        journal: {
          accountPool: ACCOUNT_POOL,
          rows: [
            { side: "Dr", account: "Work-in-Process Inventory", amount: 120000 },
            { side: "Cr", account: "Manufacturing Overhead", amount: 120000 },
          ],
        },
      },
      {
        partLabel: "(b) Department method",
        type: "calc_plus_journal",
        calcLabel: "Overhead applied using department rates",
        answer: 97000,
        journal: {
          accountPool: ACCOUNT_POOL,
          rows: [
            { side: "Dr", account: "Work-in-Process Inventory", amount: 97000 },
            { side: "Cr", account: "Manufacturing Overhead", amount: 97000 },
          ],
        },
      },
      {
        partLabel: "(c) Activity-based costing method",
        type: "calc_plus_journal",
        calcLabel: "Overhead applied using activity-based costing",
        answer: 106500,
        journal: {
          accountPool: ACCOUNT_POOL,
          rows: [
            { side: "Dr", account: "Work-in-Process Inventory", amount: 106500 },
            { side: "Cr", account: "Manufacturing Overhead", amount: 106500 },
          ],
        },
      },
    ],
  },
  {
    id: "q34",
    nav: "Q34",
    title: "Q34 · Cost Hierarchy",
    desc: "Tanaka Company has the following activities and costs. First classify each item in the cost hierarchy, then select an appropriate allocation base.",
    type: "multi_part",
    parts: [
      {
        partLabel: "(a) Cost hierarchy classification",
        type: "classifier",
        options: ["Unit-level", "Batch-level", "Product-level", "Customer-level", "Facility-level"],
        rows: [
          { label: "Direct materials used by workers to assemble products", correct: "Unit-level" },
          { label: "Purchase requisitions issued for raw materials", correct: "Batch-level" },
          { label: "Machines set up to produce groups of products", correct: "Batch-level" },
          { label: "New product research and development", correct: "Product-level" },
          { label: "Maintenance performed on the factory building", correct: "Facility-level" },
          { label: "Direct labor assembling products", correct: "Unit-level" },
          { label: "Product designed for a specific customer", correct: "Customer-level" },
          { label: "Factory building rent", correct: "Facility-level" },
        ],
      },
      {
        partLabel: "(b) Appropriate allocation base",
        type: "classifier",
        options: [
          "Quantity of direct materials used",
          "Number of purchase requisitions",
          "Number of setups",
          "R&D hours per product",
          "Maintenance hours",
          "Direct labor hours",
          "Design hours for the specific customer",
          "Machine hours",
        ],
        rows: [
          { label: "Direct materials used by workers to assemble products", correct: "Quantity of direct materials used" },
          { label: "Purchase requisitions issued for raw materials", correct: "Number of purchase requisitions" },
          { label: "Machines set up to produce groups of products", correct: "Number of setups" },
          { label: "New product research and development", correct: "R&D hours per product" },
          { label: "Maintenance performed on the factory building", correct: "Maintenance hours" },
          { label: "Direct labor assembling products", correct: "Direct labor hours" },
          { label: "Product designed for a specific customer", correct: "Design hours for the specific customer" },
          { label: "Factory building rent", correct: "Machine hours" },
        ],
      },
    ],
  },
];

function NumInput({ value = "", onChange, checked, correct, tol = 0.01 }) {
  const parsed = parseInput(value);
  const ok = checked && close(parsed, correct, tol);
  const bad = checked && !ok;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <input
        value={value}
        onChange={e => onChange(fmtNum(e.target.value))}
        disabled={checked}
        placeholder="0"
        style={{
          ...MONO,
          width: "100%",
          minWidth: 92,
          padding: "8px 9px",
          borderRadius: 7,
          border: `1.5px solid ${bad ? "#dc2626" : ok ? "#16a34a" : "#cbd5e1"}`,
          background: checked ? "#f8fafc" : "#fff",
          textAlign: "right",
          fontSize: 13,
        }}
      />
      {checked && (
        <span style={{ ...MONO, fontSize: 11, color: ok ? "#16a34a" : "#dc2626", textAlign: "right", fontWeight: 700 }}>
          {ok ? "✓" : `✓ ${fmtDisplay(correct)}`}
        </span>
      )}
    </div>
  );
}

function SelectInput({ value = "", onChange, checked, correct, options }) {
  const ok = checked && value === correct;
  const bad = checked && !ok;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={checked}
        style={{
          width: "100%",
          padding: "8px 9px",
          borderRadius: 7,
          border: `1.5px solid ${bad ? "#dc2626" : ok ? "#16a34a" : "#cbd5e1"}`,
          background: checked ? "#f8fafc" : "#fff",
          fontSize: 12.5,
        }}
      >
        <option value="">— Select your answer —</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      {checked && (
        <span style={{ fontSize: 11, color: ok ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
          {ok ? "✓" : `✓ ${correct}`}
        </span>
      )}
    </div>
  );
}

function Classifier({ q, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={th}>Activity / cost</th>
            <th style={{ ...th, width: "42%" }}>Answer</th>
          </tr>
        </thead>
        <tbody>
          {q.rows.map((row, i) => (
            <tr key={row.label}>
              <td style={td}>{row.label}</td>
              <td style={td}>
                <SelectInput
                  value={ans[`${prefix}r${i}`]}
                  onChange={v => setAns(a => ({ ...a, [`${prefix}r${i}`]: v }))}
                  checked={checked}
                  correct={row.correct}
                  options={q.options}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalcTable({ q, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {q.rows.map((row, i) => (
            <tr key={row.label} style={{ background: row.total ? "#f1f5f9" : i % 2 ? "#fafafa" : "#fff" }}>
              <td style={{ ...td, fontWeight: row.total ? 800 : 600 }}>{row.label}</td>
              <td style={{ ...td, width: 220 }}>
                {row.given !== undefined ? (
                  <span style={{ ...MONO, color: "#64748b", fontWeight: 700 }}>{fmtDisplay(row.given)}</span>
                ) : (
                  <NumInput
                    value={ans[`${prefix}r${i}`]}
                    onChange={v => setAns(a => ({ ...a, [`${prefix}r${i}`]: v }))}
                    checked={checked}
                    correct={row.answer}
                    tol={row.tol}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Matrix({ q, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={th}></th>
            {q.columns.map(col => <th key={col} style={{ ...th, textAlign: "right" }}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {q.rows.map((row, r) => (
            <tr key={row.label} style={{ background: row.total ? "#f1f5f9" : r % 2 ? "#fafafa" : "#fff" }}>
              <td style={{ ...td, fontWeight: row.total ? 800 : 600 }}>{row.label}</td>
              {q.columns.map((col, c) => (
                <td key={col} style={{ ...td, width: 150 }}>
                  <NumInput
                    value={ans[`${prefix}r${r}c${c}`]}
                    onChange={v => setAns(a => ({ ...a, [`${prefix}r${r}c${c}`]: v }))}
                    checked={checked}
                    correct={row.answers[c]}
                    tol={row.tol ?? 0.01}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Mcq({ q, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ display: "grid", gap: 9 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{q.stem}</div>
      {q.options.map((opt, i) => {
        const selected = ans[`${prefix}mcq`] === String(i);
        const correct = q.correct === i;
        const border = checked && correct ? "#16a34a" : checked && selected && !correct ? "#dc2626" : selected ? TEAL : "#e2e8f0";
        const bg = checked && correct ? "#f0fdf4" : selected ? "#ecfeff" : "#fff";
        const color = selected && !checked ? "#0f766e" : "#334155";
        return (
          <label key={opt} style={{
            display: "flex",
            gap: 9,
            alignItems: "flex-start",
            padding: "10px 12px",
            border: `1.5px solid ${border}`,
            borderRadius: 8,
            background: bg,
            color,
            cursor: checked ? "default" : "pointer",
          }}>
            <input
              type="radio"
              name={`${prefix}${q.stem}`}
              checked={selected}
              disabled={checked}
              onChange={() => setAns(a => ({ ...a, [`${prefix}mcq`]: String(i) }))}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: 13, lineHeight: 1.45 }}>{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function JournalEntry({ q, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={{ ...th, width: 90 }}>Side</th>
            <th style={th}>Account</th>
            <th style={{ ...th, width: 170, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {q.rows.map((row, i) => (
            <tr key={`${row.side}-${row.account}`}>
              <td style={td}>
                <SelectInput
                  value={ans[`${prefix}side${i}`]}
                  onChange={v => setAns(a => ({ ...a, [`${prefix}side${i}`]: v }))}
                  checked={checked}
                  correct={row.side}
                  options={["Dr", "Cr"]}
                />
              </td>
              <td style={td}>
                <SelectInput
                  value={ans[`${prefix}acct${i}`]}
                  onChange={v => setAns(a => ({ ...a, [`${prefix}acct${i}`]: v }))}
                  checked={checked}
                  correct={row.account}
                  options={q.accountPool}
                />
              </td>
              <td style={td}>
                <NumInput
                  value={ans[`${prefix}amt${i}`]}
                  onChange={v => setAns(a => ({ ...a, [`${prefix}amt${i}`]: v }))}
                  checked={checked}
                  correct={row.amount}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalcPlusJournal({ q, ans, setAns, checked, prefix = "" }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          <tr>
            <td style={{ ...td, fontWeight: 700 }}>{q.calcLabel}</td>
            <td style={{ ...td, width: 220 }}>
              <NumInput
                value={ans[`${prefix}calc`]}
                onChange={v => setAns(a => ({ ...a, [`${prefix}calc`]: v }))}
                checked={checked}
                correct={q.answer}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <JournalEntry q={q.journal} ans={ans} setAns={setAns} checked={checked} prefix={`${prefix}je_`} />
    </div>
  );
}

function MultiPart({ q, ans, setAns, checked }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {q.parts.map((part, i) => (
        <div key={part.partLabel} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 9, overflow: "hidden" }}>
          <div style={{ padding: "9px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 800, fontSize: 13 }}>
            {part.partLabel}
          </div>
          <div style={{ padding: 12 }}>
            <QuestionBody q={part} ans={ans} setAns={setAns} checked={checked} prefix={`p${i}_`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionBody({ q, ans, setAns, checked, prefix = "" }) {
  if (q.type === "classifier") return <Classifier q={q} ans={ans} setAns={setAns} checked={checked} prefix={prefix} />;
  if (q.type === "calc_table") return <CalcTable q={q} ans={ans} setAns={setAns} checked={checked} prefix={prefix} />;
  if (q.type === "matrix") return <Matrix q={q} ans={ans} setAns={setAns} checked={checked} prefix={prefix} />;
  if (q.type === "mcq") return <Mcq q={q} ans={ans} setAns={setAns} checked={checked} prefix={prefix} />;
  if (q.type === "calc_plus_journal") return <CalcPlusJournal q={q} ans={ans} setAns={setAns} checked={checked} prefix={prefix} />;
  if (q.type === "multi_part") return <MultiPart q={q} ans={ans} setAns={setAns} checked={checked} />;
  return null;
}

function scoreQuestion(q, ans, prefix = "") {
  if (q.type === "multi_part") {
    return q.parts.reduce((sum, part, i) => {
      const s = scoreQuestion(part, ans, `p${i}_`);
      return { correct: sum.correct + s.correct, total: sum.total + s.total };
    }, { correct: 0, total: 0 });
  }
  if (q.type === "classifier") {
    return q.rows.reduce((sum, row, i) => ({
      correct: sum.correct + (ans[`${prefix}r${i}`] === row.correct ? 1 : 0),
      total: sum.total + 1,
    }), { correct: 0, total: 0 });
  }
  if (q.type === "calc_table") {
    return q.rows.reduce((sum, row, i) => {
      if (row.given !== undefined) return sum;
      return {
        correct: sum.correct + (close(parseInput(ans[`${prefix}r${i}`]), row.answer, row.tol ?? 0.01) ? 1 : 0),
        total: sum.total + 1,
      };
    }, { correct: 0, total: 0 });
  }
  if (q.type === "matrix") {
    return q.rows.reduce((sum, row, r) => {
      row.answers.forEach((value, c) => {
        sum.total += 1;
        if (close(parseInput(ans[`${prefix}r${r}c${c}`]), value, row.tol ?? 0.01)) sum.correct += 1;
      });
      return sum;
    }, { correct: 0, total: 0 });
  }
  if (q.type === "mcq") {
    return { correct: ans[`${prefix}mcq`] === String(q.correct) ? 1 : 0, total: 1 };
  }
  if (q.type === "calc_plus_journal") {
    const calc = close(parseInput(ans[`${prefix}calc`]), q.answer) ? 1 : 0;
    const je = scoreQuestion({ type: "journal_entry", ...q.journal }, ans, `${prefix}je_`);
    return { correct: calc + je.correct, total: 1 + je.total };
  }
  if (q.type === "journal_entry") {
    return q.rows.reduce((sum, row, i) => ({
      correct: sum.correct
        + (ans[`${prefix}side${i}`] === row.side ? 1 : 0)
        + (ans[`${prefix}acct${i}`] === row.account ? 1 : 0)
        + (close(parseInput(ans[`${prefix}amt${i}`]), row.amount) ? 1 : 0),
      total: sum.total + 3,
    }), { correct: 0, total: 0 });
  }
  return { correct: 0, total: 0 };
}

function allFilled(q, ans, prefix = "") {
  if (q.type === "multi_part") return q.parts.every((part, i) => allFilled(part, ans, `p${i}_`));
  if (q.type === "classifier") return q.rows.every((_, i) => ans[`${prefix}r${i}`]);
  if (q.type === "calc_table") return q.rows.every((row, i) => row.given !== undefined || ans[`${prefix}r${i}`]);
  if (q.type === "matrix") return q.rows.every((row, r) => row.answers.every((_, c) => ans[`${prefix}r${r}c${c}`]));
  if (q.type === "mcq") return ans[`${prefix}mcq`];
  if (q.type === "calc_plus_journal") return ans[`${prefix}calc`] && allFilled({ type: "journal_entry", ...q.journal }, ans, `${prefix}je_`);
  if (q.type === "journal_entry") return q.rows.every((_, i) => ans[`${prefix}side${i}`] && ans[`${prefix}acct${i}`] && ans[`${prefix}amt${i}`]);
  return false;
}

function NavRow({ current, setCurrent, grades }) {
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
      {QUESTIONS.map((q, i) => {
        const g = grades[i];
        const active = current === i;
        const done = !!g;
        return (
          <button
            key={q.id}
            onClick={() => setCurrent(i)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: `1.5px solid ${active ? TEAL : done ? "#16a34a" : "#e2e8f0"}`,
              background: active ? TEAL : done ? "#f0fdf4" : "#f8fafc",
              color: active ? "#fff" : "#0f172a",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {q.nav}
          </button>
        );
      })}
    </div>
  );
}

function ProgressBar({ grades }) {
  const totals = Object.values(grades).reduce((a, g) => ({ c: a.c + g.correct, t: a.t + g.total }), { c: 0, t: 0 });
  const p = pct(totals.c, totals.t);
  return (
    <div style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 6 }}>
        <span>Progress Score</span><span>{fmtDisplay(totals.c)} / {fmtDisplay(totals.t)} · {p}%</span>
      </div>
      <div style={{ height: 7, background: "#e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ width: `${p}%`, height: "100%", background: TEAL }} />
      </div>
    </div>
  );
}

function ResultsScreen({ grades, onRetry }) {
  const totals = Object.values(grades).reduce((a, g) => ({ c: a.c + g.correct, t: a.t + g.total }), { c: 0, t: 0 });
  return (
    <div style={{ padding: 22 }}>
      <h2 style={{ margin: "0 0 6px", fontSize: 25, fontWeight: 900 }}>Final Score</h2>
      <div style={{ ...MONO, fontSize: 38, fontWeight: 800, color: TEAL, marginBottom: 16 }}>
        {fmtDisplay(totals.c)} / {fmtDisplay(totals.t)} · {pct(totals.c, totals.t)}%
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        {QUESTIONS.map((q, i) => {
          const g = grades[i] || { correct: 0, total: scoreQuestion(q, {}).total };
          return (
            <div key={q.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 90px", gap: 10, alignItems: "center", fontSize: 13 }}>
              <strong>{q.nav}</strong>
              <div style={{ height: 8, background: "#e2e8f0", borderRadius: 20, overflow: "hidden" }}>
                <div style={{ width: `${pct(g.correct, g.total)}%`, height: "100%", background: pct(g.correct, g.total) === 100 ? "#16a34a" : "#d97706" }} />
              </div>
              <span style={{ ...MONO, textAlign: "right" }}>{fmtDisplay(g.correct)} / {fmtDisplay(g.total)}</span>
            </div>
          );
        })}
      </div>
      <button onClick={onRetry} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: TEAL, color: "#fff", fontWeight: 800, cursor: "pointer" }}>
        Restart Quiz
      </button>
    </div>
  );
}

const th = { padding: "9px 10px", textAlign: "left", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569" };
const td = { padding: "9px 10px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" };

export default function Ch03Quiz({ onComplete } = {}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(QUESTIONS.map(() => ({})));
  const [checked, setChecked] = useState(QUESTIONS.map(() => false));
  const [grades, setGrades] = useState({});
  const [screen, setScreen] = useState("quiz");
  const [stickyOpen, setStickyOpen] = useState(true);
  const reportedResult = useRef(false);

  const q = QUESTIONS[current];
  const ans = answers[current];
  const setAns = fn => setAnswers(prev => {
    const next = [...prev];
    next[current] = fn(next[current]);
    return next;
  });
  const filled = allFilled(q, ans);
  const isChkd = checked[current];
  const g = grades[current];
  const allDone = QUESTIONS.every((_, i) => checked[i]);
  const needsSticky = ["q30", "q31", "q32"].includes(q.id);

  useEffect(() => {
    setStickyOpen(true);
  }, [current]);

  const gradeThis = () => {
    const score = scoreQuestion(q, ans);
    setGrades(prev => ({ ...prev, [current]: score }));
    setChecked(prev => {
      const next = [...prev];
      next[current] = true;
      return next;
    });
  };

  const clearThis = () => {
    setAnswers(prev => {
      const next = [...prev];
      next[current] = {};
      return next;
    });
    setChecked(prev => {
      const next = [...prev];
      next[current] = false;
      return next;
    });
    setGrades(prev => {
      const next = { ...prev };
      delete next[current];
      return next;
    });
  };

  const resetAll = () => {
    setAnswers(QUESTIONS.map(() => ({})));
    setChecked(QUESTIONS.map(() => false));
    setGrades({});
    setCurrent(0);
    setScreen("quiz");
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
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
    *, *::before, *::after { box-sizing:border-box; }
    input:focus, select:focus { box-shadow:0 0 0 3px rgba(13,148,136,.18)!important; outline:none!important; }
    button:hover:not(:disabled) { filter:brightness(.94); }
  `;
  const wrap = { minHeight: "100vh", background: "#f1f5f9", color: "#0f172a", fontFamily: "'DM Sans',system-ui,sans-serif" };
  const inner = { maxWidth: 960, margin: "0 auto", padding: "24px 14px 72px" };
  const card = { background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 16px rgba(15,23,42,.07)" };
  const ScenarioContent = ({ dark = false }) => (
    <>
      <div style={{
        fontWeight: 900,
        fontSize: dark ? 12.5 : 14,
        marginBottom: dark ? 8 : 5,
        color: dark ? "#cbd5e1" : "#0f172a",
      }}>
        {q.title}
      </div>
      <div style={{ fontSize: dark ? 12.5 : 13, lineHeight: dark ? 1.7 : 1.65, color: dark ? "#cbd5e1" : "#475569" }}>
        {q.desc}
      </div>
      {q.details && (
        <div style={{ display: "grid", gap: 5, marginTop: 8, fontSize: 12.5, lineHeight: 1.55, color: dark ? "#cbd5e1" : "#475569" }}>
          {q.details.map(d => <div key={d}>• {d}</div>)}
        </div>
      )}
    </>
  );

  if (screen === "results") {
    return <div style={wrap}><style>{CSS}</style><div style={inner}><div style={card}><ResultsScreen grades={grades} onRetry={resetAll} /></div></div></div>;
  }

  const scoreBadge = isChkd && g ? (
    <span style={{
      fontSize: 13,
      fontWeight: 800,
      color: pct(g.correct, g.total) === 100 ? "#16a34a" : "#d97706",
      background: pct(g.correct, g.total) === 100 ? "#f0fdf4" : "#fffbeb",
      padding: "4px 12px",
      borderRadius: 20,
    }}>
      {fmtDisplay(g.correct)} / {fmtDisplay(g.total)} · {pct(g.correct, g.total)}%
    </span>
  ) : null;

  return (
    <div style={wrap}>
      <style>{CSS}</style>
      <div style={inner}>
        <div style={{ marginBottom: 14 }}>
          <h1 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>Chapter 3 — Activity-Based Costing</h1>
          <p style={{ fontSize: 12, color: "#64748b", margin: "3px 0 0" }}>
            Q26 · Q28 · Q30 · Q31 · Q32 · Q34 — Cost Drivers, Value-Added Activities, ABC, Journal Entries & Cost Hierarchy
          </p>
        </div>

        {needsSticky && (
          <div style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "#1e293b",
            borderBottom: `2px solid ${TEAL}`,
            boxShadow: "0 3px 14px rgba(15,23,42,.28)",
            marginBottom: 14,
            borderRadius: "0 0 9px 9px",
            overflow: "hidden",
          }}>
            <div
              onClick={() => setStickyOpen(open => !open)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                cursor: "pointer",
                userSelect: "none",
                borderBottom: stickyOpen ? "1px solid #334155" : "none",
              }}
            >
              <span style={{
                fontSize: 11.5,
                fontWeight: 900,
                color: "#94a3b8",
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}>
                📋 Question Data — {q.nav} · {q.title.replace(/^Q\d+\s*·\s*/, "")}
              </span>
              <span style={{
                flex: "0 0 auto",
                fontSize: 11,
                color: "#cbd5e1",
                fontWeight: 800,
                background: "#334155",
                borderRadius: 20,
                padding: "3px 12px",
                border: "1px solid #475569",
              }}>
                {stickyOpen ? "Hide ▲" : "Show ▼"}
              </span>
            </div>
            {stickyOpen && (
              <div style={{ padding: "12px 16px 14px" }}>
                <ScenarioContent dark />
              </div>
            )}
          </div>
        )}

        <div style={card}>
          <NavRow current={current} setCurrent={setCurrent} grades={grades} />
          {Object.keys(grades).length > 0 && <ProgressBar grades={grades} />}
          {!needsSticky && (
            <div style={{ margin: "12px 16px", padding: "13px 14px", border: "1.5px solid #e2e8f0", borderRadius: 9, background: "#f8fafc" }}>
              <ScenarioContent />
            </div>
          )}

          <div style={{ padding: "0 16px 14px" }}>
            <QuestionBody q={q} ans={ans} setAns={setAns} checked={isChkd} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 16px 16px", borderTop: "1px solid #e2e8f0", background: "#fff" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={gradeThis}
                disabled={isChkd || !filled}
                style={{
                  padding: "9px 22px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 800,
                  border: "none",
                  cursor: isChkd || !filled ? "not-allowed" : "pointer",
                  background: isChkd || !filled ? "#94a3b8" : TEAL,
                  color: "#fff",
                }}
              >
                Check Answers
              </button>
              <button onClick={clearThis} style={{ padding: "9px 22px", borderRadius: 8, fontSize: 13.5, fontWeight: 800, border: "none", cursor: "pointer", background: "#64748b", color: "#fff" }}>
                Clear
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {scoreBadge}
              {current < QUESTIONS.length - 1 ? (
                <button onClick={() => setCurrent(c => c + 1)} style={{ padding: "9px 22px", borderRadius: 8, fontSize: 13.5, fontWeight: 800, border: "none", cursor: "pointer", background: "#10b981", color: "#fff" }}>
                  Next →
                </button>
              ) : (
                <button onClick={() => { if (!isChkd && filled) gradeThis(); setTimeout(() => setScreen("results"), 100); }} style={{ padding: "9px 22px", borderRadius: 8, fontSize: 13.5, fontWeight: 800, border: "none", cursor: "pointer", background: "#10b981", color: "#fff" }}>
                  Final Score
                </button>
              )}
            </div>
          </div>
        </div>
        {allDone && (
          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button onClick={() => setScreen("results")} style={{ padding: "10px 40px", borderRadius: 8, fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer", background: "#10b981", color: "#fff" }}>
              See Final Score
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
