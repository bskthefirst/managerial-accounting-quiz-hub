import { useState, useRef, useEffect } from "react";
import { loadQuizDraft, saveQuizDraft, clearQuizDraft } from "./quiz-progress.js";

// ─── UTILS ────────────────────────────────────────────────────────────────────
const parseInput = s => {
  if (!s || !s.trim()) return null;
  const neg = s.includes("(") || s.trim().startsWith("-");
  const num = parseFloat(s.replace(/[$,()\-\s,]/g, ""));
  return isNaN(num) ? null : (neg ? -num : num);
};
const fmtNum = v => {
  const neg = v.trim().startsWith("-") || v.includes("(");
  const s = v.replace(/[^0-9.]/g,"");
  if (!s) return neg ? "-" : "";
  const p = s.split(".");
  const i = parseInt(p[0]||"0",10).toLocaleString();
  return (neg?"-":"") + (p.length>1 ? i+"."+p[1].slice(0,2) : i);
};
const fmtD  = n => { // comma-format with parens for negatives, no $ sign
  if (n===null||n===undefined) return "";
  const abs = Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:n%1!==0?2:0,maximumFractionDigits:n%1!==0?2:0});
  return n < 0 ? `(${abs})` : abs;
};
const fmt$  = n => n<0 ? `($${Math.abs(n).toLocaleString()})` : `$${n.toLocaleString()}`;
const closeEq = (stateVal, correct, tol=1) => {
  const r = parseInput(stateVal);
  return r !== null && Math.abs(r - correct) <= tol;
};
const pctCalc = (a,b) => b ? Math.round(a/b*100) : 0;
const MONO  = { fontFamily:"'JetBrains Mono','Courier New',monospace" };
const SLATE = { background:"linear-gradient(135deg,#334155,#475569)" };
const TEAL  = "#0d9488";
const TEAL_G = { background:"linear-gradient(135deg,#0f766e,#0d9488)" };

// ─── QUESTION DATA ────────────────────────────────────────────────────────────
const QUESTIONS = [

  // Q22 — Make-or-Buy: Coffee Mugs
  {
    id:"q22", nav:"Q22",
    title:"Q22 · Make-or-Buy — Coffee Mugs, Inc.",
    desc:"Coffee Mugs, Inc. currently manufactures ceramic mugs.\n• Outside supplier price: $2.00 per unit | Annual production: 100,000 units\n• Variable production cost: $0.80/unit | Annual fixed costs: $150,000\n• If outsourced: all variable costs + 40% of fixed costs are eliminated",
    type:"multi_part",
    parts:[
      {
        partLabel:"(a) Differential Analysis — Make Internally vs. Outsource",
        type:"diff_table",
        alt1Label:"Make Internally",
        alt2Label:"Outsource (Alt 2)",
        qualOpts:["Make (Alt 1) lower","Outsource (Alt 2) lower","Same"],
        rows:[
          { label:"Variable production costs",    a1:80000,  a2:0,      diff:80000,   qual:"Outsource (Alt 2) lower" },
          { label:"Annual fixed costs",           a1:150000, a2:90000,  diff:60000,   qual:"Outsource (Alt 2) lower" },
          { label:"Purchase price from supplier", a1:0,      a2:200000, diff:-200000, qual:"Make (Alt 1) lower" },
          { label:"Total costs",                  a1:230000, a2:290000, diff:-60000,  qual:"Make (Alt 1) lower", isTotal:true },
        ],
        zeroCells:{ "a1_2":true, },  // a1 col, row index 2 = Make has $0 purchase cost
      },
      {
        partLabel:"(b) Decision — Which Alternative Is Best?",
        type:"mcq",
        prompt:"Which alternative is best? Explain the reasoning.",
        choices:[
          { id:"a", text:"Make internally (Alt 1) — total cost of $230,000 is $60,000 lower than outsourcing. Outsourcing eliminates variable costs but the purchase price plus remaining fixed costs exceed the make alternative." },
          { id:"b", text:"Outsource (Alt 2) — the supplier's unit cost ($2.00) is much lower than variable cost ($0.80), so outsourcing saves money." },
          { id:"c", text:"Both alternatives cost the same because total fixed costs remain at $150,000 regardless of the decision." },
          { id:"d", text:"Outsource (Alt 2) — eliminating all variable costs ($80,000) produces the largest savings." },
        ],
        answer:"a",
        explain:"Make internally costs $230,000; outsourcing costs $290,000 — a $60,000 difference. Comparing unit variable costs alone ($0.80 vs $2.00) is misleading. Differential analysis must account for ALL relevant costs: the purchase price ($200,000) and remaining fixed costs ($90,000) make outsourcing $60,000 more expensive.",
      },
    ],
  },

  // Q24 — Customer Decision: Consulting Group
  {
    id:"q24", nav:"Q24",
    title:"Q24 · Customer Decision — Consulting Group LLC",
    desc:"Consulting Group LLC has two customers:\n• Customer One: $150,000 income after direct fixed costs deducted\n• Customer Two: $200,000 income after direct fixed costs deducted\n• Total allocated fixed costs: $300,000 (30% to Customer One, 70% to Customer Two)\n• Allocated fixed costs remain the same regardless of assignment",
    type:"multi_part",
    parts:[
      {
        partLabel:"(a) Allocate Fixed Costs and Compute Profit / Loss per Customer",
        type:"customer_alloc",
        customers:["Customer One","Customer Two","Total"],
        rows:[
          { label:"Income after direct fixed costs", vals:[150000,200000,350000] },
          { label:"Less: Allocated fixed costs",     vals:[90000,210000,300000], paren:true },
          { label:"Profit (loss)",                   vals:[60000,-10000,50000], isTotal:true },
        ],
      },
      {
        partLabel:"(b) Should Consulting Group Drop Customer Two?",
        type:"mcq",
        prompt:"Should Consulting Group LLC drop Customer Two? Explain.",
        choices:[
          { id:"a", text:"Yes — Customer Two shows a net loss of $(10,000) and should be dropped to improve overall profitability." },
          { id:"b", text:"No — if Customer Two is dropped, the $200,000 income contribution disappears, but the $300,000 allocated fixed costs remain unchanged and must be absorbed by Customer One. The company loses $200,000 of contribution while saving nothing." },
          { id:"c", text:"Yes — the $210,000 allocated to Customer Two is the largest single cost, and eliminating it would save the most money." },
          { id:"d", text:"No — Customer Two's allocated fixed cost is too high to be worth managing." },
        ],
        answer:"b",
        explain:"Allocated fixed costs are not avoidable — they total $300,000 regardless of which customers exist. Dropping Customer Two eliminates $200,000 of income while saving $0 in actual costs (the allocated FC just gets redistributed to Customer One). Net effect: a $200,000 decrease in profit. Customer Two's $(10,000) reported loss is misleading because $210,000 of the cost cannot be eliminated.",
      },
    ],
  },

  // Q25 — Special Order: Idle Capacity (Jerseys)
  {
    id:"q25", nav:"Q25",
    title:"Q25 · Special Order (Idle Capacity) — Jerseys, Inc.",
    desc:"Jerseys, Inc. produces 10,000 jerseys/year for regular customers at $10/jersey. Capacity: 15,000 jerseys.\n• Variable cost: $6/unit | Annual fixed costs: $15,000\n• Special order proposal: 3,000 jerseys at $8 each (one-time purchase from Rockville)\n• The 3,000 units fit within idle capacity — regular sales are not affected",
    type:"multi_part",
    parts:[
      {
        partLabel:"(a) Differential Analysis — Reject vs. Accept Special Order",
        type:"diff_table",
        alt1Label:"Reject Order",
        alt2Label:"Accept Special Order",
        qualOpts:["Reject (Alt 1) higher","Accept (Alt 2) higher","Same"],
        rows:[
          { label:"Extra sales revenue",   a1:0, a2:24000, diff:-24000, qual:"Accept (Alt 2) higher" },
          { label:"Extra variable costs",  a1:0, a2:18000, diff:-18000, qual:"Accept (Alt 2) higher" },
          { label:"Extra fixed costs",     a1:0, a2:0,     diff:0,      qual:"Same" },
          { label:"Extra profit",          a1:0, a2:6000,  diff:-6000,  qual:"Accept (Alt 2) higher", isTotal:true },
        ],
        zeroCells:{ "a1_0":true, "a1_1":true, "a1_2":true, "a1_3":true, "a2_2":true },
      },
      {
        partLabel:"(b) Decision — Should Jerseys Accept the Special Order?",
        type:"mcq",
        prompt:"Should Jerseys, Inc. accept the special order from Rockville?",
        choices:[
          { id:"a", text:"No — the special order price ($8) is below the regular price ($10), which would undercut normal sales." },
          { id:"b", text:"No — variable costs ($6) are too close to the special price ($8) to generate meaningful profit." },
          { id:"c", text:"Yes — idle capacity exists (5,000 units available), and the special order price ($8) exceeds variable cost ($6), generating $6,000 of extra profit. Fixed costs are unaffected." },
          { id:"d", text:"Yes — but only if Jerseys can permanently raise the price to $10 for Rockville in the future." },
        ],
        answer:"c",
        explain:"With idle capacity (only 10,000 of 15,000 units used), accepting the 3,000-unit order doesn't displace regular sales. The relevant comparison is special order price vs. variable cost: $8 > $6 = $2 CM per unit × 3,000 = $6,000 incremental profit. Fixed costs are sunk and don't change. Accept.",
      },
    ],
  },

  // Q30 — Make-or-Buy: Wheels, Inc. (4 parts)
  {
    id:"q30", nav:"Q30",
    title:"Q30 · Make-or-Buy — Wheels, Inc.",
    desc:"Wheels, Inc. manufactures custom automobile rims. Outsource offer: $80/unit. Annual production: 10,000 units.\nInternal costs per unit / total:\n• Direct materials: $20/unit | $200,000\n• Direct labor: $10/unit | $100,000\n• Manufacturing overhead: $30/unit | $300,000\n• Factory building & equipment lease (fixed): $70,000\n• Factory insurance (fixed): $50,000\n• Production supervisor's salary (fixed): $100,000\n• Total production costs: $820,000\nIf outsourced: all variable costs + factory lease + insurance are eliminated. Supervisor salary stays (long-term contract).",
    type:"multi_part",
    sticky:true,
    parts:[
      {
        partLabel:"(a) Differential Analysis — Make vs. Buy (Outsource)",
        type:"diff_table",
        alt1Label:"Make (Alt 1)",
        alt2Label:"Buy / Outsource (Alt 2)",
        qualOpts:["Make (Alt 1) lower","Buy (Alt 2) lower","Same"],
        rows:[
          { label:"Direct materials",                       a1:200000, a2:0,      diff:200000,  qual:"Buy (Alt 2) lower" },
          { label:"Direct labor",                           a1:100000, a2:0,      diff:100000,  qual:"Buy (Alt 2) lower" },
          { label:"Manufacturing overhead",                 a1:300000, a2:0,      diff:300000,  qual:"Buy (Alt 2) lower" },
          { label:"Factory building and equipment lease",   a1:70000,  a2:0,      diff:70000,   qual:"Buy (Alt 2) lower" },
          { label:"Factory insurance",                      a1:50000,  a2:0,      diff:50000,   qual:"Buy (Alt 2) lower" },
          { label:"Production supervisor's salary",         a1:100000, a2:100000, diff:0,       qual:"Same" },
          { label:"Purchase rims from outside supplier",    a1:0,      a2:800000, diff:-800000, qual:"Make (Alt 1) lower" },
          { label:"Total costs",                            a1:820000, a2:900000, diff:-80000,  qual:"Make (Alt 1) lower", isTotal:true },
        ],
        zeroCells:{ "a2_0":true,"a2_1":true,"a2_2":true,"a2_3":true,"a2_4":true,"a1_6":true },
      },
      {
        partLabel:"(b) Decision — Which Alternative Is Best?",
        type:"mcq",
        prompt:"Which alternative is best — make the rims internally or buy from the outside supplier?",
        choices:[
          { id:"a", text:"Buy (Alt 2) — the outside supplier price of $80/unit eliminates all variable and most fixed costs, saving the company money overall." },
          { id:"b", text:"Make (Alt 1) — internal production costs $820,000 vs. outsourcing at $900,000. Making is $80,000 cheaper because the production supervisor's $100,000 salary is unavoidable under either alternative, and the purchase price alone ($800,000) outweighs the savings from eliminating production costs ($720,000)." },
          { id:"c", text:"Buy (Alt 2) — the per-unit cost from the supplier ($80) is cheaper than internal variable cost ($60) on a per-unit basis." },
          { id:"d", text:"Both alternatives cost the same because the supervisor's salary balances out the cost difference." },
        ],
        answer:"b",
        explain:"The differential analysis shows Make costs $820,000 vs Buy $900,000 — a $80,000 advantage for making. Key insight: the supervisor's $100,000 salary is irrelevant (same under both alternatives). Cost savings from outsourcing = $720,000 in eliminated production costs. But the purchase price = $800,000. Net: outsourcing costs $80,000 MORE.",
      },
      {
        partLabel:"(c) Summary of Differential Analysis — Net Effect of Outsourcing",
        type:"summary_ladder",
        items:[
          { label:"Costs reduced by outsourcing production", header:true },
          { label:"Direct materials",                        val:200000 },
          { label:"Direct labor",                            val:100000 },
          { label:"Manufacturing overhead",                  val:300000 },
          { label:"Factory building and equipment lease",    val:70000  },
          { label:"Factory insurance",                       val:50000  },
          { label:"Total cost savings from outsourcing",     val:720000, isTotal:true },
          { label:"Increased costs from outsourcing",        header:true },
          { label:"Cost to purchase rims from supplier",     val:-800000 },
          { label:"Net effect on profit from outsourcing",   val:-80000, isTotal:true, bold:true },
        ],
      },
      {
        partLabel:"(d) Compare Formats — How Does (a) Differ from (c)?",
        type:"mcq",
        prompt:"Explain the key difference between the differential analysis format used in part (a) and the summary format used in part (c).",
        choices:[
          { id:"a", text:"Format (a) is a complete side-by-side comparison showing total costs under each alternative, including costs that are the same under both (like the supervisor's salary). Format (c) shows only what CHANGES between alternatives — the savings and the incremental costs — making the net effect immediately visible." },
          { id:"b", text:"Format (c) is more detailed than (a) because it shows more cost line items." },
          { id:"c", text:"Both formats are identical; only the column arrangement differs." },
          { id:"d", text:"Format (a) is used for small decisions; format (c) is for strategic decisions." },
        ],
        answer:"a",
        explain:"Format (a) includes ALL costs under each alternative — even irrelevant ones (like the supervisor salary that is identical under both). This gives a complete view but may obscure what actually matters. Format (c) focuses exclusively on the differential items: what changes? This makes the net effect ($80,000 cost increase from outsourcing) directly visible without wading through shared costs.",
      },
    ],
  },

  // Q31 — Product Line Decision: Durango (4 parts)
  {
    id:"q31", nav:"Q31",
    title:"Q31 · Product Line Decision — Durango Company",
    desc:"Durango Company monthly segmented income statement (three product lines):\n• Product A: Sales $37,500 | Variable costs $16,000 | CM $21,500 | Direct FC $19,500 | Allocated FC $3,750 | Profit (loss) $(1,750)\n• Product B: Sales $50,000 | Variable costs $27,500 | CM $22,500 | Direct FC $16,000 | Allocated FC $5,000 | Profit $1,500\n• Product C: Sales $12,500 | Variable costs $5,000 | CM $7,500 | Direct FC $3,500 | Allocated FC $1,250 | Profit $2,750\n• Total: Sales $100,000 | VC $48,500 | CM $51,500 | Direct FC $39,000 | Allocated FC $10,000 | Profit $2,500\nIf A is dropped: all variable + direct FC for A are eliminated. Allocated FC stays at $10,000 (redistributed to B and C).",
    type:"multi_part",
    sticky:true,
    parts:[
      {
        partLabel:"(a) Differential Analysis — Keep A vs. Eliminate A",
        type:"diff_table",
        alt1Label:"Keep All Lines (Alt 1)",
        alt2Label:"Eliminate Line A (Alt 2)",
        qualOpts:["Keep A (Alt 1) higher","Eliminate A (Alt 2) higher","Same"],
        rows:[
          { label:"Sales revenue",           a1:100000, a2:62500, diff:37500, qual:"Keep A (Alt 1) higher" },
          { label:"Variable costs",          a1:48500,  a2:32500, diff:16000, qual:"Keep A (Alt 1) higher" },
          { label:"Contribution margin",     a1:51500,  a2:30000, diff:21500, qual:"Keep A (Alt 1) higher" },
          { label:"Direct fixed costs",      a1:39000,  a2:19500, diff:19500, qual:"Keep A (Alt 1) higher" },
          { label:"Allocated fixed costs",   a1:10000,  a2:10000, diff:0,     qual:"Same" },
          { label:"Profit",                  a1:2500,   a2:500,   diff:2000,  qual:"Keep A (Alt 1) higher", isTotal:true },
        ],
        zeroCells:{},
      },
      {
        partLabel:"(b) Decision — Should Durango Drop Product Line A?",
        type:"mcq",
        prompt:"Which alternative is best — keep all product lines or drop product line A?",
        choices:[
          { id:"a", text:"Drop A (Alt 2) — Product A shows a $(1,750) loss on the segmented IS, and eliminating it would eliminate this loss." },
          { id:"b", text:"Keep A (Alt 1) — dropping A reduces profit from $2,500 to $500. Allocated fixed costs ($10,000) cannot be avoided and will be reassigned to B and C. The true savings from dropping A ($16,000 VC + $19,500 direct FC = $35,500) are less than the lost revenue ($37,500), resulting in a net $2,000 profit decrease." },
          { id:"c", text:"Drop A (Alt 2) — allocated fixed costs of $3,750 assigned to A are the main reason for the loss and can be saved." },
          { id:"d", text:"Keep A (Alt 1) — but only because dropping A would make B and C look worse on paper." },
        ],
        answer:"b",
        explain:"Differential analysis shows Keep A yields $2,500 profit vs $500 under Eliminate A — a $2,000 better outcome. The critical insight: $10,000 allocated fixed costs do NOT change regardless of the decision (they just get redistributed). The only true savings are variable costs ($16,000) and direct FC ($19,500) = $35,500, which is less than the $37,500 revenue lost. Net: dropping A reduces profit by $2,000.",
      },
      {
        partLabel:"(c) Summary of Differential Analysis — Net Effect of Dropping A",
        type:"summary_ladder",
        items:[
          { label:"Decrease in revenue from dropping product line A", val:-37500 },
          { label:"Cost savings from dropping product line A",        header:true },
          { label:"Variable costs saved",                             val:16000 },
          { label:"Direct fixed costs saved",                         val:19500 },
          { label:"Total cost savings",                               val:35500, isTotal:true },
          { label:"Net effect on profit from dropping product line A",val:-2000, isTotal:true, bold:true },
        ],
      },
      {
        partLabel:"(d) Why Is Product A's Reported Loss Misleading?",
        type:"mcq",
        prompt:"Explain why the $(1,750) loss shown for product line A in the segmented income statement might be misleading to management.",
        choices:[
          { id:"a", text:"The loss is correctly calculated and not misleading — all costs, including allocated fixed costs, are real costs that should be charged to each product line." },
          { id:"b", text:"Product A's $(1,750) reported loss includes $3,750 of allocated fixed costs that cannot be avoided by dropping A. If you exclude the allocated FC, Product A actually generates $21,500 CM − $19,500 direct FC = $2,000 of profit. The allocated FC creates a misleading picture that could lead to an incorrect drop decision." },
          { id:"c", text:"The loss is misleading because variable costs are too high — management should focus on reducing those instead of dropping the product line." },
          { id:"d", text:"The income statement is misleading because it includes revenues from future periods." },
        ],
        answer:"b",
        explain:"Allocated fixed costs are assigned to product lines based on a formula (here, based on sales). They are NOT avoidable costs — they remain at $10,000 whether A exists or not (redistributed to B and C). Product A's 'true' incremental contribution is CM ($21,500) less direct FC ($19,500) = $2,000 positive. The $(1,750) loss exists only because $3,750 of unavoidable allocated FC is charged to it.",
      },
    ],
  },

  // Q32 — Customer Decision: Accounting Associates (4 parts)
  {
    id:"q32", nav:"Q32",
    title:"Q32 · Customer Decision — Accounting Associates",
    desc:"Accounting Associates quarterly customer segmented income statement:\n• Sanchez: Sales $300,000 | VC $250,000 | CM $50,000 | Direct FC $15,000 | Allocated FC $6,000 | Profit $29,000\n• Nguyen: Sales $1,500,000 | VC $1,200,000 | CM $300,000 | Direct FC $315,000 | Allocated FC $30,000 | Loss $(45,000)\n• Decker: Sales $200,000 | VC $160,000 | CM $40,000 | Direct FC $10,000 | Allocated FC $4,000 | Profit $26,000\n• Total: Sales $2,000,000 | VC $1,610,000 | CM $390,000 | Direct FC $340,000 | Allocated FC $40,000 | Profit $10,000\nIf Nguyen is dropped: all variable + direct FC for Nguyen are eliminated. Total allocated FC remains at $40,000.",
    type:"multi_part",
    sticky:true,
    parts:[
      {
        partLabel:"(a) Differential Analysis — Keep All Customers vs. Drop Nguyen",
        type:"diff_table",
        alt1Label:"Keep All Customers (Alt 1)",
        alt2Label:"Drop Nguyen (Alt 2)",
        qualOpts:["Keep All (Alt 1) higher","Drop Nguyen (Alt 2) higher","Same"],
        rows:[
          { label:"Sales revenue",         a1:2000000, a2:500000, diff:1500000, qual:"Keep All (Alt 1) higher" },
          { label:"Variable costs",        a1:1610000, a2:410000, diff:1200000, qual:"Keep All (Alt 1) higher" },
          { label:"Contribution margin",   a1:390000,  a2:90000,  diff:300000,  qual:"Keep All (Alt 1) higher" },
          { label:"Direct fixed costs",    a1:340000,  a2:25000,  diff:315000,  qual:"Keep All (Alt 1) higher" },
          { label:"Allocated fixed costs", a1:40000,   a2:40000,  diff:0,       qual:"Same" },
          { label:"Profit (loss)",         a1:10000,   a2:25000,  diff:-15000,  qual:"Drop Nguyen (Alt 2) higher", isTotal:true },
        ],
        zeroCells:{},
      },
      {
        partLabel:"(b) Decision — Should Accounting Associates Drop Nguyen?",
        type:"mcq",
        prompt:"Which alternative is best — keep all customers or drop Nguyen?",
        choices:[
          { id:"a", text:"Keep all customers (Alt 1) — Nguyen generates $1,500,000 of revenue, which is critical to cover the firm's allocated fixed costs." },
          { id:"b", text:"Drop Nguyen (Alt 2) — Nguyen's contribution margin ($300,000) is far below his direct fixed costs ($315,000), meaning he generates a $15,000 deficit even before allocated FC. Dropping Nguyen increases total profit from $10,000 to $25,000." },
          { id:"c", text:"Keep all customers (Alt 1) — the $45,000 loss is a paper loss driven by allocated fixed costs, which don't reflect Nguyen's true impact." },
          { id:"d", text:"Drop Nguyen (Alt 2) — but only because of the large $(45,000) loss shown in the segmented income statement." },
        ],
        answer:"b",
        explain:"Unlike Q31, dropping Nguyen IS the right decision here. Nguyen's CM ($300,000) < Direct FC ($315,000) → he generates a $15,000 loss before allocated FC. Differential analysis confirms: dropping Nguyen increases profit from $10,000 to $25,000 (+$15,000). The allocated FC of $40,000 is irrelevant — it stays regardless. The test is always CM vs. Direct FC for drop decisions.",
      },
      {
        partLabel:"(c) Summary of Differential Analysis — Net Effect of Dropping Nguyen",
        type:"summary_ladder",
        items:[
          { label:"Decrease in revenue from dropping Nguyen account",  val:-1500000 },
          { label:"Cost savings from dropping Nguyen account",         header:true },
          { label:"Variable costs saved",                              val:1200000 },
          { label:"Direct fixed costs saved",                          val:315000  },
          { label:"Total cost savings",                                val:1515000, isTotal:true },
          { label:"Net effect on profit from dropping Nguyen",         val:15000,  isTotal:true, bold:true },
        ],
      },
      {
        partLabel:"(d) Effect on Other Customers After Dropping Nguyen",
        type:"mcq",
        prompt:"What happens to the reported profitability of Sanchez and Decker after dropping the Nguyen account?",
        choices:[
          { id:"a", text:"Sanchez and Decker become more profitable because they no longer compete with Nguyen for the firm's resources." },
          { id:"b", text:"Sanchez and Decker appear less profitable because Nguyen's $30,000 allocated FC gets redistributed to them, increasing their allocated FC charges. However, their ACTUAL profitability is unchanged — total costs are the same. It is a presentation distortion, not a real cost increase." },
          { id:"c", text:"Sanchez and Decker become more profitable because total allocated fixed costs decrease when Nguyen is dropped." },
          { id:"d", text:"Sanchez and Decker's profitability is completely unaffected since their revenue and variable costs do not change." },
        ],
        answer:"b",
        explain:"Total allocated fixed costs remain at $40,000 after dropping Nguyen. Without Nguyen's $30,000 share, that entire $40,000 must be distributed between Sanchez and Decker — their allocated FC charges increase. Their income statements look worse, but this is purely cosmetic: no actual cost increased. This illustrates why allocated fixed costs can distort segment profitability analysis.",
      },
    ],
  },

  // Q33 — Special Order: Idle Capacity (RadioCom)
  {
    id:"q33", nav:"Q33",
    title:"Q33 · Special Order (Idle Capacity) — RadioCom, Inc.",
    desc:"RadioCom produces and sells 5,000 VHF radios/month. Regular data:\n• Sales revenue: $100/unit | $500,000 total\n• Variable costs: $60/unit | $300,000 total\n• Contribution margin: $40/unit | $200,000 total\n• Fixed costs: $135,000 | Profit: $65,000\nCapacity: 7,000 units/month. Special order: 1,000 units at $75 each from Coast Guard Auxiliary. No effect on regular sales or fixed costs.",
    type:"multi_part",
    parts:[
      {
        partLabel:"(a) Differential Analysis — Reject vs. Accept Special Order",
        type:"diff_table",
        alt1Label:"Reject Order (Alt 1)",
        alt2Label:"Accept Special Order (Alt 2)",
        qualOpts:["Reject (Alt 1) higher","Accept (Alt 2) higher","Same"],
        rows:[
          { label:"Extra sales revenue",  a1:0, a2:75000, diff:-75000, qual:"Accept (Alt 2) higher" },
          { label:"Extra variable costs", a1:0, a2:60000, diff:-60000, qual:"Accept (Alt 2) higher" },
          { label:"Extra fixed costs",    a1:0, a2:0,     diff:0,      qual:"Same" },
          { label:"Extra profit",         a1:0, a2:15000, diff:-15000, qual:"Accept (Alt 2) higher", isTotal:true },
        ],
        zeroCells:{ "a1_0":true,"a1_1":true,"a1_2":true,"a1_3":true,"a2_2":true },
      },
      {
        partLabel:"(b) Summary — Net Effect of Accepting the Special Order",
        type:"summary_ladder",
        items:[
          { label:"Increase in revenue from special order",        val:75000  },
          { label:"Increase in variable costs from special order", val:-60000 },
          { label:"Increase in profit from accepting",             val:15000, isTotal:true, bold:true },
        ],
      },
    ],
  },

  // Q34 — Special Order: Full Capacity (RadioCom)
  {
    id:"q34", nav:"Q34",
    title:"Q34 · Special Order (Full Capacity) — RadioCom, Inc.",
    desc:"Same RadioCom setup, but capacity is EXACTLY 5,000 units/month (at full capacity).\n• Regular: 5,000 units at $100/unit | VC $60/unit | FC $135,000 | Profit $65,000\n• Special order: 1,000 units at $75 each from Coast Guard Auxiliary\n• Accepting the special order would require reducing regular customer sales by 1,000 units",
    type:"multi_part",
    parts:[
      {
        partLabel:"(a) Differential Analysis — Reject vs. Accept (Full Capacity)",
        type:"diff_table",
        alt1Label:"Reject Order (Alt 1)",
        alt2Label:"Accept Special Order (Alt 2)",
        qualOpts:["Reject (Alt 1) higher","Accept (Alt 2) higher","Same"],
        rows:[
          { label:"Sales revenue",       a1:500000, a2:475000, diff:25000, qual:"Reject (Alt 1) higher" },
          { label:"Variable costs",      a1:300000, a2:300000, diff:0,     qual:"Same" },
          { label:"Contribution margin", a1:200000, a2:175000, diff:25000, qual:"Reject (Alt 1) higher" },
          { label:"Fixed costs",         a1:135000, a2:135000, diff:0,     qual:"Same" },
          { label:"Profit",              a1:65000,  a2:40000,  diff:25000, qual:"Reject (Alt 1) higher", isTotal:true },
        ],
        zeroCells:{},
      },
      {
        partLabel:"(b) Summary — Net Effect of Accepting the Special Order (Full Capacity)",
        type:"summary_ladder",
        items:[
          { label:"Decrease in revenue from lost regular sales",     val:-25000 },
          { label:"Net effect on profit from accepting special order", val:-25000, isTotal:true, bold:true },
        ],
      },
    ],
  },

  // Q35 — Target Costing
  {
    id:"q35", nav:"Q35",
    title:"Q35 · Target Costing — Quality Sounds, Inc.",
    desc:"Quality Sounds, Inc. plans to produce a new type of headphones.\n• Expected selling price: $150 per pair\n• Required profit: 45% of selling price\n\nCalculate the target cost per pair.",
    type:"calc_steps",
    steps:[
      { label:"Expected selling price per pair",            correct:150,   tol:0.01 },
      { label:"Required profit (45% of selling price)",     correct:67.50, tol:0.05 },
      { label:"Target cost per pair (maximum allowable)",   correct:82.50, tol:0.05, isTotal:true },
    ],
  },
];

// ─── SCORING ──────────────────────────────────────────────────────────────────
function scoreDiffTable(part, ans, pfx) {
  let total=0, correct=0;
  part.rows.forEach((row,ri) => {
    const zc = part.zeroCells || {};
    // alt1
    if (!zc[`a1_${ri}`]) { total++; if (closeEq(ans[`${pfx}a1_${ri}`], row.a1)) correct++; }
    // alt2
    if (!zc[`a2_${ri}`]) { total++; if (closeEq(ans[`${pfx}a2_${ri}`], row.a2)) correct++; }
    // diff
    total++; if (closeEq(ans[`${pfx}diff_${ri}`], row.diff, 1)) correct++;
    // qual (dropdown)
    total++; if (ans[`${pfx}qual_${ri}`] === row.qual) correct++;
  });
  return { total, correct };
}

function scoreSummaryLadder(part, ans, pfx) {
  let total=0, correct=0;
  part.items.forEach((item,i) => {
    if (item.header) return;
    total++;
    if (closeEq(ans[`${pfx}sl_${i}`], item.val, 1)) correct++;
  });
  return { total, correct };
}

function scoreCustomerAlloc(part, ans, pfx) {
  let total=0, correct=0;
  part.rows.forEach((row,ri) => {
    row.vals.forEach((v,ci) => {
      total++;
      if (closeEq(ans[`${pfx}ca_${ri}_${ci}`], v, 1)) correct++;
    });
  });
  return { total, correct };
}

function scoreCalcSteps(steps, ans, pfx) {
  let total=0, correct=0;
  steps.forEach((step,i) => {
    total++;
    if (closeEq(ans[`${pfx}cs_${i}`], step.correct, step.tol ?? 1)) correct++;
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
    q.parts.forEach((part,pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type === "diff_table")      add(scoreDiffTable(part, ans, pfx));
      if (part.type === "summary_ladder")  add(scoreSummaryLadder(part, ans, pfx));
      if (part.type === "customer_alloc")  add(scoreCustomerAlloc(part, ans, pfx));
      if (part.type === "calc_steps")      add(scoreCalcSteps(part.steps, ans, pfx));
      if (part.type === "mcq") {
        total++; if (ans[`${pfx}mcq`] === part.answer) correct++;
      }
    });
  }
  return { total, correct };
}

function allFilled(q, ans) {
  const checkDiff = (part, pfx) => {
    const zc = part.zeroCells || {};
    return part.rows.every((row,ri) =>
      (zc[`a1_${ri}`] || !!ans[`${pfx}a1_${ri}`]) &&
      (zc[`a2_${ri}`] || !!ans[`${pfx}a2_${ri}`]) &&
      !!ans[`${pfx}diff_${ri}`] && !!ans[`${pfx}qual_${ri}`]
    );
  };
  const checkSL = (part, pfx) =>
    part.items.every((item,i) => item.header || !!ans[`${pfx}sl_${i}`]);
  const checkCA = (part, pfx) =>
    part.rows.every((row,ri) => row.vals.every((_,ci) => !!ans[`${pfx}ca_${ri}_${ci}`]));
  const checkCS = (steps, pfx) =>
    steps.every((_,i) => !!ans[`${pfx}cs_${i}`]);

  if (q.type === "calc_steps") return checkCS(q.steps, `${q.id}_`);
  if (q.type === "multi_part") {
    return q.parts.every((part,pi) => {
      const pfx = `${q.id}_p${pi}_`;
      if (part.type === "diff_table")     return checkDiff(part, pfx);
      if (part.type === "summary_ladder") return checkSL(part, pfx);
      if (part.type === "customer_alloc") return checkCA(part, pfx);
      if (part.type === "calc_steps")     return checkCS(part.steps, pfx);
      if (part.type === "mcq")            return !!ans[`${pfx}mcq`];
      return true;
    });
  }
  return true;
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────

// ZeroCell — structural $0, not editable
function ZeroCell() {
  return (
    <span style={{
      display:"block", textAlign:"right", ...MONO, fontSize:13,
      color:"#94a3b8", background:"#f8fafc", border:"1.5px solid #e2e8f0",
      borderRadius:6, padding:"5px 10px", minWidth:120,
    }}>$0</span>
  );
}

// NumInput — module scope, handles negative values
function NumInput({ sk, ans, setAns, correct, tol=1, revealed, width=120, allowNeg=false }) {
  const raw = parseInput(ans[sk]||"");
  const ok  = revealed && raw !== null && Math.abs(raw - correct) <= tol;
  const bad = revealed && ans[sk] && (raw===null || Math.abs(raw-correct)>tol);
  const noA = revealed && !ans[sk];
  const correctStr = allowNeg ? fmtD(correct) : `$${Math.abs(correct).toLocaleString()}`;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <input
        value={ans[sk]||""} disabled={revealed} placeholder="0"
        onChange={e => !revealed && setAns(p => ({...p, [sk]: fmtNum(e.target.value)}))}
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
      {ok        && <span style={{ color:"#10b981", fontWeight:700, fontSize:14, flexShrink:0 }}>✓</span>}
      {(bad||noA)&& <span style={{ color:"#ef4444", fontSize:11, fontWeight:600, flexShrink:0, whiteSpace:"nowrap" }}>→ {correctStr}</span>}
    </div>
  );
}

// QualSelect — qualifier dropdown (Higher/Lower/Same)
function QualSelect({ sk, ans, setAns, options, correct, revealed }) {
  const val = ans[sk]||"";
  const ok  = revealed && val === correct;
  const bad = revealed && val && val !== correct;
  const noA = revealed && !val;
  return (
    <div>
      <select value={val} disabled={revealed}
        onChange={e => !revealed && setAns(p => ({...p,[sk]:e.target.value}))}
        style={{
          width:"100%", padding:"5px 8px", borderRadius:6, fontSize:11.5, cursor:"pointer",
          border:`1.5px solid ${ok?"#10b981":bad||noA?"#ef4444":"#cbd5e1"}`,
          background:ok?"#f0fdf4":bad||noA?"#fef2f2":"#fff",
          color:val?"#0f172a":"#94a3b8", outline:"none",
        }}>
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {(bad||noA) && <div style={{ fontSize:10, color:"#ef4444", fontWeight:600, marginTop:2 }}>→ {correct}</div>}
    </div>
  );
}

// ─── DIFF TABLE ───────────────────────────────────────────────────────────────
// Module-scope component: 4-col differential analysis table
function DiffTableBody({ part, ans, setAns, revealed, prefix }) {
  const zc = part.zeroCells || {};
  const colW = "1fr 140px 140px 140px 170px";
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", overflowX:"auto" }}>
      {/* Column headers */}
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:colW, minWidth:720 }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}>Cost Item</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11, textAlign:"right" }}>{part.alt1Label}</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11, textAlign:"right" }}>{part.alt2Label}</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11, textAlign:"right" }}>Difference</div>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11 }}>Higher / Lower</div>
      </div>
      {/* Data rows */}
      {part.rows.map((row, ri) => {
        const isTotal = !!row.isTotal;
        const bg = isTotal ? "#f1f5f9" : ri%2===0 ? "#fff" : "#f8fafc";
        return (
          <div key={ri} style={{
            display:"grid", gridTemplateColumns:colW, minWidth:720,
            background:bg,
            borderBottom: ri<part.rows.length-1 ? "1px solid #f0f4f8" : "none",
            borderTop: isTotal ? "2px solid #cbd5e1" : "none",
            alignItems:"center",
          }}>
            {/* Label */}
            <div style={{ padding:"8px 12px", fontSize:13, fontWeight:isTotal?700:400,
              color:isTotal?"#0f172a":"#374151" }}>{row.label}</div>
            {/* Alt 1 */}
            <div style={{ padding:"4px 8px", display:"flex", justifyContent:"flex-end" }}>
              {zc[`a1_${ri}`] ? <ZeroCell /> :
                <NumInput sk={`${prefix}a1_${ri}`} ans={ans} setAns={setAns}
                  correct={row.a1} tol={1} revealed={revealed} width={120} />}
            </div>
            {/* Alt 2 */}
            <div style={{ padding:"4px 8px", display:"flex", justifyContent:"flex-end" }}>
              {zc[`a2_${ri}`] ? <ZeroCell /> :
                <NumInput sk={`${prefix}a2_${ri}`} ans={ans} setAns={setAns}
                  correct={row.a2} tol={1} revealed={revealed} width={120} />}
            </div>
            {/* Difference (can be negative) */}
            <div style={{ padding:"4px 8px", display:"flex", justifyContent:"flex-end" }}>
              <NumInput sk={`${prefix}diff_${ri}`} ans={ans} setAns={setAns}
                correct={row.diff} tol={1} revealed={revealed} width={120} allowNeg={true} />
            </div>
            {/* Qualifier dropdown */}
            <div style={{ padding:"4px 8px" }}>
              <QualSelect sk={`${prefix}qual_${ri}`} ans={ans} setAns={setAns}
                options={part.qualOpts} correct={row.qual} revealed={revealed} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SUMMARY LADDER ───────────────────────────────────────────────────────────
// Module-scope: vertical incremental net-effect summary
function SummaryLadderBody({ part, ans, setAns, revealed, prefix }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      {part.items.map((item, i) => {
        if (item.header) {
          return (
            <div key={i} style={{ padding:"7px 14px", background:"#f1f5f9",
              borderBottom:"1px solid #e2e8f0", fontSize:12.5, fontWeight:700, color:"#475569" }}>
              {item.label}
            </div>
          );
        }
        const isTotal = !!item.isTotal;
        const isBold  = !!item.bold || isTotal;
        const bg = isTotal ? "#f1f5f9" : i%2===0 ? "#fff" : "#f8fafc";
        const sk = `${prefix}sl_${i}`;
        return (
          <div key={i} style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:`${isTotal?9:7}px 14px`, background:bg,
            borderBottom: i<part.items.length-1 ? "1px solid #f1f5f9":"none",
            borderTop: isTotal ? "2px solid #cbd5e1":"none",
            transition:"background .15s",
          }}>
            <span style={{ fontSize:13, color:isBold?"#0f172a":"#374151", fontWeight:isBold?700:400 }}>
              {item.label}
            </span>
            <NumInput sk={sk} ans={ans} setAns={setAns}
              correct={item.val} tol={1} revealed={revealed} width={130} allowNeg={true} />
          </div>
        );
      })}
    </div>
  );
}

// ─── CUSTOMER ALLOC ───────────────────────────────────────────────────────────
// Module-scope: Q24 simple 2-customer allocation table
function CustomerAllocBody({ part, ans, setAns, revealed, prefix }) {
  const cols = `1fr ${part.customers.map(()=>"150px").join(" ")}`;
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ ...SLATE, display:"grid", gridTemplateColumns:cols }}>
        <div style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:11.5 }}></div>
        {part.customers.map(c => (
          <div key={c} style={{ padding:"8px 12px", color:"#fff", fontWeight:700, fontSize:12, textAlign:"right" }}>{c}</div>
        ))}
      </div>
      {/* Data rows */}
      {part.rows.map((row, ri) => {
        const isTotal = !!row.isTotal;
        const bg = isTotal ? "#f1f5f9" : ri%2===0 ? "#fff" : "#f8fafc";
        return (
          <div key={ri} style={{
            display:"grid", gridTemplateColumns:cols,
            background:bg,
            borderBottom: ri<part.rows.length-1?"1px solid #f1f5f9":"none",
            borderTop: isTotal?"2px solid #cbd5e1":"none",
            alignItems:"center",
          }}>
            <div style={{ padding:"8px 12px", fontSize:13, fontWeight:isTotal?700:400,
              color:isTotal?"#0f172a":"#374151" }}>{row.label}</div>
            {row.vals.map((v, ci) => (
              <div key={ci} style={{ padding:"4px 8px", display:"flex", justifyContent:"flex-end" }}>
                <NumInput sk={`${prefix}ca_${ri}_${ci}`} ans={ans} setAns={setAns}
                  correct={v} tol={1} revealed={revealed} width={120} allowNeg={v<0} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── CALC STEPS ───────────────────────────────────────────────────────────────
// Module-scope: simple sequential calculation chain (Q35)
function CalcStepRow({ step, idx, ans, setAns, revealed, prefix, isLast }) {
  const sk = `${prefix}cs_${idx}`;
  const isTotal = !!step.isTotal;
  const bg = isTotal ? "#f1f5f9" : idx%2===0 ? "#fff" : "#f8fafc";
  return (
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:`${isTotal?8:6}px 14px`, background:bg,
      borderBottom: isLast?"none":"1px solid #f1f5f9",
      borderTop: isTotal?"1.5px solid #cbd5e1":"none",
      transition:"background .15s",
    }}>
      <span style={{ fontSize:13, color:isTotal?"#0f172a":"#374151", fontWeight:isTotal?700:400 }}>
        {step.label}
      </span>
      <NumInput sk={sk} ans={ans} setAns={setAns}
        correct={step.correct} tol={step.tol??1} revealed={revealed}
        width={120} allowNeg={false} />
    </div>
  );
}

function CalcStepsBody({ steps, ans, setAns, revealed, prefix }) {
  return (
    <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
      {steps.map((step, i) => (
        <CalcStepRow key={i} step={step} idx={i} ans={ans} setAns={setAns}
          revealed={revealed} prefix={prefix} isLast={i===steps.length-1} />
      ))}
    </div>
  );
}

// ─── MCQ ──────────────────────────────────────────────────────────────────────
function MCQBody({ part, ans, setAns, revealed, stateKey }) {
  const k = stateKey;
  const sel = ans[k]||"";
  return (
    <div>
      <div style={{ fontSize:13.5, color:"#0f172a", lineHeight:1.5, marginBottom:12 }}>{part.prompt}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {part.choices.map(ch => {
          const isSel   = sel===ch.id;
          const isRight = revealed && ch.id===part.answer;
          const isWrong = revealed && isSel && !isRight;
          const bd = isRight?"#10b981":isWrong?"#ef4444":isSel?"#2563eb":"#e2e8f0";
          const bg = isRight?"#f0fdf4":isWrong?"#fef2f2":isSel?"#eff6ff":"#fff";
          const cl = isRight?"#065f46":isWrong?"#7f1d1d":"#0f172a";
          return (
            <button key={ch.id} disabled={revealed}
              onClick={() => !revealed && setAns(p=>({...p,[k]:ch.id}))}
              style={{ textAlign:"left", padding:"11px 14px", borderRadius:10,
                border:`1.5px solid ${bd}`, background:bg, cursor:revealed?"default":"pointer",
                display:"flex", gap:10, alignItems:"flex-start", transition:"all .15s" }}>
              <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, marginTop:1,
                border:`2px solid ${isSel?"#2563eb":"#cbd5e1"}`,
                background:isSel?"#2563eb":"transparent" }} />
              <span style={{ fontSize:13, lineHeight:1.4, color:cl }}>
                <span style={{ fontWeight:700, marginRight:6 }}>{ch.id.toUpperCase()}.</span>{ch.text}
              </span>
              {isRight && <span style={{ marginLeft:"auto", color:"#10b981", fontWeight:700, flexShrink:0 }}>✓</span>}
              {isWrong && <span style={{ marginLeft:"auto", color:"#ef4444", fontWeight:700, flexShrink:0 }}>✗</span>}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div style={{ marginTop:10, padding:"12px 14px", borderRadius:8,
          border:"1px solid #e2e8f0", background:"#f8fafc", fontSize:13, lineHeight:1.6 }}>
          <strong>Explanation: </strong>{part.explain}
        </div>
      )}
    </div>
  );
}

// ─── MULTI PART WRAPPER ───────────────────────────────────────────────────────
function MultiPartBody({ q, ans, setAns, revealed }) {
  return (
    <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:14 }}>
      {q.parts.map((part, pi) => {
        const pfx = `${q.id}_p${pi}_`;
        return (
          <div key={pi} style={{ border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
            <div style={{ ...SLATE, padding:"8px 12px" }}>
              <span style={{ fontSize:12.5, fontWeight:700, color:"#fff" }}>{part.partLabel}</span>
            </div>
            <div style={{ padding:"12px" }}>
              {part.type==="diff_table"     && <DiffTableBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="summary_ladder" && <SummaryLadderBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="customer_alloc" && <CustomerAllocBody part={part} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="calc_steps"     && <CalcStepsBody steps={part.steps} ans={ans} setAns={setAns} revealed={revealed} prefix={pfx} />}
              {part.type==="mcq"            && <MCQBody part={part} ans={ans} setAns={setAns} revealed={revealed} stateKey={`${pfx}mcq`} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── QUESTION BODY DISPATCHER ─────────────────────────────────────────────────
function QuestionBody({ q, ans, setAns, revealed }) {
  if (q.type==="multi_part") return <MultiPartBody q={q} ans={ans} setAns={setAns} revealed={revealed} />;
  if (q.type==="calc_steps") {
    return (
      <div style={{ padding:"0 16px 16px" }}>
        <CalcStepsBody steps={q.steps} ans={ans} setAns={setAns} revealed={revealed} prefix={`${q.id}_`} />
      </div>
    );
  }
  return null;
}

// ─── CHROME COMPONENTS ───────────────────────────────────────────────────────

function Confetti({ active }) {
  const ref=useRef(null), af=useRef(null);
  useEffect(()=>{
    if(!active) return;
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d");
    const W=c.width=c.parentElement.offsetWidth;
    const H=c.height=c.parentElement.offsetHeight;
    const cols=["#0ea5e9","#10b981","#f59e0b","#f43f5e","#a855f7","#22d3ee","#84cc16"];
    const ps=Array.from({length:200},()=>({
      x:Math.random()*W,y:-Math.random()*H*.5,w:Math.random()*10+4,h:Math.random()*6+2,
      vx:(Math.random()-.5)*7,vy:Math.random()*5+1,rot:Math.random()*360,rv:(Math.random()-.5)*12,
      col:cols[~~(Math.random()*cols.length)],life:1,dec:.002+Math.random()*.003,
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
    return ()=>cancelAnimationFrame(af.current);
  },[active]);
  if(!active) return null;
  return <canvas ref={ref} style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:50 }} />;
}

function NavRow({ questions, cur, setCur, grades }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:6,padding:"10px 14px",
      flexWrap:"wrap",background:"#f1f5f9",borderBottom:"1px solid #e2e8f0" }}>
      <button onClick={()=>setCur(c=>Math.max(0,c-1))} disabled={cur===0}
        style={{ width:28,height:28,borderRadius:"50%",border:"1.5px solid #d1d5db",
          background:cur===0?"#f9fafb":"#fff",color:cur===0?"#d1d5db":"#374151",
          fontSize:16,cursor:cur===0?"default":"pointer",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
      {questions.map((q,i)=>{
        const g=grades[q.id], isCur=cur===i;
        const bg=isCur?"#fff":!g?"#64748b":g.correct===g.total?"#10b981":"#ef4444";
        return (
          <button key={q.id} onClick={()=>setCur(i)}
            style={{ minWidth:isCur?72:54,height:36,padding:"0 10px",borderRadius:isCur?8:20,
              background:bg,border:isCur?`2px solid ${TEAL}`:"2px solid transparent",
              color:isCur?"#0f172a":"#fff",cursor:"pointer",
              fontSize:isCur?12.5:11.5,fontWeight:700,transition:"all .15s",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              boxShadow:isCur?`0 2px 8px ${TEAL}44`:"none",lineHeight:1.2 }}>
            <span>{q.nav}</span>
            {g&&!isCur&&<span style={{ fontSize:9,opacity:.85 }}>{g.correct}/{g.total}</span>}
          </button>
        );
      })}
      <button onClick={()=>setCur(c=>Math.min(questions.length-1,c+1))} disabled={cur===questions.length-1}
        style={{ width:28,height:28,borderRadius:"50%",border:"1.5px solid #d1d5db",
          background:cur===questions.length-1?"#f9fafb":"#fff",
          color:cur===questions.length-1?"#d1d5db":"#374151",
          fontSize:16,cursor:cur===questions.length-1?"default":"pointer",flexShrink:0,
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
          onClick={()=>setOpen(o=>!o)}>
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
            {q.desc.split("\n").map((l,i)=><div key={i}>{l}</div>)}
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
      <div style={{ color:"#475569" }}>{q.desc.split("\n").map((l,i)=><div key={i}>{l}</div>)}</div>
    </div>
  );
}

function ResultsScreen({ grades, onRetry, onReview }) {
  const total   = Object.values(grades).reduce((s,g)=>s+g.total,0);
  const correct = Object.values(grades).reduce((s,g)=>s+g.correct,0);
  const p = pctCalc(correct,total);
  const c = p===100?"#10b981":p>=80?"#d97706":p>=60?TEAL:"#ef4444";
  const wrongCount = QUESTIONS.filter(q=>grades[q.id]&&grades[q.id].correct<grades[q.id].total).length;
  return (
    <div style={{ position:"relative",overflow:"hidden" }}>
      <Confetti active={p===100} />
      <div style={{ textAlign:"center",padding:"48px 24px 32px" }}>
        <div style={{ fontSize:50,marginBottom:8 }}>{p===100?"🎉":p>=80?"🔥":p>=60?"👍":"💪"}</div>
        <div style={{ fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1.5,
          textTransform:"uppercase",marginBottom:12 }}>Chapter 7 · Final Score</div>
        <div style={{ display:"inline-flex",flexDirection:"column",alignItems:"center",
          padding:"20px 52px",borderRadius:12,background:"#f8fafc",border:`2px solid ${c}22`,marginBottom:20 }}>
          <div style={{ fontSize:54,fontWeight:800,color:c,lineHeight:1 }}>
            {correct}<span style={{ fontSize:26,color:"#94a3b8" }}>/{total}</span>
          </div>
          <div style={{ fontSize:14,color:c,marginTop:4,fontWeight:700 }}>{p}%</div>
        </div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:24 }}>
          {QUESTIONS.map(q=>{
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

// ─── MAIN APP — zero component definitions inside ─────────────────────────────
export default function Ch07Quiz({ onComplete } = {}) {
  const [savedDraft] = useState(() => {
    const draft = loadQuizDraft("ch07");
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) return null;
    const grades = draft.graded;
    const isComplete = grades && typeof grades === "object" && QUESTIONS.every(q => grades[q.id]);
    if (isComplete) {
      clearQuizDraft("ch07");
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

  useEffect(()=>{ setStickyOpen(true); }, [cur]);

  const gradeThis = () => setGraded(p => ({...p, [q.id]: scoreQuestion(q, ans)}));
  const clearThis = () => {
    setGraded(p => { const n={...p}; delete n[q.id]; return n; });
    setAns(p => { const n={...p}; Object.keys(n).filter(k=>k.startsWith(q.id+"_")).forEach(k=>delete n[k]); return {...n}; });
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
      chapterId: "ch07",
      chapterLabel: "Chapter 7",
      ...totals,
      percent: pctCalc(totals.correct, totals.total),
      completedAt: new Date().toISOString(),
    });
  }, [screen, graded, onComplete]);

  useEffect(() => {
    if (screen === "results") clearQuizDraft("ch07");
  }, [screen]);

  useEffect(() => {
    if (screen === "results") return;
    saveQuizDraft("ch07", { cur, ans, graded, screen, revIdx, stickyOpen });
  }, [cur, ans, graded, screen, revIdx, stickyOpen]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing:border-box; }
    @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    select { -webkit-appearance:auto; appearance:auto; }
    input:focus,select:focus { box-shadow:0 0 0 3px rgba(13,148,136,.18)!important; outline:none!important; }
    button:hover:not(:disabled) { filter:brightness(.9); }
    ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
  `;
  const wrap  = { minHeight:"100vh",background:"#e9eef5",color:"#0f172a",fontFamily:"'DM Sans',system-ui,sans-serif" };
  const inner = { maxWidth:1080,margin:"0 auto",padding:"24px 16px" };
  const card  = { background:"#f1f5f9",borderRadius:12,border:"1.5px solid #e2e8f0",overflow:"hidden",boxShadow:"0 2px 16px rgba(0,0,0,.07)" };

  const g = graded[q.id];
  const scoreBadge = isRevealed && g ? (()=>{
    const p=pctCalc(g.correct,g.total), c=p===100?"#10b981":p>=70?"#d97706":"#ef4444";
    return <span style={{ fontSize:13,fontWeight:700,color:c,background:c+"18",
      padding:"4px 12px",borderRadius:20,border:`1px solid ${c}33` }}>{g.correct}/{g.total} · {p}%</span>;
  })() : null;

  // Review screen
  if (screen==="review" && wrongQs.length>0) {
    const rq = wrongQs[revIdx];
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={{ marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
          <h1 style={{ fontWeight:800,fontSize:20,margin:0 }}>Review — Wrong Answers</h1>
          <span style={{ fontSize:12,background:"#fff",padding:"2px 10px",borderRadius:20,
            border:"1.5px solid #e2e8f0",fontWeight:600,color:"#6b7280" }}>{revIdx+1}/{wrongQs.length}</span>
          <button onClick={()=>setScreen("results")}
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
            <QuestionBody q={rq} ans={ans} setAns={()=>{}} revealed={true} />
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid #e2e8f0" }}>
            <button onClick={()=>setRevIdx(i=>Math.max(0,i-1))} disabled={revIdx===0}
              style={{ padding:"8px 20px",borderRadius:8,background:revIdx===0?"#9ca3af":TEAL,
                border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:revIdx===0?"not-allowed":"pointer" }}>← Prev</button>
            <button onClick={()=>setRevIdx(i=>Math.min(wrongQs.length-1,i+1))} disabled={revIdx===wrongQs.length-1}
              style={{ padding:"8px 20px",borderRadius:8,background:revIdx===wrongQs.length-1?"#9ca3af":TEAL,
                border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:revIdx===wrongQs.length-1?"not-allowed":"pointer" }}>Next →</button>
          </div>
        </div>
      </div></div>
    );
  }

  // Results screen
  if (screen==="results") {
    return (
      <div style={wrap}><style>{CSS}</style><div style={inner}>
        <div style={card}><ResultsScreen grades={graded} onRetry={resetAll}
          onReview={()=>{ setRevIdx(0); setScreen("review"); }} /></div>
      </div></div>
    );
  }

  // Quiz screen
  return (
    <div style={wrap}><style>{CSS}</style><div style={inner}>
      <div style={{ marginBottom:14 }}>
        <h1 style={{ fontWeight:800,fontSize:22,margin:0 }}>Chapter 7 — How Do Managers Make Decisions?</h1>
        <p style={{ fontSize:12,color:"#64748b",margin:"3px 0 0" }}>
          Q22 · Q24 · Q25 · Q30 · Q31 · Q32 · Q33 · Q34 · Q35 — Differential Analysis: Make-or-Buy, Special Orders, Product Lines, Customer Decisions & Target Costing
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
            {cur<QUESTIONS.length-1
              ? <button onClick={()=>setCur(c=>c+1)}
                  style={{ padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                    cursor:"pointer",background:"#10b981",color:"#fff" }}>Next →</button>
              : <button onClick={()=>{ if(allGraded) setScreen("results"); else { gradeThis(); setTimeout(()=>setScreen("results"),100); } }}
                  style={{ padding:"9px 22px",borderRadius:8,fontSize:13.5,fontWeight:600,border:"none",
                    cursor:"pointer",background:"#10b981",color:"#fff" }}>Final Score</button>
            }
          </div>
        </div>
      </div>

      {allGraded && screen==="quiz" && (
        <div style={{ marginTop:14,textAlign:"center" }}>
          <button onClick={()=>setScreen("results")}
            style={{ padding:"10px 40px",borderRadius:8,fontSize:14,fontWeight:600,
              border:"none",cursor:"pointer",background:"#10b981",color:"#fff" }}>See Final Score</button>
        </div>
      )}
    </div></div>
  );
}
