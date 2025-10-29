MATCH (c:Client {clientId: row.Client})
CREATE (c)-[:HAS_TOTAL_SUMMARY]->(:ClientSummary {
  totalAmount: toFloat(row.totalAmount),
  txCount: toInteger(row.txCount)
});


MATCH (c:Client {clientId: row.Client})-[:HAS_TOTAL_SUMMARY]->(cs)
MATCH (dp:DepositProduct {name: row.DepProduct})
CREATE (cs)-[:DRILLDOWN_TO]->(a1:AggSummary {
  level:1,
  totalAmount: toFloat(row.totalAmount),
  txCount: toInteger(row.txCount)
})
CREATE (a1)-[:FOR_DEPOSIT_PRODUCT]->(dp);



MATCH (c:Client {clientId: row.Client})-[:HAS_TOTAL_SUMMARY]->(cs)
MATCH (cs)-[:DRILLDOWN_TO]->(a1:AggSummary {level:1})-[:FOR_DEPOSIT_PRODUCT]->(dp:DepositProduct {name: row.DepProduct})
MATCH (f:Flow {direction: row.Flow})
CREATE (a1)-[:DRILLDOWN_TO]->(a2:AggSummary {
  level:2,
  totalAmount: toFloat(row.totalAmount),
  txCount: toInteger(row.txCount)
})
CREATE (a2)-[:FOR_FLOW]->(f);



MATCH (c:Client {clientId: row.Client})-[:HAS_TOTAL_SUMMARY]->(cs)
MATCH (cs)-[:DRILLDOWN_TO]->(a1)-[:FOR_DEPOSIT_PRODUCT]->(dp:DepositProduct {name: row.DepProduct})
MATCH (a1)-[:DRILLDOWN_TO]->(a2)-[:FOR_FLOW]->(f:Flow {direction: row.Flow})
MATCH (ch:Channel {name: row.Channel})
CREATE (a2)-[:DRILLDOWN_TO]->(a3:AggSummary {
  level:3,
  totalAmount: toFloat(row.totalAmount),
  txCount: toInteger(row.txCount)
})
CREATE (a3)-[:FOR_CHANNEL]->(ch);



MATCH (c:Client {clientId: row.Client})-[:HAS_TOTAL_SUMMARY]->(cs)
MATCH (cs)-[:DRILLDOWN_TO]->(a1)-[:FOR_DEPOSIT_PRODUCT]->(dp:DepositProduct {name: row.DepProduct})
MATCH (a1)-[:DRILLDOWN_TO]->(a2)-[:FOR_FLOW]->(f:Flow {direction: row.Flow})
MATCH (a2)-[:DRILLDOWN_TO]->(a3)-[:FOR_CHANNEL]->(ch:Channel {name: row.Channel})
MATCH (pp:PaymentProduct {name: row.PayProduct})
CREATE (a3)-[:DRILLDOWN_TO]->(a4:AggSummary {
  level:4,
  totalAmount: toFloat(row.totalAmount),
  txCount: toInteger(row.txCount)
})
CREATE (a4)-[:FOR_PAYMENT_PRODUCT]->(pp);



MATCH (c:Client {clientId: row.Client})-[:HAS_TOTAL_SUMMARY]->(cs)
MATCH (cs)-[:DRILLDOWN_TO]->(a1)-[:FOR_DEPOSIT_PRODUCT]->(dp:DepositProduct {name: row.DepProduct})
MATCH (a1)-[:DRILLDOWN_TO]->(a2)-[:FOR_FLOW]->(f:Flow {direction: row.Flow})
MATCH (a2)-[:DRILLDOWN_TO]->(a3)-[:FOR_CHANNEL]->(ch:Channel {name: row.Channel})
MATCH (a3)-[:DRILLDOWN_TO]->(a4)-[:FOR_PAYMENT_PRODUCT]->(pp:PaymentProduct {name: row.PayProduct})
MATCH (fi:FinancialInstitution {name: row.FI})
CREATE (a4)-[:DRILLDOWN_TO]->(a5:AggSummary {
  level:5,
  totalAmount: toFloat(row.totalAmount),
  txCount: toInteger(row.txCount)
})
CREATE (a5)-[:FOR_FI]->(fi);




MATCH (c:Client {clientId: row.Client})-[:HAS_TOTAL_SUMMARY]->(cs)
MATCH (cs)-[:DRILLDOWN_TO]->(a1)-[:FOR_DEPOSIT_PRODUCT]->(dp:DepositProduct {name: row.DepProduct})
MATCH (a1)-[:DRILLDOWN_TO]->(a2)-[:FOR_FLOW]->(f:Flow {direction: row.Flow})
MATCH (a2)-[:DRILLDOWN_TO]->(a3)-[:FOR_CHANNEL]->(ch:Channel {name: row.Channel})
MATCH (a3)-[:DRILLDOWN_TO]->(a4)-[:FOR_PAYMENT_PRODUCT]->(pp:PaymentProduct {name: row.PayProduct})
MATCH (a4)-[:DRILLDOWN_TO]->(a5)-[:FOR_FI]->(fi:FinancialInstitution {name: row.FI})
MATCH (p:Prospect {prospectId: row.Prospect})
CREATE (a5)-[:DRILLDOWN_TO]->(a6:AggSummary {
  level:6,
  totalAmount: toFloat(row.totalAmount),
  txCount: toInteger(row.txCount)
})
CREATE (a6)-[:FOR_PROSPECT]->(p);




-- L6 (leaf) – full detail
CREATE OR REPLACE TABLE L6 AS
SELECT Client, DepProduct, Flow, Channel, PayProduct, FI, Prospect,
       SUM(totalAmount) AS totalAmount, SUM(txCount) AS txCount
FROM transactions
GROUP BY Client, DepProduct, Flow, Channel, PayProduct, FI, Prospect;

-- L5
CREATE OR REPLACE TABLE L5 AS
SELECT Client, DepProduct, Flow, Channel, PayProduct, FI,
       SUM(totalAmount) AS totalAmount, SUM(txCount) AS txCount
FROM transactions
GROUP BY Client, DepProduct, Flow, Channel, PayProduct, FI;

-- L4
CREATE OR REPLACE TABLE L4 AS
SELECT Client, DepProduct, Flow, Channel, PayProduct,
       SUM(totalAmount) AS totalAmount, SUM(txCount) AS txCount
FROM transactions
GROUP BY Client, DepProduct, Flow, Channel, PayProduct;

-- L3
CREATE OR REPLACE TABLE L3 AS
SELECT Client, DepProduct, Flow, Channel,
       SUM(totalAmount) AS totalAmount, SUM(txCount) AS txCount
FROM transactions
GROUP BY Client, DepProduct, Flow, Channel;

-- L2
CREATE OR REPLACE TABLE L2 AS
SELECT Client, DepProduct, Flow,
       SUM(totalAmount) AS totalAmount, SUM(txCount) AS txCount
FROM transactions
GROUP BY Client, DepProduct, Flow;

-- L1
CREATE OR REPLACE TABLE L1 AS
SELECT Client, DepProduct,
       SUM(totalAmount) AS totalAmount, SUM(txCount) AS txCount
FROM transactions
GROUP BY Client, DepProduct;

-- L0 (root)
CREATE OR REPLACE TABLE L0 AS
SELECT Client,
       SUM(totalAmount) AS totalAmount, SUM(txCount) AS txCount
FROM transactions
GROUP BY Client;


















Client	DepProduct	Flow	Channel	PayProduct	FI	Prospect	totalAmount	txCount
Client A	CA	Sent	OLBB	Wire	Chase	Prospect X	10,000	5
Client A	CA	Sent	OLBB	Wire	Wells Fargo	Prospect Y	5,000	2
Client A	CA	Sent	OLBB	EFT	Chase	Prospect X	3,000	3
Client A	CA	Received	ABM	Cheque	Chase	Prospect X	2,000	1
Client A	BPRA	Sent	OLBB	Wire	Chase	Prospect Y	8,000	4
Client B	CA	Sent	ABM	EFT	Wells Fargo	Prospect Z	4,000	2
Now, your ETL script must "roll up" this data into 6 more tables.

Sample Rolled-Up Data (Tables L0 - L5)
Table L5: Group by first 6 dimensions (e.g., Client A, CA, Sent, OLBB, Wire, Chase -> 10,000, 5) (e.g., Client A, CA, Sent, OLBB, Wire, Wells Fargo -> 5,000, 2) ...and so on.

Table L4: Group by first 5 dimensions | Client | DepProduct | Flow | Channel | PayProduct | totalAmount | txCount | | :--- | :--- | :--- | :--- | :--- | :--- | :--- | | Client A | CA | Sent | OLBB | Wire | 15,000 | 7 | | Client A | CA | Sent | OLBB | EFT | 3,000 | 3 | | Client A | CA | Received | ABM | Cheque | 2,000 | 1 | | Client A | BPRA | Sent | OLBB | Wire | 8,000 | 4 | | Client B | CA | Sent | ABM | EFT | 4,000 | 2 |

Table L3: Group by first 4 dimensions | Client | DepProduct | Flow | Channel | totalAmount | txCount | | :--- | :--- | :--- | :--- | :--- | :--- | | Client A | CA | Sent | OLBB | 18,000 | 10 | | Client A | CA | Received | ABM | 2,000 | 1 | | Client A | BPRA | Sent | OLBB | 8,000 | 4 | | Client B | CA | Sent | ABM | 4,000 | 2 |

Table L2: Group by first 3 dimensions | Client | DepProduct | Flow | totalAmount | txCount | | :--- | :--- | :--- | :--- | :--- | | Client A | CA | Sent | 18,000 | 10 | | Client A | CA | Received | 2,000 | 1 | | Client A | BPRA | Sent | 8,000 | 4 | | Client B | CA | Sent | 4,000 | 2 |

Table L1: Group by first 2 dimensions | Client | DepProduct | totalAmount | txCount | | :--- | :--- | :--- | :--- | | Client A | CA | 20,000 | 11 | | Client A | BPRA | 8,000 | 4 | | Client B | CA | 4,000 | 2 |

Table L0: Group by Client (The Root) | Client | totalAmount | txCount | | :--- | :--- | :--- | | Client A | 28,000 | 15 | | Client B | 4,000 | 2 |



On Wed, Oct 22, 2025 at 12:22 PM Sundar Narisetti <sundar.narisetti@gmail.com> wrote:
  Step 1: ETL Pre-Aggregation  

You must use your source data to create a set of "rolled-up" tables, one for each level of the hierarchy.

Table L6 (Leaf): Group by Client, DepProduct, Flow, Channel, PayProduct, FI, Prospect.

(e.g., Client A, CA, Sent, OLBB, Wire, Chase, Prospect X, 10000, 5)

Table L5: Group by the first 6 dimensions.

Table L4: Group by the first 5 dimensions.

Table L3: Group by the first 4 dimensions.

Table L2: Group by the first 3 dimensions.

Table L1: Group by Client, DepProduct.

Table L0: Group by Client only.



  Step 2: Define the use case Graph Schema  

This is where your use case graph is implemented.

Dimension Nodes:

(:Client {clientId: string, name: string})

(:Prospect {prospectId: string, name: string})

(:DepositProduct {name: string})

(:Flow {direction: string})

(:Channel {name: string})

(:PaymentProduct {name: string})

(:FinancialInstitution {name: string})

Aggregation Nodes:

(:ClientSummary {totalAmount: float, txCount: int}) (Level 0 Root)

(:AggSummary {level: int, totalAmount: float, txCount: int}) (Levels 1-6)

Relationships:

[:HAS_TOTAL_SUMMARY] (Client -> ClientSummary)

[:DRILLDOWN_TO] (ClientSummary -> AggSummary, AggSummary -> AggSummary)

[:FOR_DEPOSIT_PRODUCT] (AggSummary L1 -> DepositProduct)

[:FOR_FLOW] (AggSummary L2 -> Flow)

[:FOR_CHANNEL] (AggSummary L3 -> Channel)

[:FOR_PAYMENT_PRODUCT] (AggSummary L4 -> PaymentProduct)

[:FOR_FI] (AggSummary L5 -> FinancialInstitution)

[:FOR_PROSPECT] (AggSummary L6 -> Prospect)


  Step 3: Create the Graph

   You'll load these in order, from dimensions to the root (L0) down to the leaves (L6).

  A. Create all Dimension Nodes

  Load all your unique dimension values first.

// Load Clients
MERGE (:Client {clientId: 'ClientA', name: 'Client A'});
MERGE (:Client {clientId: 'ClientB', name: 'Client B'});

// Load Prospects
MERGE (:Prospect {prospectId: 'ProspectX', name: 'Prospect X'});
MERGE (:Prospect {prospectId: 'ProspectY', name: 'Prospect Y'});
MERGE (:Prospect {prospectId: 'ProspectZ', name: 'Prospect Z'});

// Load other dimensions
MERGE (:DepositProduct {name: 'CA'});
MERGE (:DepositProduct {name: 'BPRA'});
MERGE (:Flow {direction: 'Sent'});
MERGE (:Flow {direction: 'Received'});
MERGE (:Channel {name: 'OLBB'});
MERGE (:Channel {name: 'ABM'});
MERGE (:PaymentProduct {name: 'Wire'});
MERGE (:PaymentProduct {name: 'EFT'});
MERGE (:FinancialInstitution {name: 'Chase'});
MERGE (:FinancialInstitution {name: 'Wells Fargo'});

  B. Load Level 0 (from Table L0)
  This creates the starting point for each client.

// Load (Client A, 28000, 15)
MATCH (c:Client {clientId: 'ClientA'})
CREATE (c)-[:HAS_TOTAL_SUMMARY]->(cs:ClientSummary {totalAmount: 28000, txCount: 15});

  C. Load Level 1 (from Table L1)  
This links the root summary to the first-level drill-down (Deposit Product).

// Load (Client A, CA, 20000, 11)
MATCH (c:Client {clientId: 'ClientA'})-[:HAS_TOTAL_SUMMARY]->(cs:ClientSummary)
MATCH (dp:DepositProduct {name: 'CA'})
CREATE (cs)-[:DRILLDOWN_TO]->(agg1:AggSummary {level: 1, totalAmount: 20000, txCount: 11})
CREATE (agg1)-[:FOR_DEPOSIT_PRODUCT]->(dp);

// Load (Client A, BPRA, 8000, 4)
MATCH (c:Client {clientId: 'ClientA'})-[:HAS_TOTAL_SUMMARY]->(cs:ClientSummary)
MATCH (dp:DepositProduct {name: 'BPRA'})
CREATE (cs)-[:DRILLDOWN_TO]->(agg1:AggSummary {level: 1, totalAmount: 8000, txCount: 4})
CREATE (agg1)-[:FOR_DEPOSIT_PRODUCT]->(dp);



  D. Load Level 2 (from Table L2)

  The pattern is: Match the parent, Create the child.

  // Load (Client A, CA, Sent, 18000, 10)

MATCH (c:Client {clientId: 'ClientA'})-[:HAS_TOTAL_SUMMARY]->(cs)
MATCH (cs)-[:DRILLDOWN_TO]->(agg1:AggSummary {level: 1})-[:FOR_DEPOSIT_PRODUCT]->(dp:DepositProduct {name: 'CA'})
MATCH (f:Flow {direction: 'Sent'})
CREATE (agg1)-[:DRILLDOWN_TO]->(agg2:AggSummary {level: 2, totalAmount: 18000, txCount: 10})
CREATE (agg2)-[:FOR_FLOW]->(f);

E. Load Levels 3, 4, 5...
You continue this pattern, making the MATCH path one level deeper each time. For example, loading L3 (Channel) would look like this:

// Load (Client A, CA, Sent, OLBB, 18000, 10)
MATCH (c:Client {clientId: 'ClientA'})-[:HAS_TOTAL_SUMMARY]->(cs)
MATCH (cs)-[:DRILLDOWN_TO]->(agg1)-[:FOR_DEPOSIT_PRODUCT]->(dp:DepositProduct {name: 'CA'})
MATCH (agg1)-[:DRILLDOWN_TO]->(agg2)-[:FOR_FLOW]->(f:Flow {direction: 'Sent'})
MATCH (ch:Channel {name: 'OLBB'})
CREATE (agg2)-[:DRILLDOWN_TO]->(agg3:AggSummary {level: 3, totalAmount: 18000, txCount: 10})
CREATE (agg3)-[:FOR_CHANNEL]->(ch);



F. Load Level 6 (from Table L6)
This is the final step, linking the last summary node to the (:Prospect).

// Load (Client A, CA, Sent, OLBB, Wire, Chase, Prospect X, 10000, 5)
MATCH (c:Client {clientId: 'ClientA'})-[:HAS_TOTAL_SUMMARY]->(cs)
MATCH (cs)-[:DRILLDOWN_TO]->(agg1)-[:FOR_DEPOSIT_PRODUCT]->(dp:DepositProduct {name: 'CA'})
MATCH (agg1)-[:DRILLDOWN_TO]->(agg2)-[:FOR_FLOW]->(f:Flow {direction: 'Sent'})
MATCH (agg2)-[:DRILLDOWN_TO]->(agg3)-[:FOR_CHANNEL]->(ch:Channel {name: 'OLBB'})
MATCH (agg3)-[:DRILLDOWN_TO]->(agg4)-[:FOR_PAYMENT_PRODUCT]->(pp:PaymentProduct {name: 'Wire'})
MATCH (agg4)-[:DRILLDOWN_TO]->(agg5)-[:FOR_FI]->(fi:FinancialInstitution {name: 'Chase'})
MATCH (p:Prospect {prospectId: 'ProspectX'})
CREATE (agg5)-[:DRILLDOWN_TO]->(agg6:AggSummary {level: 6, totalAmount: 10000, txCount: 5})
CREATE (agg6)-[:FOR_PROSPECT]->(p);



  Step 4: UI Query Logic

  Your UI doesn't need to know what the next node is, just that it needs to follow the [:DRILLDOWN_TO] path.

START: User clicks 'Client A'. The UI gets the id of its (:ClientSummary) node (e.g., id: 50).

Query 1: Get Level 1 (Deposit Products) The UI passes id: 50 as $clickedSummaryId.

MATCH (cs:ClientSummary)-[:DRILLDOWN_TO]->(agg1:AggSummary {level: 1})-[:FOR_DEPOSIT_PRODUCT]->(dp)
WHERE id(cs) = $clickedSummaryId  
RETURN
    dp.name AS nodeLabel,
    agg1.totalAmount AS total,
    agg1.txCount AS count,
    id(agg1) AS nodeIdToExpand // This ID is for the *next* click

Result: (nodeLabel: 'CA', total: 20000, ..., nodeIdToExpand: 101)


Query 2: User clicks the 'CA ($20k)' node The UI passes id: 101 as $clickedSummaryId.

MATCH (agg1:AggSummary)-[:DRILLDOWN_TO]->(agg2:AggSummary {level: 2})-[:FOR_FLOW]->(f)
WHERE id(agg1) = $clickedSummaryId
RETURN
    f.direction AS nodeLabel,
    agg2.totalAmount AS total,
    agg2.txCount AS count,
    id(agg2) AS nodeIdToExpand

Result: (nodeLabel: 'Sent', total: 18000, ..., nodeIdToExpand: 201)

This pattern continues all the way down. The final query for Level 6 will simply be:

MATCH (agg5:AggSummary)-[:DRILLDOWN_TO]->(agg6:AggSummary {level: 6})-[:FOR_PROSPECT]->(p)
WHERE id(agg5) = $clickedSummaryId
RETURN
    p.name AS nodeLabel,
    agg6.totalAmount AS total,
    agg6.txCount AS count
// No nodeIdToExpand is needed, as this is the last level
