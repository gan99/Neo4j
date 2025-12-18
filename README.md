Hi Jeff, Katherine, and Nanda,

Thank you for the clarifications.

Understood that these are valid Canadian RTs, and the apparent extra zero in our table is due to formatting. The correct xxxxx-xxx format (for example, 10099-016) must retain the dash to identify them as Canadian RTs, and therefore they cannot be matched against U.S. routing number tables. We also note that the RT appears correctly with the dash in the AIF file.

As suggested, we’ll cross-check against ORIG_MICR_LINE_TXT in the production IDP table to confirm alignment. Additionally, please let us know if there is a Canadian RT lookup or reference table available that we could use to map these RTs to the corresponding financial institutions.

Thanks again for your help.

Best regards,
Ganesh Reddy Mannem

If you want it more direct or more informal, I can adjust the wording.


Hi Jeff, Katherine, and Nanda,

Thank you all for the detailed clarifications — this is very helpful.

Based on your inputs, my understanding is:

The routing transit numbers we observed are valid Canadian RTs, and the extra zero at the end in our table is a formatting/representation issue rather than a true part of the RT.

The correct Canadian RT format is xxxxx-xxx (for example, 10099-016), and retaining the dash is essential to correctly identify it as a Canadian RT.

Since these are Canadian RTs, they cannot be evaluated against U.S. routing number lookup tables, which explains why we were unable to match them to U.S. FIs.

In the VisionIP AIF file, the RT appears correctly with the dash (as noted by Katherine).

As suggested by Nanda, we will also cross-verify the RTs against the ORIG_MICR_LINE_TXT field in the production IDP table to ensure consistency with our extracted values.

We’ll proceed with this understanding and adjust our downstream logic to treat these as Canadian RTs sourced from check images, without attempting U.S. RT lookups.

Thanks again for the collaboration and insights. Please let me know if there’s anything further you’d like us to validate on our side.

Best regards,
Ganesh Reddy Mannem

Thanks for the clarification. That helps.
We’re primarily looking to understand how the check was originally presented, so using the original RT from ORIG_MICR_LINE_TXT makes sense. We’ll review the RT between the first and second < and see how it maps against our reference tables.
Hi Doug,

Thank you for checking.

I believe the confusion may be due to formatting when the values were pasted into Outlook. The routing transit numbers in the source table do include leading zeros, but those zeros were not preserved in the email.

For example, the actual values from the table look like:

099837688

000605679

007876368
…etc.

The RTs are not being translated; they are stored as-is in visionip.V_L1_VISIONIP_US_FRAUD_AIF. Please let me know if reviewing the full values with leading zeros helps validate whether these align with Canadian FIs.


Hope you’re doing well.

I wanted to follow up regarding the January routing transit numbers we shared from the visionip.V_L1_VISIONIP_US_FRAUD_AIF dataset. I understand the limitations around data retention on your side, and we appreciate you taking a look with the samples we provided.

Please let us know if you were able to identify or recognize any of the January routing numbers, or if there are any preliminary insights you can share. If additional context or details from our side would be helpful, I’m happy to provide whatever is available.

Thanks again for your support on this. Looking forward to your update.



Hi Jeff, Doug, and Crystal,

I hope you’re doing well.

I wanted to follow up on the January routing transit numbers that I shared earlier from the VisionIP checks dataset. Please let me know if you’ve had a chance to review them and whether they align with any known financial institutions on your side.

I understand the limitation around data older than 90 days, and we appreciate you looking into the January samples in the meantime. Any insights or guidance—either on identifying the routing numbers or confirming whether a lookup/reference exists—would be very helpful for our analysis.

Thank you for your time and support. Please let me know if you need any additional details from our end.

Best regards,
Ganesh Reddy Mannem


Hi Jennifer,

Thank you for your response.

We are currently working with the January dataset, and as of now, the most recent data has not yet flowed into our project pipeline. We will need some time to process the latest data once it becomes available before we can extract and share more recent samples with you.

I’ll keep you updated as soon as we receive the newer data.

Regards,
Ganesh Reddy Mannem

Hi Jennifer,

Thank you for checking.

At the moment, we are working only with the January dataset from visionip.V_L1_VISIONIP_US_FRAUD_AIF, and we do not have access to any data within the past 90 days. Unfortunately, we’re unable to retrieve more recent samples at this time.

Please let me know if the January data is sufficient, or if you need anything else from our side.

Regards,
Ganesh Reddy Mannem


Hi Doug,

Thank you for your quick response.

I’m sharing the VisionIP dataset extract for the routing transit numbers we mentioned earlier. This includes the dates and sequence numbers for those items, sourced directly from the visionip.V_L1_VISIONIP_US_FRAUD_AIF table (Jan 2025).

Please let me know if you need any additional samples, fields, or if a larger timeframe would help with identifying the routing numbers or matching them to the appropriate financial institutions.

Looking forward to your insights.

Regards,
Ganesh Reddy Mannem


SELECT
    bmo_client_id,
    bmo_client_name,
    COUNT(DISTINCT payment_product) AS payment_product_cnt
FROM bmo_transactions
GROUP BY bmo_client_id, bmo_client_name
ORDER BY payment_product_cnt DESC
LIMIT 10;

Since cheques appear to have a disproportionately high number of missing prospect and FI values compared to other payment products, we would like to understand the root cause and determine whether this information is available upstream.
Could you please advise whether there is a VisionIP UI or any internal tool that would allow us to further investigate these missing fields? Any guidance on where prospect name and FI mapping for cheque transactions is expected to originate would also be helpful.
For reference, here are a few sample Transaction IDs with missing information:
1170391145677568
1185592776000268
1185570117662468
1181371389697768
1183238515293868
1183221494501718
Thanks in advance for your support. Please let us know if you would like us to share additional samples or analysis.



ENEFICIARY_NAME
Name of the receiving party (the customer who gets or sends funds).
DISCRETIONARY_DATA
Optional information supplied by the originator (not required by NACHA).
COMPANY_DISCRETIONARY_DATA
Alternate or additional discretionary data for the company (originator).
ACH Return / Addenda
ADDENDA_RETURN_REASON_CODE
NACHA return reason code (e.g., R01 NSF, R03 No Account).
ADDENDA_RETURNS_ORIGINAL_ENTRY_TRACE_NUMBER
Trace number of the original entry that is being returned.
ADDENDA_RETURNS_DATE_OF_DEATH
Date of death used for government benefit returns (e.g., R15/R14 codes).
ADDENDA_RETURNS_ORIGINAL_RECEIVING_DFI_ID
Routing number of the Receiving DFI for the original entry.
ADDENDA_RETURNS_INFORMATION
Additional information supplied in the return addenda record (free text).
ADDENDA_RETURNS_TRACE_NUMBER
Trace number assigned to the return entry
Hi Annalisa,
Thank you for the update.
I wanted to let you know that I have a planned vacation day on December 26. I have already informed David and added the OOO entry to my calendar for that day. Could you please kindly approve this from your side as well?
Please let me know if you need any additional information.
Thank you and regards,

I would like to tally the transaction count which we are ingesting into the database and with the transactions which we are coming from the source. So here I would like to check it with the account number because some of the payer or payee names are missing but account numbers are present. In that case, checking with the name won't tally so I thought I could do that with the account number.Now with the account number, the transaction count which we are ingesting into the database is not adding with the transactions from the source. So here again I did some analysis where I found that some of the transactions to get the

Hi Gordon,

Thanks for the quick response.

I understand that the sample accounts we shared are not present in the NACB Account Universe table. However, our main question is around why these clients appear in the NACB Customer Universe table but not in the NACB Account Universe, especially since this mismatch is causing gaps in our client standardization and UEN-mapping process.

To help us proceed correctly, could you please clarify:

Under what conditions would a client exist only in the NACB Customer Universe but not in the Account Universe?

Are these cases expected (e.g., closed accounts, non-BMO products, dormant clients, missing account mappings, etc.)?

Is there any documentation or guidance on interpreting such discrepancies?

Understanding the reason behind this difference will help us determine whether our current mapping logic needs adjustment or if we should handle these cases separately.

Thanks again for your support,
Ganesh

Subject: Clarification on Mapping BMO Clients with NACB Data

Hi Gordon,

As part of our current use case to identify commercial clients from the U.S. transaction data, we are working on obtaining the UENs for BMO clients.

To achieve this, we initially attempted to map client account numbers from the transaction data with the account numbers in the NACB Account Universe table. However, we found that most clients did not match using the account number criteria.

Interestingly, many of these clients were successfully found in the NACB Customer Universe data when we mapped using the customer name from the transaction data to the customer name in the NACB Customer Universe table.

We have included a sample list of client accounts that were identified in the NACB Customer Universe but not present in the NACB Account Universe.

Due to these discrepancies, we also could not reconcile the monthly audit balance in NACB with the total transaction amount in the U.S. transaction data.

Could you please advise if there is any specific reason for this difference between the NACB Account and Customer Universe tables, or if there’s an alternative mapping approach we should consider?

Thanks and regards,
Ganesh Reddy Mannem


Commercial Client Mapping:

To standardize all commercial clients, we needed to map them using either the NACB Accounts or NACB Customers data.

When mapped with the NACB Accounts table, we identified around 29K commercial clients in ACH using account numbers as the primary key.

To standardize using the NACB Customers table, we had to run fuzzy matching to map UENs to their respective customers and identify commercial clients.

For this process, we took approximately 800K BMO customers (representing the top 80% of clients by total transaction volume) and performed fuzzy matching with NACB Customers. The process took about 7 hours to complete and resulted in a successful mapping of commercial clients.

Scope of Inclusion:

Do we need to include retail-to-retail (non-commercial) transactions — i.e., clients without UENs — in our model?

Data Quality Validation:

What approach should we follow to verify data completeness and quality to ensure no commercial clients (or other key records) were missed during the mapping or standardization process?

Please let me know your thoughts

Regarding the issue you raised about how 8 million clients are appearing in the All Payments transaction data for one month — we investigated this in detail.

We’ve been working on the standardization of party names, and previously, we considered only the top 30% of party names that account for the top 30% of total payment volume in the All Payments data.

After increasing our scope to include the top 80% of clients by total transaction volume, we did not see much change in the BMO client count. We observed the following:

The ACH data alone still includes around 7.8 million BMO clients, covering all payors and payees associated with BMO.

To validate this, we revisited the ACH source file and reviewed the FI codes from the data source to ensure they are correctly mapped with the FI code lookup table (which includes transit routing lookup, BIC lookup, ABA, and ICA tables). Everything appears to be mapped correctly on our side.

When we combined all other payment products (Zelle, Cards, Cheques, Wires), there were only about 190K clients in total (including both payors and payees).

Please let me know if you’d like a short report or summary visualization to accompany this update.

Best regards,

While working with the payments data, we noticed some inconsistencies — specifically, a few records are missing either the payor or payee name. Because of this, we’re having difficulty mapping these transactions with the NACB customers or NACB account universe tables.

I wanted to check with you — did you encounter similar issues with missing names on the Canadian side? If so, how did you handle or resolve them?
-- Match on account_number
SELECT
    a.client_id,
    a.client_name,
    b.account_product_id,
    a.flow,
    a.txn_channel,
    a.payment_product_nm,
    a.prospect_fi_id,
    a.prospect_id,
    a.prospect_name,
    SUM(a.pmt_amt) AS total_amount,
    COUNT(*) AS total_volume
FROM graphnetwork_oneclientview_us_v10_1_sample a
LEFT JOIN graphnetwork_oneclientview_us_v10_1_nacb_acc_uen b
    ON a.account_number = b.account_number
WHERE b.account_product_id IS NOT NULL
GROUP BY
    a.client_id, a.client_name, b.account_product_id,
    a.flow, a.txn_channel, a.payment_product_nm,
    a.prospect_fi_id, a.prospect_id, a.prospect_name

UNION ALL

-- Match on UEN (and not matched by account_number)
SELECT
    a.client_id,
    a.client_name,
    b.account_product_id,
    a.flow,
    a.txn_channel,
    a.payment_product_nm,
    a.prospect_fi_id,
    a.prospect_id,
    a.prospect_name,
    SUM(a.pmt_amt) AS total_amount,
    COUNT(*) AS total_volume
FROM graphnetwork_oneclientview_us_v10_1_sample a
LEFT JOIN graphnetwork_oneclientview_us_v10_1_nacb_acc_uen b
    ON a.uen = b.uen
WHERE b.account_product_id IS NOT NULL
  AND a.account_number NOT IN (SELECT account_number FROM graphnetwork_oneclientview_us_v10_1_nacb_acc_uen)
GROUP BY
    a.client_id, a.client_name, b.account_product_id,
    a.flow, a.txn_channel, a.payment_product_nm,
    a.prospect_fi_id, a.prospect_id, a.prospect_name

UNION ALL

-- Remaining unmatched → "Other"
SELECT
    a.client_id,
    a.client_name,
    'Other' AS account_product_id,
    a.flow,
    a.txn_channel,
    a.payment_product_nm,
    a.prospect_fi_id,
    a.prospect_id,
    a.prospect_name,
    SUM(a.pmt_amt) AS total_amount,
    COUNT(*) AS total_volume
FROM graphnetwork_oneclientview_us_v10_1_sample a
WHERE a.account_number NOT IN (SELECT account_number FROM graphnetwork_oneclientview_us_v10_1_nacb_acc_uen)
  AND a.uen NOT IN (SELECT uen FROM graphnetwork_oneclientview_us_v10_1_nacb_acc_uen)
GROUP BY
    a.client_id, a.client_name, a.flow, a.txn_channel,
    a.payment_product_nm, a.prospect_fi_id, a.prospect_id, a.prospect_name










88888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888
SELECT
    a.client_id,
    a.client_name,
    CASE
        WHEN a.account_number = b.account_number OR a.uen = b.uen THEN b.account_product_id
        ELSE 'Other'
    END AS account_product_id,
    a.flow,
    a.txn_channel,
    a.payment_product_nm,
    a.prospect_fi_id,
    a.prospect_id,
    a.prospect_name,
    SUM(a.pmt_amt) AS total_amount,
    COUNT(*) AS total_volume
FROM graphnetwork_oneclientview_us_v10_1_sample a
LEFT JOIN graphnetwork_oneclientview_us_v10_1_nacb_acc_uen b
    ON (a.account_number = b.account_number OR a.uen = b.uen)
WHERE b.account_number IS NOT NULL OR b.uen IS NOT NULL
GROUP BY
    a.client_id,
    a.client_name,
    CASE
        WHEN a.account_number = b.account_number OR a.uen = b.uen THEN b.account_product_id
        ELSE 'Other'
    END,
    a.flow,
    a.txn_channel,
    a.payment_product_nm,
    a.prospect_fi_id,
    a.prospect_id,
    a.prospect_name



Hi Team,

Please find attached the updated report for the U.S. Diners Club clients.

As mentioned earlier by Thibault, the demographic details for the U.S. clients are already included. In addition to that, I’ve provided:

Transaction details for U.S. clients, including:

Payment products used

Total transaction volume

Total transaction amount for each transaction type

The next sheet includes details of Deposit and Lending products, which contain:

Account number

Source system code

Product name

Month-end balance with date

Original authorization amount

Please review the attached file, and let me know if you’d like to discuss or need any specific breakdowns.

Best regards,
Ganesh Reddy Mannem
Data Scientist – B2B Graph Network
BMO Bank

Please find attached the Diners Club (U.S.) client report. For each client UEN, the file includes:

Demographics: Industry number (NAICS Code), Industry name (NAICS Name), and Total Annual Sales

Transactions (Jan 2025): Totals by transaction type (amount and volume) derived from the January 2025 transaction data

I’d appreciate a quick discussion to walk through the findings and next steps.
Could you share your availability for a brief call this week? I’ll send an invite accordingly.

Thanks,
Ganesh Reddy Mannem


While working on retrieving and processing the transaction data for the 100 clients, we’re currently facing some performance issues within Dataiku.

Even simple recipes (like the copy recipe) are taking much longer than expected to execute and, in some cases, are still running without completion. We reached out to the Dataiku support team, and they identified that the issue is likely due to the Hadoop cluster being at full capacity, as it’s currently serving multiple high-load jobs.

The support team advised us to try again after some time once the cluster load decreases.

Once the issue is resolved, I will proceed with completing the recipe execution and generate the updated transaction file with all the processed data obtained so far.

I’ll share another update once the dataset is refreshed and ready for analysis.
We are working to get the dataset ready by tomorrow EOD. Our analysis focuses on identifying any relationships beyond the Diners (DINUS) Corporate Cards from our transaction data.

I’ve already retrieved some relationships, and for the remaining clients, I’m checking the previous transaction data to ensure full coverage.
However, I’ve encountered a barrier on the U.S. side — currently, we only have the January 2025 transaction data available. From that, we were able to match 14 records out of the 100 U.S. clients provided.

To match the remaining clients, we’ll need access to the previous year’s U.S. transaction data, as many of these relationships are likely reflected in earlier periods. At this point, we do not yet have access to that data, so I’ll need some additional time once it becomes available to complete the analysis.

Additionally, I observed that we can directly retrieve the NAICS code and NAICS name from the NACB customer table in AIM, which will help us include industry-level details in the final dataset.

I’ll share the consolidated results and summary as soon as we complete the validation and have the additional U.S. data.

Hi Arjun,

Thank you for sharing the details.

We are working to get the dataset ready by tomorrow EOD. Our analysis focuses on identifying any relationships beyond the Diners (DINUS) Corporate Cards from our transaction data.

I’ve already been able to retrieve some of these relationships, and for the remaining clients, I’m checking the previous transaction data to ensure full coverage.

Additionally, I noticed that we can directly retrieve the NAICS code and NAICS name from the NACB customer table in AIM, which should help in providing the industry-level details you requested.

I’ll share the consolidated dataset and summary of findings once the validation is complete.

Best regards,
Ganesh Reddy Mannem
Data Scientist – B2B Graph Network
BMO Bank


1. NACB Data Quality Checks

a. Duplicate Party Names with Different UENs

Reached out to the source team regarding duplicate party names with different UENs observed during standardization.

Gordon from the source team confirmed this is a known issue in APMS, where duplicate entities are linked through the risk rating process.

The team is currently working on deduplication, and these changes are expected to be reflected in upcoming NACB reports once the APMS fixes take effect.

b. Missing Clients in NACB Universe Customer Data

The source team confirmed that the missing clients I reported are non-commercial clients, which is why they are not part of the NACB universe.

I’ve asked for confirmation from the manager on whether we can exclude these non-commercial clients from our transaction dataset going forward.

2. Incoming vs Outgoing Data Flow Validation

I analyzed the mismatch between incoming and outgoing transaction flows compared to client totals.

Found that the Financial Institution (FI) pipeline was not completing, which caused the mismatch.

I reran the FI pipeline, re-ingested the corrected data into the Neo4j database, and the mismatch issue has been resolved.

I’m now performing validation checks to ensure that all flow totals align with client-level aggregates.

2. Incoming vs Outgoing Data Flow Validation

Analyzed the mismatch between incoming and outgoing transaction flows compared to client totals.

Found that the Financial Institution (FI) pipeline was not completing successfully, which appeared to be causing the mismatch.

After re-running the FI pipeline and re-ingesting the data into the Neo4j database, the mismatch issue still persists.

I am currently investigating further and performing detailed validation checks to identify the root cause and confirm data consistency across pipelines.


Hi [Manager’s Name],

I wanted to get your input regarding the missing clients observed in the NACB Universe Customer data during our standardization checks for USA Transactions – January 2025.

While performing the validation, I found that some BMO clients with active transactions in Jan 2025 are not listed in the NACB universe lookup data (sbx_nacb_arm_common_data) for both January and December reports.

The source team confirmed that these clients fall under non-commercial lines, which is why they are not part of the NACB universe.

Before I proceed with the data cleanup and standardization, I’d like your guidance on a few points:

Should we exclude non-commercial clients (that are not part of the NACB universe) from our transaction dataset used for UEN mapping and standardization?

If yes, would you prefer that I

Filter them out directly in the Dataiku pipeline, or

Keep them in a separate exception dataset for tracking/reporting?

Would we want to notify or tag these clients somewhere (e.g., flag as non-commercial / not part of NACB) for documentation or downstream reference?

Once I have your direction, I’ll proceed with updating the pipeline logic and prepare a short note summarizing how these exceptions are handled going forward.

Best regards,
Ganesh Reddy Mannem













Hi Gordon,

Thanks for the follow-up on the duplicate entities and the APMS deduplication work—appreciate the context and the audit example.

I have a separate data-gap item to flag:

Issue: Missing Clients in NACB Reports (UEN Mapping Impact)

While standardizing party names for USA Transactions – January 2025, I observed that some BMO clients with active transactions in Jan 2025 are missing from the NACB universe customer database (NSCB lookup from sbx_nacb_arm_common_data). I also checked December 2024 reports for these clients, and they are not listed there either.

This gap impacts our ability to map UENs and maintain consistent party linkage in the graph.

Request

Could you please review these cases and confirm:

Whether these clients should be present in the Jan 2025 NACB universe (and Dec 2024 for backfill), and

If so, whether they can be added/backfilled or flagged for the ongoing remediation.

Sample Cases (for reference)

(I can send the full list as an attachment.)

Client Name	Party ID	Evidence of Activity (Jan 2025)	Checked in NACB (Jan 2025)	Checked in NACB (Dec 2024)	Notes
[Client A]	[Party_ID_A]	Txns: [count]/$[amount]	Not found	Not found	Needs UEN mapping
[Client B]	[Party_ID_B]	Txns: [count]/$[amount]	Not found	Not found	Needs UEN mapping

If helpful, I can provide:

The transaction extracts (client, party_id, txn counts/amounts, dates, rails) that show Jan 2025 activity, and

The lookup queries used against sbx_nacb_arm_common_data for Jan 2025 and Dec 2024.

Please let me know if there’s a preferred template or additional fields you’d like me to include (e.g., LEI, UEN placeholder, account product, region).

Thanks again—happy to walk through the examples live if useful.







Subject: Meeting Minutes & Action Plan – NACB UEN Review and UI Enhancement

Hi Team,

Here’s a quick summary of our discussion and next steps from today’s meeting:

🧩 Key Discussion Points

NACB Data – Same Name but Different UENs

We identified cases in the NACB dataset where the same party name appears with multiple UENs.

Action:

Check the NACB data for shared or connected UENs linked to the same parent entity.

If these are indeed connected to the same parent, it’s valid to have different names but different UENs for those parties.

Document the logic clearly for consistency across mappings.

Missing Clients in NACB for UEN Mapping

Some clients are not listed in NACB, which causes gaps in UEN mapping.

Action:

First, check the current month’s reports to verify if the client appears there.

If not, check the previous month’s reports for any occurrence.

If the client still doesn’t appear in either, reach out to the source team to confirm data availability or source discrepancies.

UI Enhancement – Context Expansion Data Table

Proposal to create a new UI table component that dynamically populates the data being expanded in context (Client → Account → Payment → FI → Prospect).

Action:

Build a UI table that captures and displays the nodes and relationships for the currently expanded client context.

The table should update interactively as users expand or collapse nodes in the visualization.


3. UI Enhancement – Context Data Table

Discussion:

Proposed adding a table in the web app UI to display the expanded context data for each client.

This will help visualize and analyze the nodes and relationships captured during graph expansion.

Action Plan:

Create a UI table component that dynamically populates based on the currently expanded client context.

The table should list:

Node details (Client, Account Product, Payment Product, FI, Prospect)

Relationship details between them

The table data should update automatically each time the graph expands in context.
