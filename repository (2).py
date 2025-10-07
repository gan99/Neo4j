-- Inputs: Dataset1, Dataset2
WITH d1 AS (
  SELECT InputName, OutputName
  FROM Dataset1
),
d2 AS (
  SELECT InputName, OutputName
  FROM Dataset2
)

SELECT DISTINCT
  COALESCE(d1.InputName, d2.InputName) AS InputName,
  CASE
    -- when present in both, prefer d1's OutputName; if it's null/empty, fall back to d2
    WHEN d1.InputName IS NOT NULL AND d2.InputName IS NOT NULL THEN
      CASE 
        WHEN d1.OutputName IS NOT NULL AND TRIM(d1.OutputName) <> '' THEN d1.OutputName
        ELSE d2.OutputName
      END
    -- only in d1
    WHEN d1.InputName IS NOT NULL THEN d1.OutputName
    -- only in d2
    ELSE d2.OutputName
  END AS OutputName
FROM d1
FULL OUTER JOIN d2
  ON d1.InputName = d2.InputName;
