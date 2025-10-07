WITH src AS (
  SELECT
    TRIM(legal_name) AS legal_name,
    TRIM(uen)        AS uen
  FROM UEN_Legal_Dataset
  WHERE legal_name IS NOT NULL AND legal_name <> ''
),

-- Extract the first numeric sequence we can compare on (e.g., 'AB1234Z' -> 1234)
with_num AS (
  SELECT
    legal_name,
    uen,
    CAST(REGEXP_EXTRACT(uen, '(\\d+)', 0) AS BIGINT) AS uen_num
  FROM src
),

-- Rank rows per legal_name by numeric UEN desc, then by raw UEN desc as tie-breaker
ranked AS (
  SELECT
    legal_name,
    uen,
    ROW_NUMBER() OVER (
      PARTITION BY legal_name
      ORDER BY uen_num DESC NULLS LAST, uen DESC
    ) AS rn
  FROM with_num
)

SELECT
  legal_name,
  uen  -- this is the "highest" UEN for the legal name
FROM ranked
WHERE rn = 1;
