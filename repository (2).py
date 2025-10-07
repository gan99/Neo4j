# -*- coding: utf-8 -*-
# Dataiku PySpark recipe: self_fuzzy_output -> Std_Party_Name_Lookup_Batch_Fin

import dataiku
from dataiku import spark as dkuspark, recipe
from pyspark.sql import functions as F

INPUT_DATASET  = "self_fuzzy_output"
OUTPUT_DATASET = "Std_Party_Name_Lookup_Batch_Fin"

spark = dkuspark.get_spark_session()

# Load input
in_ds = dataiku.Dataset(INPUT_DATASET)
df = dkuspark.get_dataframe(spark, in_ds)

# --- standardizer: keep 'inc.' (as in your example), expand sec→securities, us→usa, strip account-like tails ---
def standardize_name(col):
    c = F.lower(F.coalesce(col, F.lit('')))
    c = F.regexp_replace(c, r'\((.*?)\)', ' ')
    c = F.regexp_replace(c, r'&', ' and ')
    c = F.regexp_replace(c, r'[^a-z0-9\s\.]', ' ')             # keep letters/numbers/spaces/dot
    c = F.regexp_replace(c, r'\bsec\b', ' securities ')
    c = F.regexp_replace(c, r'\bu\.?s\.?a\.?\b', ' usa ')
    c = F.regexp_replace(c, r'\bu\.?s\.?\b', ' usa ')
    c = F.regexp_replace(c, r'\b(acct|account|acc|gla|dda|chk|ck|no|#)\s*\d+\b', ' ')
    c = F.regexp_replace(c, r'\b\d+\b', ' ')
    c = F.regexp_replace(c, r'\binc\b\.?', ' inc. ')           # normalize to 'inc.'
    c = F.regexp_replace(c, r'(inc\.)\s+(inc\.)', r'\1')       # collapse double 'inc.'
    c = F.regexp_replace(c, r'\bn\.?\s*a\.?\b', ' n.a. ')
    c = F.regexp_replace(c, r'\s+', ' ')
    c = F.trim(c)
    c = F.when(F.rlike(c, r'.*\binc$'), F.concat_ws('', c, F.lit('.'))).otherwise(c)
    return c

# Ensure expected columns exist and are strings
df = (df
      .withColumn("party_name", F.col("party_name").cast("string"))
      .withColumn("ym_id", F.col("ym_id").cast("string"))
     )

# Recompute standardized name from party_name (do NOT touch original party_name/ym_id)
df_out = (df
    .withColumn("party_name_std", standardize_name(F.col("party_name")))
    .select("party_name", "party_name_std", "ym_id")
)

# Write output
out_ds = dataiku.Dataset(OUTPUT_DATASET)
dkuspark.write_with_schema(out_ds, df_out)
