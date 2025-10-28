// Create hierarchy data structure
//var ROOTS;
var nodeMap;
document.addEventListener('DOMContentLoaded', (event) => {
    d3.json('MC1.json').then(data => {
        const uniqueNodes = Array.from(new Set(data.nodes.map(node => JSON.stringify(node)))).map(nodeStr => JSON.parse(nodeStr));
        const uniqueLinks = Array.from(new Set(data.links.map(link => JSON.stringify(link)))).map(linkStr => JSON.parse(linkStr));

        nodes = uniqueNodes;
        links = uniqueLinks;
        //console.log("nodes: ", nodes)
        //console.log("links: ", links)
        filterNodes();
        filterEdges();
        //console.log("links: ", links)
        const ROOTS = createHierarchy(nodes, links);
        
        // Call the draw function inside the JSON loading promise
        drawHierarchy(ROOTS, 2);
    });
});

// Filter nodes based on their types
function filterNodes() {
    nodes = nodes.filter(node => {
        return node.type && ["person", "organization", "company", "political_organization", "location", "vessel", "event", "movement"].includes(node.type);
    });
}

// Filter edges to only include "ownership" and "partnership" types
function filterEdges() {
    links = links.filter(edge => {
        return edge.type && ["ownership", "membership"].includes(edge.type);
    });
}

// Create hierarchy data structure
// Create hierarchy data structure
function createHierarchy(nodesData, linksData) {
    nodeMap = new Map(nodesData.map(node => [String(node.id), {id: node.id, 
        type: node.type, 
        children: [], 
        hasParent: false, 
        depth: 0 }]));
   
    //console.log(nodeMap)
    // Connect nodes based on links data
    linksData.forEach(link => {
        const sourceNodeId = String(link.source);
        const targetNodeId = String(link.target);

        const sourceNode = nodeMap.get(sourceNodeId);
        const targetNode = nodeMap.get(targetNodeId);

        //console.log("Source Node: ", sourceNode);
        //console.log("Target Node: ", targetNode);

        if (sourceNode && targetNode) {
            if (!isAncestor(sourceNode, targetNode)) {
                sourceNode.children.push(targetNode);
                targetNode.hasParent = true; // Set the hasParent flag for the target node
                targetNode.depth = sourceNode.depth + 1; // Update depth of target node
            }
        }
    });

    // Find root nodes
    const roots = Array.from(nodeMap.values()).filter(node => {
        // Check if the node is a source of an "ownership" link and has no parent
        const isOwnershipSource = linksData.some(link => link.source === parseInt(node.id) && link.type === "ownership");
        const hasNoParent =!node.hasParent;
        return isOwnershipSource && hasNoParent;
    });

    //console.log("Roots from createHierarchy: ", roots);
    return roots;

    // Function to check if a node is a descendant of another node
    function isAncestor(ancestor, node) {
        if (!ancestor || !node) {
            return false;
        }
        if (ancestor === node) {
            return true;
        }
        // Ensure node.children is defined and is an array before calling some
        if (Array.isArray(node.children)) {
            return node.children.some(child => isAncestor(ancestor, child));
        }
        // If node.children is not an array or is undefined, return false
        return false;
    }
}

function trimHierarchy(node, depth) {
    if (depth === 0) return null;
    node.children = node.children.map(child => trimHierarchy(child, depth - 1)).filter(child => child !== null);
    return node;
   }

// Draw the hierarchy using D3
function drawHierarchy(roots, maxDepth) {
    // Adjusted data structure to include children array
    const root = {id: "Root", children: roots};
    let trimmedRoot = structuredClone(root);

    // Create a d3.tree layout
    const treeLayout = d3.tree().size([window.innerHeight, window.innerWidth - 200]); // Adjusted size for better visibility
    trimmedRoot = trimHierarchy(trimmedRoot, maxDepth);

    // Generate nodes and links using the tree layout
    const treeData = treeLayout(d3.hierarchy(trimmedRoot));

    let debounceTimeout;
    function handleClick(d) {
        clearTimeout(debounceTimeout);

        // Show the spinner
        document.querySelector('.loading-state').style.display = 'flex';

        debounceTimeout = setTimeout(() => {
            // Toggle the children property of the clicked node
            d.children = d.children ? null : findNodeById(d.srcElement.__data__.data.id).children;

            // Redraw the hierarchy with the updated node structure
            if (d.children) {
                // Only redraw if there are children
                drawHierarchy(roots, d.children[0].depth + 2);
            } else {
                // Redraw with the original depth if there are no children
                drawHierarchy(roots, d.srcElement.__data__.data.depth);
            }

            // Hide the spinner after the operation is complete
            document.querySelector('.loading-state').style.display = 'none';
        }, 300); // Adjust delay as needed
    }

    // Function to find a node by its ID in the roots hierarchy
    function findNodeById(id) {
        return nodeMap.get(String(id));
    }

    // Update the width attribute of the SVG container
    const svg = d3.select("#hierarchy")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight)
        .style("border", "1px solid black"); // Add border around the hierarchy

    window.addEventListener("resize", () => {
        svg.attr("width", window.innerWidth)
            .attr("height", window.innerHeight);
    });

    svg.call(d3.zoom().on('zoom', e => {
        svg.selectAll('.node').attr('transform', d => `translate(${e.transform.apply([d.y * 0.5, d.x])})`);
        svg.selectAll('.link,.ancestor-link').attr('d', d3.linkHorizontal().x(d => e.transform.apply([d.y * 0.5, d.x])[0]).y(d => e.transform.apply([d.y, d.x])[1]));
    }));

    // Assuming `treeData.descendants()` returns an array of all nodes including the root
    const filteredDescendants = treeData.descendants().filter(d => d.depth > 0);

    // Draw nodes
    const nodes = svg.selectAll(".node")
        .data(filteredDescendants)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.y * 0.5},${d.x})`) // Scale down the horizontal position
        .style("fill", d => hasChildren(d) ? "green" : "black"); // Color nodes with children in green

    // Function to check if a node has children
    function hasChildren(node) {
        const nodeId = node.data.id;
        const rootNode = findNodeById(nodeId);
        return rootNode && rootNode.children && rootNode.children.length > 0;
    }

    nodes.append("circle")
        .attr("r", 4.5)
        .attr("data-id", d => d.data.id); // Ensure data-id is set correctly

    // Add labels to nodes
    nodes.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.children ? -6 : 6)
        .attr("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.id)
        .attr("data-id", d => d.data.id); // Ensure data-id is set correctly

    // Draw links
    svg.selectAll(".link")
        .data(treeData.links().filter(link => link.source.depth !== 1 && link.target.depth !== 1)) // Exclude links involving the first node
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal().x(d => d.y * 0.5).y(d => d.x)); // Scale down the horizontal position

    svg.selectAll(".ancestor-link")
        .data(treeData.descendants().filter(d => d.depth > 1).map(d => ({ source: d.parent, target: d })))
        .enter().append("path")
        .attr("class", "ancestor-link")
        .attr("d", d3.linkHorizontal().x(d => d.y * 0.5).y(d => d.x)) // Scale down the horizontal position
        .style("stroke", "purple")
        .style("fill", "none");

    // Attach click event listener to nodes
    nodes.on("click", handleClick);

    document.getElementById('searchBar').addEventListener('input', function(event) {
        const searchTerm = event.target.value.toLowerCase();
        const matchingNodes = [];

        // Iterate over the keys of the nodeMap
        nodeMap.forEach((value, key) => {
            // Check if the node's ID includes the search term
            if (value.id.toString().toLowerCase().includes(searchTerm)) {
                matchingNodes.push(value);
            }
        });

        // Clear previous highlights
        svg.selectAll('.highlight').remove();

        // Highlight matching nodes
        matchingNodes.forEach(node => {
            const g = svg.select(`.node[data-id="${node.id}"]`);
            g.classed('highlight', true);
        });

        // Check if there are any matching nodes and move the view to the first one
        if (matchingNodes.length > 0) {
            //moveViewToNode(matchingNodes[0]);
        }
    });
    function moveViewToNode(node) {
        //console.log(node);
        // Calculate the center of the node for a better view
        const centerX = node.y;
        const centerY = node.x;
    
        // Apply a transition to the SVG container to move the view
        svg.transition().duration(750).call(d3.zoom().transform, d3.zoomIdentity.translate(centerX, centerY));
    
        // Update the 'd' attribute of.link and.ancestor-link elements to reflect the new position
        svg.selectAll('.link,.ancestor-link')
          .attr('d', d3.linkHorizontal()
              .x(d => d.y - centerX) // Adjust the x-coordinate based on the new position
              .y(d => d.x - centerY)); // Adjust the y-coordinate based on the new position
    }
}


