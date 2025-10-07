WITH src AS (
  SELECT
      party_name,
      ym_id,
      LOWER(COALESCE(party_name, '')) AS raw
  FROM self_fuzzy_output
),

-- Remove parentheses; normalize punctuation (& -> and); drop all other punctuation
step1 AS (
  SELECT
      party_name,
      ym_id,
      REGEXP_REPLACE(raw, '\\((.*?)\\)', ' ') AS s1
  FROM src
),
step2 AS (
  SELECT
      party_name,
      ym_id,
      REGEXP_REPLACE(REPLACE(s1, '&', ' and '), '[^a-z0-9\\s]', ' ') AS s2
  FROM step1
),

-- Expand common abbreviations
step3 AS (
  SELECT
      party_name,
      ym_id,
      REGEXP_REPLACE(
        REGEXP_REPLACE(s2, '\\bsec\\b', ' securities '),
        '\\b(u\\.?s\\.?a\\.?|us)\\b', ' usa '
      ) AS s3
  FROM step2
),

-- Remove account-like noise tokens and standalone numbers
step4 AS (
  SELECT
      party_name,
      ym_id,
      REGEXP_REPLACE(s3, '\\b(acct|account|acc|gla|dda|chk|ck|no|#)\\s*\\d+\\b', ' ') AS s4a
  FROM step3
),
step5 AS (
  SELECT
      party_name,
      ym_id,
      REGEXP_REPLACE(s4a, '\\b\\d+\\b', ' ') AS s4
  FROM step4
),

-- Normalize company suffixes (keep them, but map to canonical tokens)
suffix_norm AS (
  SELECT
      party_name,
      ym_id,
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    REGEXP_REPLACE(
                      REGEXP_REPLACE(
                        REGEXP_REPLACE(s4, '\\b(incorporated|inc)\\b', ' inc '),
                        '\\b(corporation|corp)\\b', ' corp '
                      ),
                      '\\b(company|co)\\b', ' co '
                    ),
                    '\\b(limited|ltd)\\b', ' ltd '
                  ),
                  '\\b(l\\s*l\\s*c|llc)\\b', ' llc '
                ),
                '\\b(l\\s*l\\s*p|llp)\\b', ' llp '
              ),
              '\\b(l\\s*p|lp)\\b', ' lp '
            ),
            '\\b(plc)\\b', ' plc '
          ),
          '\\b(gmbh)\\b', ' gmbh '
        ),
        '\\b(ag|spa|nv|bv)\\b', ' \\1 '
      ) AS s5
  FROM step5
),

-- Collapse spaces and trim
collapsed AS (
  SELECT
      party_name,
      ym_id,
      TRIM(REGEXP_REPLACE(s5, '\\s+', ' ')) AS s6
  FROM suffix_norm
),

-- Add trailing period if the name ends with a known suffix (to match your example style)
final_std AS (
  SELECT
      party_name,
      ym_id,
      CASE
        WHEN s6 RLIKE '\\b(inc|corp|co|llc|ltd|llp|lp|plc|gmbh|ag|spa|nv|bv)$'
          THEN CONCAT(s6, '.')
        ELSE s6
      END AS party_name_std
  FROM collapsed
)

SELECT
  party_name,               -- unchanged
  party_name_std,           -- standardized
  ym_id
FROM final_std;
