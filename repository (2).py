# -*- coding: utf-8 -*-
# Inputs:  self_fuzzy_output   (cols: party_name, party_name_std, ym_id)
# Output:  Std_Party_Name_Lookup_Batch_Fin (cols: party_name, party_name_std, ym_id)

import dataiku
from dataiku import spark as dkuspark
from dataiku import recipe
from pyspark.sql import functions as F, Window

# ----------------------- Helpers -----------------------
def standardize_name(col):
    c = F.upper(F.coalesce(col, F.lit('')))
    # Remove parentheses and punctuation; keep alnum + spaces
    c = F.regexp_replace(c, r'\((.*?)\)', ' ')
    c = F.regexp_replace(c, r'&', ' AND ')
    c = F.regexp_replace(c, r'[^A-Z0-9\s]', ' ')
    # Common expansions
    c = F.regexp_replace(c, r'\bSEC\b', ' SECURITIES ')
    c = F.regexp_replace(c, r'\bUS\b', ' USA ')
    c = F.regexp_replace(c, r'\bU\.?S\.?A\.?\b', ' USA ')
    # Remove account-like / noise tokens + standalone numbers
    c = F.regexp_replace(c, r'\b(ACCT|ACCOUNT|ACC|GLA|DDA|CHK|CK|NO|#)\s*\d+\b', ' ')
    c = F.regexp_replace(c, r'\b\d+\b', ' ')
    # Drop common legal suffixes
    suffixes = [
        'INCORPORATED','INC','CORPORATION','CORP','CO','COMPANY','LLC','L L C',
        'LTD','LIMITED','LLP','L L P','LP','L P','PLC','S A','S A S','NV','N V',
        'BV','B V','BVBA','B V B A','GMBH','AG','SPA','S P A'
    ]
    pattern_suffix = r'\b(' + '|'.join(suffixes) + r')\b'
    c = F.regexp_replace(c, pattern_suffix, ' ')
    # Normalize BANK variants lightly (optional; comment out if you prefer to keep as-is)
    # c = F.regexp_replace(c, r'\bBK\b', ' BANK ')
    # Whitespace normalize
    c = F.regexp_replace(c, r'\s+', ' ')
    c = F.trim(c)
    return c

# ----------------------- Read input -----------------------
in_ds = dataiku.Dataset("self_fuzzy_output")
spark = dkuspark.get_spark_session()
df_in = dkuspark.get_dataframe(spark, in_ds)

# Ensure required columns exist
required_cols = {"party_name", "party_name_std", "ym_id"}
missing = required_cols - set(df_in.columns)
if missing:
    raise ValueError("Input dataset 'self_fuzzy_output' missing columns: {}".format(", ".join(sorted(missing))))

# ----------------------- Standardize -----------------------
# Clean the raw party_name and the fuzzy output party_name_std
df = (
    df_in
    .withColumn("party_name_clean", standardize_name(F.col("party_name")))
    .withColumn("party_std_clean_from_fuzzy", standardize_name(F.col("party_name_std")))
)

# If fuzzy output was blank or useless, fallback to standardized raw
# (i.e., ensure we always have some canonical candidate)
df = df.withColumn(
    "std_candidate",
    F.when(F.length(F.col("party_std_clean_from_fuzzy")) > 0, F.col("party_std_clean_from_fuzzy"))
     .otherwise(F.col("party_name_clean"))
)

# Optionally: drop very short tokens (e.g., single letters) that slipped through
# df = df.withColumn("std_candidate", F.regexp_replace(F.col("std_candidate"), r'\b[A-Z]\b', ''))
# df = df.withColumn("std_candidate", F.trim(F.regexp_replace(F.col("std_candidate"), r'\s+', ' ')))

# ----------------------- Conflict resolution (majority vote per ym_id + party) -----------------------
# There can be multiple std_candidate values for the same (ym_id, party_name_clean).
# We'll pick the most frequent mapping within that ym bucket.

counts = (
    df.groupBy("ym_id", "party_name_clean", "std_candidate")
      .count()
)

w = Window.partitionBy("ym_id", "party_name_clean").orderBy(F.desc("count"), F.asc("std_candidate"))
resolved = (
    counts
    .withColumn("rn", F.row_number().over(w))
    .where(F.col("rn") == 1)
    .select(
        "ym_id",
        F.col("party_name_clean").alias("party_name"),
        F.col("std_candidate").alias("party_name_std")
    )
)

# Remove empty/NULL standards and duplicates
resolved = (resolved
            .where(F.length(F.col("party_name_std")) > 0)
            .dropDuplicates(["ym_id", "party_name", "party_name_std"])
)

# ----------------------- (Optional) Overrides -----------------------
# If you maintain a small override table (e.g., managed dataset "party_name_overrides"
# with columns: party_name_std (dirty) , party_name_canonical (clean)),
# you can enforce those mappings here. Uncomment if you have such a dataset.

# try:
#     overrides_ds = dataiku.Dataset("party_name_overrides")
#     df_over = dkuspark.get_dataframe(spark, overrides_ds)
#     # standardize the key to match our standardized domain
#     df_over = (df_over
#         .withColumn("party_name_std", standardize_name(F.col("party_name_std")))
#         .withColumn("party_name_canonical", standardize_name(F.col("party_name_canonical")))
#         .select("party_name_std", "party_name_canonical")
#     )
#     resolved = (resolved
#         .join(df_over, on="party_name_std", how="left")
#         .withColumn("party_name_std",
#                     F.coalesce(F.col("party_name_canonical"), F.col("party_name_std")))
#         .drop("party_name_canonical")
#     )
# except Exception as e:
#     # If override dataset doesn't exist, just continue
#     pass

# ----------------------- Write output -----------------------
out_ds = dataiku.Dataset("Std_Party_Name_Lookup_Batch_Fin")
dkuspark.write_with_schema(out_ds, resolved.select("party_name", "party_name_std", "ym_id"))
