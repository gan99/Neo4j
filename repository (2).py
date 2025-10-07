# -*- coding: utf-8 -*-
# Dataiku PySpark recipe: self_fuzzy_output -> Std_Party_Name_Lookup_Batch_Fin

import os
if isinstance(os.environ.get("PYSPARK_GATEWAY_PORT"), bytes):
    os.environ["PYSPARK_GATEWAY_PORT"] = os.environ["PYSPARK_GATEWAY_PORT"].decode("utf-8")
if isinstance(os.environ.get("PYSPARK_GATEWAY_SECRET"), bytes):
    os.environ["PYSPARK_GATEWAY_SECRET"] = os.environ["PYSPARK_GATEWAY_SECRET"].decode("utf-8")

import dataiku
from dataiku import spark as dkuspark
from dataiku import recipe
from pyspark.sql import functions as F

# ------------------------------------------------------------------
# Parameters (dataset names must match your Flow)
# ------------------------------------------------------------------
INPUT_DATASET  = "self_fuzzy_output"
OUTPUT_DATASET = "Std_Party_Name_Lookup_Batch_Fin"

# ------------------------------------------------------------------
# Load input as Spark DF
# Expected columns: party_name (string), party_name_std (string), ym_id (string/int)
# ------------------------------------------------------------------
spark = dkuspark.get_spark_session()
in_ds = dataiku.Dataset(INPUT_DATASET)
df = dkuspark.get_dataframe(spark, in_ds)

# ------------------------------------------------------------------
# Name standardizer
# Goal: produce LOWERCASED, punctuation-light, abbreviation-expanded,
#       number/noise stripped names while KEEPING company suffix 'inc.'
# ------------------------------------------------------------------
def standardize_name(col):
    c = F.lower(F.coalesce(col, F.lit('')))

    # remove parentheses content; normalize & -> ' and '
    c = F.regexp_replace(c, r'\((.*?)\)', ' ')
    c = F.regexp_replace(c, r'&', ' and ')

    # remove non-alphanumeric except spaces and dots (keep dot for 'inc.')
    c = F.regexp_replace(c, r'[^a-z0-9\s\.]', ' ')

    # expand common abbreviations
    c = F.regexp_replace(c, r'\bsec\b', ' securities ')
    c = F.regexp_replace(c, r'\bu\.?s\.?a\.?\b', ' usa ')
    c = F.regexp_replace(c, r'\bu\.?s\.?\b', ' usa ')

    # remove account-like / noise tokens (e.g., 'gla 111569', 'acct 123', etc.)
    c = F.regexp_replace(c, r'\b(acct|account|acc|gla|dda|chk|ck|no|#)\s*\d+\b', ' ')
    # drop standalone numeric tokens
    c = F.regexp_replace(c, r'\b\d+\b', ' ')

    # normalize common company suffix spellings to keep 'inc.' (NOT removing it)
    # - any 'inc' / 'inc.' -> 'inc.' (single form)
    c = F.regexp_replace(c, r'\binc\b\.?', ' inc. ')
    # collapse duplicated suffixes like 'inc inc.' -> 'inc.'
    c = F.regexp_replace(c, r'(inc\.)\s+(inc\.)', r'\1')

    # prevent accidental removal of meaningful finance words (bank, securities, n.a., etc.)
    # normalize 'n.a.' variants if present
    c = F.regexp_replace(c, r'\bn\.?\s*a\.?\b', ' n.a. ')

    # collapse whitespace
    c = F.regexp_replace(c, r'\s+', ' ')
    c = F.trim(c)

    # final touch: if endswith 'inc' without period, add '.'
    c = F.when(F.rlike(c, r'.*\binc$'), F.concat_ws('', c, F.lit('.'))).otherwise(c)

    return c

# ------------------------------------------------------------------
# Build output
# - Keep party_name and ym_id exactly as-is
# - Overwrite party_name_std = standardize_name(party_name)
# ------------------------------------------------------------------
df_out = (df
    .withColumn("party_name_std", standardize_name(F.col("party_name")))
    .select(
        F.col("party_name"),
        F.col("party_name_std"),
        F.col("ym_id")
    )
)

# ------------------------------------------------------------------
# Write to output dataset (create/propagate schema)
# ------------------------------------------------------------------
out_ds = dataiku.Dataset(OUTPUT_DATASET)
dkuspark.write_with_schema(out_ds, df_out)
