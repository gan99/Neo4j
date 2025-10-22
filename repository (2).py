SELECT
    UEN,
    -- Merge all distinct payment products into a single comma-separated string
    CONCAT_WS(', ',
        COLLECT_SET(Payment_Product)
    ) AS payment_products_used,
    
    -- Sum of all transaction amounts across payment products
    SUM(Total_Amount) AS total_transaction_amount,
    
    -- Sum of all transaction volumes across payment products
    SUM(Total_Volume) AS total_transaction_volume

FROM input_dataset_name
GROUP BY UEN
