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
      REGEXP_REPLACE(REPLACE(s1_paren, '&', ' and '), '[^a-z0-9\\s]', ' ') AS s2_clean
  FROM step1
),

-- 2) expand abbreviations and country variants
step3 AS (
  SELECT
      ym_id,
      -- 'sec' -> 'securities', 'us' -> 'usa', also normalize u.s.a. -> usa
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(s2_clean, '\\bu\\.?s\\.?a\\.?\\b', ' usa '),
          '\\bus\\b', ' usa '
        ),
        '\\bsec\\b', ' securities '
      ) AS s3_abbr
  FROM step2
),

-- 3) remove account-like / noise tokens and standalone numbers
step4 AS (
  SELECT
      ym_id,
      REGEXP_REPLACE(s3_abbr, '\\b(acct|account|acc|gla|dda|chk|ck|no|#)\\s*\\d+\\b', ' ') AS s4_noacct
  FROM step3
),
step5 AS (
  SELECT
      ym_id,
      REGEXP_REPLACE(s4_noacct, '\\b\\d+\\b', ' ') AS s5_nodigits
  FROM step4
),

-- 4) collapse whitespace + trim
standardized AS (
  SELECT
      ym_id,
      TRIM(REGEXP_REPLACE(s5_nodigits, '\\s+', ' ')) AS party_name_std
  FROM step5
)

-- Write out: overwrite party_name with standardized value, keep ym_id
SELECT DISTINCT
    party_name_std AS party_name,
    ym_id
FROM standardized;
