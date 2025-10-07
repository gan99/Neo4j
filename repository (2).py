WITH src AS (
  SELECT
      ym_id,
      LOWER(COALESCE(party_name, '')) AS name_raw
  FROM self_fuzzy_output
),

-- 1) remove parentheses; normalize & to ' and ' ; strip non-alnum
step1 AS (
  SELECT
      ym_id,
      REGEXP_REPLACE(name_raw, '\\((.*?)\\)', ' ')                       AS s1_paren,
      name_raw
  FROM src
),
step2 AS (
  SELECT
      ym_id,
      REGEXP_REPLACE(REPLACE(s1_paren, '&', ' and '), '[^a-z0-9\\s]', ' ')
