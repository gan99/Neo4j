MATCH (client:Party {name: $clientName})
MATCH (client)-[rel1:IS_PAYOR_OF|IS_PAYEE_OF]->(tx:Transaction)<-[rel2:IS_PAYOR_OF|IS_PAYEE_OF]-(counterparty:Party)
WHERE client <> counterparty
  AND tx.date >= date($startDate)
  AND tx.date <= date($endDate)
WITH counterparty, tx.amount AS amount
MATCH (counterparty)-[:IS_CUSTOMER_OF]->(fi:FinancialInstitution)
WITH fi.name AS counterpartyBank,
     counterparty.name AS counterpartyName,
     SUM(amount) AS totalValue,
     COUNT(tx) AS transactionCount
ORDER BY counterpartyBank, totalValue DESC
LIMIT $topN
WITH counterpartyBank, counterpartyName, totalValue, transactionCount,
     CASE WHEN counterpartyBank = 'BMO' THEN true ELSE false END AS isBMOClient
RETURN counterpartyBank, counterpartyName, totalValue, transactionCount, isBMOClient
