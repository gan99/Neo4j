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
