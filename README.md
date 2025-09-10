Following up on my last update, I want to let you know that besides working on our current D3 implementation, I’ve been evaluating other technologies that might help with our graph visualisation challenges.

In particular, I’ve spent time exploring Azure Cosmos DB and the KeyLines library from Cambridge Intelligence. The KeyLines and KronoGraph toolkits are designed specifically for graph and timeline visualisation, and they integrate directly with Azure Cosmos DB’s Gremlin API
cambridge-intelligence.com
. Cambridge Intelligence notes that many users combine Cosmos DB with KeyLines because Cosmos DB supports multiple data models (including graph, MongoDB, Cassandra and SQL), and their toolkits can visualise all of them
cambridge-intelligence.com
. Seeing how these tools handle graph embeddings and neighbour expansions has given me new ideas for optimising our own viewer.

I’m continuing to incorporate the lessons from these tests into our code. I’m confident that by next week, I’ll either have resolved the remaining issues or be ready to recommend whether an external library would be more efficient for our needs.
