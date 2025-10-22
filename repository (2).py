SELECT
    a.party_id,
    CASE 
        WHEN a.account_number = b.account_number 
             AND b.account_product_id IS NOT NULL 
        THEN b.account_product_id
        ELSE 'Other'
    END AS account_product_id,
    SUM(a.pmt_amt) AS total_amount,
    COUNT(*) AS total_volume
FROM graphnetwork_oneclientview_us_v10_1_view2_transaction_account a
LEFT JOIN graphnetwork_oneclientview_us_v10_1_view2_account_account_product b
    ON a.account_number = b.account_number
WHERE b.acct_src_stm_cd IS NOT NULL OR b.acct_src_stm_cd IS NULL  -- allows all
GROUP BY a.party_id,
         CASE 
             WHEN a.account_number = b.account_number 
                  AND b.account_product_id IS NOT NULL 
             THEN b.account_product_id
             ELSE 'Other'
         END
