Hi [Source Team / Team Member’s Name],

I hope you’re doing well.

During our recent NACB data validation review, I observed that some parties share the same name but have different UENs, and these UENs do not appear to be connected to a common parent. Based on our internal review, these records seem to be unrelated entities that may have been incorrectly mapped under the same party name.

Below are a few examples for your reference:

Could you please review these cases and confirm whether:

These parties should indeed have distinct UENs (as separate entities), or

If this is a data alignment issue that needs to be corrected in the NACB source.

Please let me know if you need the full list of such records or any additional context (like transaction data or parent hierarchy) to support the validation.

Thank you for your help in resolving this issue.



| **Party Name**   | **UEN 1**   | **UEN 2**   | **Remarks**                     |
| ---------------- | ----------- | ----------- | ------------------------------- |
| [Example Name 1] | [UEN_12345] | [UEN_67890] | No shared/connected parent      |
| [Example Name 2] | [UEN_54321] | [UEN_98765] | Appears as separate entities    |
| [Example Name 3] | [UEN_11223] | [UEN_44556] | Same name but different linkage |









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
