I wanted to update you on the BMO graph visualisation work. Over the past week I’ve been focused on stabilising the node‑expansion behaviour in our D3‑based viewer. The main challenge has been that expanding a node adds its neighbours to the graph, but their positions sometimes overlap or drift, causing the whole layout to feel inconsistent.

So far I’ve implemented:

Removing the global re‑layout on node expansion, so existing nodes stay in place.

Dynamically placing new neighbours around the clicked node in one or more rings to prevent overlap.

Adjusting the placement radius based on the number of neighbours.

These changes have eliminated collisions, but there’s still a residual “drift” when the force simulation is active. I’ve identified that this is due to the underlying physics engine continuing to adjust positions after new nodes are added. I’m currently testing a solution that freezes the positions of existing nodes during neighbour expansion and carefully manages the simulation restart.

I’m confident that with these adjustments, and a bit more testing, we can deliver a clean and predictable expansion behaviour. I expect to have the updated version ready by next week, and I’ll keep you posted on any further progress.

Thank you for your patience—I’m on top of this and will follow up with a working demo shortly.

Best regards,
