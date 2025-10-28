1. duplicate aggregates
MATCH (agg:AggTx)
WITH agg.monthId AS month, agg.client_id AS client,
     agg.account_product_id AS acct, agg.payment_product_nm AS pay,
     agg.flow AS flow, agg.txn_channel AS ch, agg.prospect_fi_id AS fi,
     agg.prospect_id AS p, count(*) AS cnt
WHERE cnt > 1
RETURN month, client, acct, pay, flow, ch, fi, p, cnt
ORDER BY cnt DESC;

2. missing totalAmount or txCount
MATCH (agg:AggTx)
WHERE agg.totalAmount IS NULL OR agg.txCount IS NULL
RETURN count(*) AS missingMetrics;

3. Prospect-level aggregation
MATCH (c:Client)<-[:FOR_CLIENT]-(agg:AggTx)-[:FOR_PROSPECT]->(p:Prospect)
RETURN c.name AS Client, p.name AS Prospect,
       sum(agg.totalAmount) AS totalAmount, sum(agg.txCount) AS txCount
ORDER BY Client, totalAmount DESC;

4. FI
MATCH (c:Client)<-[:FOR_CLIENT]-(agg:AggTx)-[:FOR_FI]->(fi:FinancialInstitution)
RETURN c.name AS Client, fi.name AS FI,
       sum(agg.totalAmount) AS totalAmount, sum(agg.txCount) AS txCount
ORDER BY Client, totalAmount DESC;

5.PaymentProduct
MATCH (c:Client)<-[:FOR_CLIENT]-(agg:AggTx)-[:FOR_PAYMENT_PRODUCT]->(pp:PaymentProduct)
RETURN c.name AS Client, pp.name AS PaymentProduct,
       sum(agg.totalAmount) AS totalAmount, sum(agg.txCount) AS txCount
ORDER BY Client, totalAmount DESC;

6. client total amount and txnCount
SELECT client_name, SUM(total_amount) AS totalAmount_raw, SUM(total_volume) AS txCount_raw
FROM graphnetwork_oneclientview_us_v10_1_sample
GROUP BY client_name

MATCH (agg:AggTx)-[:FOR_CLIENT]->(c:Client)
RETURN c.name AS Client,
       round(sum(agg.totalAmount), 2) AS totalAmount_graph,
       sum(agg.txCount) AS txCount_graph
ORDER BY totalAmount_graph DESC;












-- Step 1: Replace FI_NAME only for ZELLE transactions
WITH z


elle_updated AS (
    SELECT
        t.*,
        COALESCE(b.FINAME, t.FINANCIAL_INSTITUTION_NAME) AS UPDATED_FINAME
    FROM transaction_data t
    LEFT JOIN bank_acronyms_to_bank_names b
        ON t.FINANCIAL_INSTITUTION_NAME = b.BANK_CODE
    WHERE UPPER(t.PAYMENT_TYPE) = 'ZELLE'
)

-- Step 2: Combine all transactions together
SELECT
    t.TRANSACTION_ID,
    t.PAYMENT_TYPE,
    CASE
        WHEN UPPER(t.PAYMENT_TYPE) = 'ZELLE'
        THEN z.UPDATED_FINAME
        ELSE t.FINANCIAL_INSTITUTION_NAME
    END AS FINANCIAL_INSTITUTION_NAME,
    t.CLIENT_ID,
    t.ACCOUNT_NUMBER,
    t.PAYMENT_PRODUCT,
    t.AMOUNT,
    t.TRANSACTION_DATE,
    t.OTHER_COLUMNS
FROM transaction_data t
LEFT JOIN zelle_updated z
    ON t.TRANSACTION_ID = z.TRANSACTION_ID



MERGE (agg:AggTx {
  monthId:            item.month_id,
  client_id:          item.client_id,
  account_product_id: item.account_product_id,
  payment_product_nm: item.payment_product_nm,
  flow:               item.flow,
  txn_channel:        item.txn_channel,
  prospect_fi_id:     item.prospect_fi_id,
  prospect_id:        item.prospect_id
})
// set/update metrics each run (idempotent)
SET agg.totalAmount = toFloat(item.total_amount),
    agg.txCount     = toInteger(item.total_volume)

-- Match on account_number
SELECT
    a.client_id,
    a.client_name,
    b.account_product_id,
    a.flow,
    a.txn_channel,
    a.payment_product_nm,
    a.prospect_fi_id,
    a.prospect_id,
    a.prospect_name,
    SUM(a.pmt_amt) AS total_amount,
    COUNT(*) AS total_volume
FROM graphnetwork_oneclientview_us_v10_1_sample a
LEFT JOIN graphnetwork_oneclientview_us_v10_1_nacb_acc_uen b
    ON a.account_number = b.account_number
WHERE b.account_product_id IS NOT NULL
GROUP BY
    a.client_id, a.client_name, b.account_product_id,
    a.flow, a.txn_channel, a.payment_product_nm,
    a.prospect_fi_id, a.prospect_id, a.prospect_name

UNION ALL

-- Match on UEN (and not matched by account_number)
SELECT
    a.client_id,
    a.client_name,
    b.account_product_id,
    a.flow,
    a.txn_channel,
    a.payment_product_nm,
    a.prospect_fi_id,
    a.prospect_id,
    a.prospect_name,
    SUM(a.pmt_amt) AS total_amount,
    COUNT(*) AS total_volume
FROM graphnetwork_oneclientview_us_v10_1_sample a
LEFT JOIN graphnetwork_oneclientview_us_v10_1_nacb_acc_uen b
    ON a.uen = b.uen
WHERE b.account_product_id IS NOT NULL
  AND a.account_number NOT IN (SELECT account_number FROM graphnetwork_oneclientview_us_v10_1_nacb_acc_uen)
GROUP BY
    a.client_id, a.client_name, b.account_product_id,
    a.flow, a.txn_channel, a.payment_product_nm,
    a.prospect_fi_id, a.prospect_id, a.prospect_name

UNION ALL

-- Remaining unmatched → "Other"
SELECT
    a.client_id,
    a.client_name,
    'Other' AS account_product_id,
    a.flow,
    a.txn_channel,
    a.payment_product_nm,
    a.prospect_fi_id,
    a.prospect_id,
    a.prospect_name,
    SUM(a.pmt_amt) AS total_amount,
    COUNT(*) AS total_volume
FROM graphnetwork_oneclientview_us_v10_1_sample a
WHERE a.account_number NOT IN (SELECT account_number FROM graphnetwork_oneclientview_us_v10_1_nacb_acc_uen)
  AND a.uen NOT IN (SELECT uen FROM graphnetwork_oneclientview_us_v10_1_nacb_acc_uen)
GROUP BY
    a.client_id, a.client_name, a.flow, a.txn_channel,
    a.payment_product_nm, a.prospect_fi_id, a.prospect_id, a.prospect_name
