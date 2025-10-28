document.addEventListener('DOMContentLoaded', (event) => {
    const width = 800;
    const height = 800;

    let originalNodesClone;
    let originalLinksClone;
    // Centralized state management
    let state = {};
    let simulations = {};
    let data = {}
    /*let nodes, links;
    let originalNodes, originalLinks;*/
    let linkFrequencies = new Map(); // Use Map for faster lookups
    let filteredParallel;

    const nodeFillColors = {
        "Mar de la Vida OJSC": "blue",
        979893388: "black",
        "Oceanfront Oasis Inc Carriers": "darkred",
        8327: "orange"
    };
    
    const nodeColorScheme = {
        person: "#bed6c0",
        organization: "#cfb1ea",
        company: "#99dba7",
        political_organization: "#eca9bc",
        location: "#6bdbdb",
        vessel: "#e6b792",
        event: "#85c4ec",
        movement: "#d1d48d"
    };
    
    const linkColorScheme = {
        membership: "#bed6c0", 
        partnership: "#cfb1ea", 
        ownership: "#99dba7", 
        family_relationship: "#eca9bc"
    }

    let nodeTypeData = {};
    let linkTypeData = {};

    // Select the container div
    const containerDiv = d3.select('#visualization-content');

    // Define the zoom behavior
    const zoom = d3.zoom()
    .scaleExtent([0.5, 5]) // Set the zoom level range
    .on('zoom', handleZoom); // Handle zoom events

    // Function to handle zoom events
    function handleZoom(event) {
        // Apply the zoom transform to the SVG elements
        containerDiv.selectAll('svg').attr('transform', event.transform);
    }

    // Apply the zoom behavior to each SVG element within the container div
    containerDiv.selectAll('svg').each(function() {
    d3.select(this).call(zoom);
    });

    var selectionRectangle = document.getElementById('selectionRectangle');
    selectionRectangle.style.width = '100px'; // Set initial width
    selectionRectangle.style.height = '50px'; // Set initial height
    selectionRectangle.style.backgroundColor = 'rgba(255,0,0,0.5)'; // Semi-transparent red


    d3.json('MC1.json').then(data => {
        const svgIds = ['svg1', 'svgFiltered0', 'svgFiltered1', 'svgFiltered2', 'svgFiltered3'];

        svgIds.forEach(id => {
        state[id] = {
            nodes: data.nodes.map(node => ({...node, selected: false, searchMatch: false, degree: 0})),
            links: data.links.map(link => ({...link, selected: false })),
        };
        });
        nodes = data.nodes.map(node => ({...node, selected: false, searchMatch: false, degree: 0}));
        links = data.links.map(link => ({...link, selected: false }));  

        // Filter edges to only include "ownership" and "partnership" types
        const originalNodesClone = [...nodes];
        const originalLinksClone = [...links];
        const nodeTypeCounts = {};
        const linkTypeCounts = {};
        links.forEach(link => {
            const key = `${link.source}-${link.target}`;
            linkFrequencies.set(key, (linkFrequencies.get(key) || 0) + 1);
        });
        originalNodesClone.forEach(node => {
            const nodeType = node.type || !node.type;
            nodeTypeCounts[nodeType] = (nodeTypeCounts[nodeType] || 0) + 1;
        });
        originalLinksClone.forEach(link => {
            const linkType = link.type || !link.type;
            linkTypeCounts[linkType] = (linkTypeCounts[linkType] || 0) + 1;
        });

        nodeTypeData = Object.entries(nodeTypeCounts).map(([type, count]) => ({type, count}));
        linkTypeData = Object.entries(linkTypeCounts).map(([type, count]) => ({type, count}));
        createPieChart(nodeTypeData, links, '#nodeTypesPie');
        createPieChart(linkTypeData, links, '#linkTypesPie');

        const parallelGraph = ParallelCoordinateGraph('#lineGraph');
        /*       KNAPP FÖR PARALLEL CORDINATE GRAPH      */

       // Common function to handle selected nodes
        function processSelectedNodes(selectedNodes, selectedSvgId) {
            const processedData = selectedNodes.map(id => ({ id: String(id) })); // Convert to objects with string IDs

            const matchedNodes = nodes.filter(originalNode =>
                processedData.some(processedNode => processedNode.id === String(originalNode.id))
            );

            // Create linkArray containing links between matchedNodes
            const linkArray = originalLinksClone.filter(link => {
                // Check if either source or target is among the selected nodes
                return selectedNodes.includes(String(link.source.id)) && selectedNodes.includes(String(link.target.id));
            });

            state[selectedSvgId].nodes = matchedNodes;
            state[selectedSvgId].links = linkArray;
            filterByType(matchedNodes, linkArray);
        }

        // Event listener for the first button
        document.getElementById('getSelectedNodes').addEventListener('click', () => {
            const selectedNodes = parallelGraph.returnSelectedNodes();
            const selectedSvgId = document.getElementById('svgSelector').value;
            processSelectedNodes(selectedNodes, selectedSvgId);
        });

        // Event listener for the second button
        document.getElementById('getSelectedNodesOnSecondGraphMaybeIfYouDoItCorrect').addEventListener('click', () => {
            const selectedNodes = filteredParallel.returnSelectedNodes();
            const selectedSvgId = document.getElementById('svgSelector').value;
            processSelectedNodes(selectedNodes, selectedSvgId);
        });
        

        
        document.getElementById('getAttributesMaybe').addEventListener('click', (event) => {
            const selectedSvgId = document.getElementById('svgSelector').value;
            
            getAttributeNetwork(selectedSvgId, state[selectedSvgId].nodes, state[selectedSvgId].links);

        });
        document.getElementById('filterCurrentNetwork').addEventListener('click', (event) => {
            const selectedSvgId = document.getElementById('svgSelector').value;
            filterByType(state[selectedSvgId].nodes, state[selectedSvgId].links);

        });
        // Calculate Degree for Each Node
        links.forEach(link => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            if (sourceNode) sourceNode.degree++;
            if (targetNode) targetNode.degree++;
        });
        renderVisualization("svg1", nodes, links);
        // Sequential execution with await
        (async () => {
            await searchNodes("Mar de la Vida OJSC", 'svgFiltered0', originalNodesClone, originalLinksClone, true);
            await searchNodes("979893388", 'svgFiltered1', originalNodesClone, originalLinksClone, true);
            await searchNodes("Oceanfront Oasis Inc Carriers", 'svgFiltered2', originalNodesClone, originalLinksClone, true);
            await searchNodes("8327", 'svgFiltered3', originalNodesClone, originalLinksClone, true);
        })();
        document.getElementById('filterButton').addEventListener('click', () => filterByType(nodes, links));
        document.getElementById('removePieCharts').addEventListener('click', () => removePieCharts());
        document.getElementById('removeParallelCharts').addEventListener('click', () => removeParallelCharts    ());
        document.getElementById('searchInput').addEventListener('input', (event) => {
            searchNodes(event.target.value, document.getElementById('svgSelector').value, originalNodesClone, originalLinksClone, false)
        });
        document.getElementById('findButton').addEventListener('click', function() {
            findNodesAndLinks();
            removeRectangle();
        });
        document.getElementById('createFilteredDiagram').addEventListener('click', () => {
            // Call the function with the second argument set to true to indicate filtering
            filteredParallel = ParallelCoordinateGraph('#filteredContainer', true);
        });
    });
    // Define a function to stop the simulation
    function stopSimulation() {       
        Object.values(simulations).forEach(simulation => {
            simulation.stop(); // Stop each simulation
        });   
    }
    

    function renderVisualization(svgId, nodes, links) {
        const svg = d3.select(`#${svgId}`);
        svg.selectAll("*").remove();
        const zoomContainer = svg.append("g");
        const zoom = d3.zoom()
         .scaleExtent([0.1, 2])
         .on("zoom", function (event) {
                zoomContainer.attr("transform", event.transform);
        });
        svg.call(zoom);
        // Calculate the bounding box of all nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });
        //Does not do anything as of now
        // Calculate the dimensions of the bounding box
        const bboxWidth = maxX - minX;
        const bboxHeight = maxY - minY;
        var svgElement = document.getElementById(`${svgId}`); // Replace 'yourSvgElementId' with the actual ID of your SVG element
        // Using clientWidth and clientHeight
        var svgWidth = svgElement.clientWidth;
        var svgHeight = svgElement.clientHeight;
        // Calculate the desired scale to fit the bounding box within the SVG
        const scaleFactor = Math.min(svgWidth / bboxWidth, svgHeight / bboxHeight);
        // Calculate the translation to center the bounding box
        const translateX = (svgWidth - bboxWidth * scaleFactor) / 2;
        const translateY = (svgHeight - bboxHeight * scaleFactor) / 2;

        // Apply the zoom transform
        svg.call(zoom.transform, new d3.zoomTransform(svg.node(), translateX, translateY, scaleFactor));
        
            function drag(simulation) {
                function dragstarted(event, d) {
                    if (!event.active) simulation.alphaTarget(0.01).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                }
                function dragged(event, d) {
                    d.fx = event.x;
                    d.fy = event.y;
                }
                function dragended(event, d) {
                    if (!event.active) {
                        simulation.alphaTarget(0); 
                        setTimeout(stopSimulation, 1000); // Stop each simulation
                    }
                    d.fx = null;
                    d.fy = null;
                }
                return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
            }

        simulations[svgId] = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links)
            .id(d => d.id)
            .distance(d => d.weight ? 100 / d.weight : 50)) // Adjust link distance based on weight
        .force("charge", d3.forceManyBody()
            .strength(-300)
            .distanceMax(50)
            .distanceMin(10))
        .force("collide", d3.forceCollide(d => Math.max(d.degree > 0 ? d.degree * 1 : 60, 40))
            .iterations(10))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .alphaDecay(0.02); // Adjust alpha decay to a standard value

        // Schedule the simulation to stop after 5 seconds (5000 milliseconds)
        setTimeout(stopSimulation, 1000);
    
        const link = zoomContainer.append("g").attr("class", "links").selectAll("line").data(links).enter().append("line")
         .attr("stroke", d => linkColorScheme[d.type] || "gray")
         .attr("stroke-width", d => {
            const key = `${d.source}-${d.target}`; // Use the same key as before
            const frequency = linkFrequencies[key] || 2; // Get the frequency, default to 1 if not found
            return frequency; // Example: Increase the thickness by the frequency, adjust as needed
        })
         .on("click", function(event, d) {
                deselectAll(svgId);
                d.selected = true;
                d3.select(this).attr("stroke", "red").attr("opacity", 1);
    
                node.attr("opacity", function(nodeData) {
                    return nodeData.selected || isConnected(d.source, nodeData) || isConnected(d.target, nodeData)? 1 : 0.2;
                });
                link.attr("opacity", function(linkData) {
                    return linkData.selected || isConnected(d.source, linkData.source) || isConnected(d.source, linkData.target) || isConnected(d.target, linkData.source) || isConnected(d.target, linkData.target)? 1 : 0.2;
                });
                // Check if d is defined and has an id property
                showDetails(d);
            });
            const node = zoomContainer.append("g").attr("class", "nodes").selectAll("circle").data(nodes).enter().append("circle")
            .attr("r", d => Math.max(d.degree > 0? d.degree * 0.3 : 80, 20)) // Adjust radius based on degree, ensuring a minimum size of 5
            .attr("fill", d => {
                if (nodeFillColors.hasOwnProperty(d.id)) {
                    return nodeFillColors[d.id]; // Return the custom color if the ID matches
                }
                return d.color || (nodeColorScheme[d.type] || "gray");
            })
            .call(drag(simulations[svgId])) //Drag behaviour
            .on("mouseover", function(event, d) {
                d3.select(this).append("title")
                .text(`Id: ${d.id}`);
            })
            .on("click", function(event, d) {
                deselectAll(svgId);
                d.selected = true;
                d3.select(this).attr("fill", "red").attr("opacity", 1);
            
                node.attr("opacity", function(nodeData) {
                    return nodeData.selected || isConnected(d, nodeData)? 1 : 0.2;
                });
            
                link.attr("opacity", function(linkData) {
                    return linkData.selected || isConnected(d, linkData.source) || isConnected(d, linkData.target)? 1 : 0.2;
                });
                createPieChart(nodeTypeData, links, '#connectionsPie', d); // Call createPieChart with empty data and container ID, passing the selected node as nodeData
                showDetails(d);
            });
        simulations[svgId].on("tick", () => {
            node.attr("cx", d => d.x)
            .attr("cy", d => d.y);
            link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        });
    }

    function filterByType(innodes, inlinks) {
        const checkedTypes = Array.from(document.querySelectorAll('.filter-options input:checked')).map(checkbox => checkbox.value);
        const selectedSvgId = document.getElementById('svgSelector').value; // Get the ID of the selected SVG
        const hasNoType = checkedTypes.includes("notype");
        const linkHasNoType = checkedTypes.includes("nolinktype");

        const nodeTypes = ['person', 'organization', 'company', 'political_organization', 'location', 'vessel', 'event', 'movement', 'notype'];
        const linkTypes = ['ownership', 'membership', 'family_relationship', 'partnership', 'nolinktype'];

        // Initialize empty arrays for categorized types
        let categorizedNodeTypes = [];
        let categorizedLinkTypes = [];
        let nodes = [];
        let links = [];


        // Iterate over checked types and categorize them
        checkedTypes.forEach(type => {
            if (nodeTypes.includes(type)) {
                categorizedNodeTypes.push(type);
            } else if (linkTypes.includes(type)) {
                categorizedLinkTypes.push(type);
            }
        });
    
        //  console.log(categorizedLinkTypes); // Example output: ["Ownership", "Membership"]
        if(categorizedNodeTypes.length === 0){  nodes = innodes;  }
        else{
            if (hasNoType) {
                nodes = innodes.filter(node => {
                // Include nodes without a type or nodes with a type that matches the selected types
                return !node.type || categorizedNodeTypes.includes(node.type);
            });}
            else{nodes = innodes.filter(node => categorizedNodeTypes.includes(node.type));}}
       
        if(categorizedLinkTypes.length === 0){
            links = inlinks.filter(link => {
            const sourceNode = nodes.find(node => node.id === link.source.id);
            const targetNode = nodes.find(node => node.id === link.target.id);
            return sourceNode && targetNode;    });
        }
        else{
            links = inlinks.filter(link => {
                const sourceNode = nodes.find(node => node.id === link.source.id);
                const targetNode = nodes.find(node => node.id === link.target.id);
                return sourceNode && targetNode && categorizedLinkTypes.includes(link.type);
            });
        }
        const simulation = simulations[selectedSvgId]
        simulation.stop();
        simulation.nodes(nodes);
        simulation.force("link").links(links);
        simulation.restart();

        state[selectedSvgId].nodes = nodes;
        state[selectedSvgId].links = links;

        renderVisualization(selectedSvgId, nodes, links); // Render filtered nodes and links in selected SVG
    }

    function showDetails(data) {
        // console.log(data)
        const detailsContainer = document.getElementById('detailsContainer');
        if (detailsContainer) {
            detailsContainer.innerHTML = ''; // Clear previous details
    
            // Display node information
            // Assuming 'data' is the selected node
            if (typeof data.id !== "undefined") {
                const connectedLinks = links.filter(link => link.source.id === data.id || link.target.id === data.id);
    
                // Group links by source-target pairs and count occurrences
                const groupedLinks = {};
                const outgoingLinkTypeCounts = {};
                const incomingLinkTypeCounts = {};
                let outgoingCount = 0;
                let incomingCount = 0;
    
                connectedLinks.forEach(link => {
                    const key = `${link.source.id}-${link.target.id}`;
                    if (!groupedLinks[key]) {
                        groupedLinks[key] = { links: [], count: 0 };
                    }
                    groupedLinks[key].links.push(link);
                    groupedLinks[key].count++;
    
                    // Count outgoing and incoming links
                    if (link.source.id === data.id) {
                        outgoingCount++;
                        if (!outgoingLinkTypeCounts[link.type]) {
                            outgoingLinkTypeCounts[link.type] = 0;
                        }
                        outgoingLinkTypeCounts[link.type]++;
                    } else if (link.target.id === data.id) {
                        incomingCount++;
                        if (!incomingLinkTypeCounts[link.type]) {
                            incomingLinkTypeCounts[link.type] = 0;
                        }
                        incomingLinkTypeCounts[link.type]++;
                    }
                });
    
                // Sort the grouped links by count in descending order
                const sortedKeys = Object.keys(groupedLinks).sort((a, b) => groupedLinks[b].count - groupedLinks[a].count);
    
                let detailsTextContent = `<div class="detail-container">
                    <div>ID: ${data.id}</div>
                    <div>Type: ${data.type}</div>
                    ${data.country ? `<div>Country: ${data.country}</div>` : ''}
                </div>`;
    
                // Display total link count and counts by type
                let totalLinkCount = connectedLinks.length;
                detailsTextContent += `<div>Total Links: ${totalLinkCount}</div>`;
                detailsTextContent += `<div>Outgoing Links: ${outgoingCount}</div>`;
                for (const [type, count] of Object.entries(outgoingLinkTypeCounts)) {
                    detailsTextContent += `<div>Outgoing Type ${type}: ${count}</div>`;
                }
                detailsTextContent += `<div>Incoming Links: ${incomingCount}</div>`;
                for (const [type, count] of Object.entries(incomingLinkTypeCounts)) {
                    detailsTextContent += `<div>Incoming Type ${type}: ${count}</div>`;
                }
    
                // Display sorted aggregated links to the selected node
                sortedKeys.forEach(key => {
                    const [sourceId, targetId] = key.split('-');
                    const linkGroup = groupedLinks[key].links;
                    const count = groupedLinks[key].count;
                    const linkType = linkGroup[0].type; // Assuming all links in a group have the same type
    
                    detailsTextContent += `
                    <div class="detail-container">
                        <div>Source: ${sourceId}</div>
                        <div>Target: ${targetId}</div>
                        <div>Type: ${linkType}</div>
                        <div>Count: ${count}</div>
                    </div>`;
                });
    
                detailsContainer.innerHTML = detailsTextContent;
                detailsContainer.style.display = 'block';
            } else {
                const linkType = data.type ? data.type : "Unknown";
                let detailsTextContent = `Source: ${data.source.id}, Target: ${data.target.id}, Link Type: ${linkType}`;
                detailsContainer.innerHTML = detailsTextContent;
                detailsContainer.style.display = 'block';
            }
        } else {
            console.error('Element with ID "detailsContainer" not found.');
        }
    }
    

    function isConnected(a, b) {
        return links.some(function(link) {
            return (link.source === a && link.target === b) || (link.source === b && link.target === a);
        });
    }
    function deselectAll(svgId) {
        // Deselect all nodes and links by updating their properties and visual attributes
        nodes.forEach(node => {
            node.selected = false;
            node.searchMatch = false; // Ensure search matches are also deselected
        });
        links.forEach(link => {
            link.selected = false;
        });
        // Update the visualization to reflect the deselection
        const svg = d3.select(`#${svgId}`);

        // Select and update nodes
        svg.selectAll(".nodes circle")
        .attr("opacity", 1)
        .attr("fill", d => {
            if (nodeFillColors.hasOwnProperty(d.id)) {
                return nodeFillColors[d.id]; // Return the custom color if the ID matches
            }
            return d.color || (nodeColorScheme[d.type] || "gray");
        }); // Use the node's type to determine the color, default to gray if not found

        // Select and update links
        svg.selectAll(".links line")
        .attr("opacity", 1)
        .attr("fill", d => {
            if (nodeFillColors.hasOwnProperty(d.id)) {
                return nodeFillColors[d.id]; // Return the custom color if the ID matches
            }
            return d.color || (nodeColorScheme[d.type] || "gray");
        }); // Change stroke color based on whether the link is selected
    }
    async function searchNodes(name = false, svg = null, originalNodesClone, originalLinksClone, useInput = false) {
        try {
            const searchInput = document.getElementById('searchInput');
        const searchValue = useInput ? name.toLowerCase() : searchInput.value.toLowerCase();
            
        // Reset all nodes to their original state
        state[svg].nodes.forEach(node => {
            node.selected = false;
            node.searchMatch = false; // Add a new property to indicate if a node matches the search
            node.displayDegree = node.degree; // Store original degree
            node.color = nodeColorScheme[node.type]; // Reset color to default
        });
        let linksToUpdate = [];
        let nodesToUpdate = [];
        // If there's a search value, filter the nodes
        if (!searchValue) return; 
        // Initialize an array to hold links that need to be updated          
        // Find and update matched nodes
        originalNodesClone.forEach(node => {
            if (String(node.id).toLowerCase().includes(searchValue)) {
                Object.assign(node, {
                    searchMatch: true,
                    selected: true,
                    displayDegree: node.degree * 1.5,
                    color: 'red'
                });
                nodesToUpdate.push(node);
            }
        });

        // After finding the matched nodes, find their connected nodes and add them to nodesToUpdate
        nodesToUpdate.forEach(matchedNode => {
            originalLinksClone.forEach(link => {
                if ((link.source.id === matchedNode.id || link.target.id === matchedNode.id)) {
                    // Find the other node involved in the link
                    const otherNode = link.source.id === matchedNode.id? link.target : link.source;
                    // Check if the other node is not already in nodesToUpdate to avoid duplicates
                    if (!nodesToUpdate.find(node => node.id === otherNode.id)) {
                        nodesToUpdate.push(otherNode);
                    }
                }
            });
        });
        // For links, you might need to check if they connect to the matched node and update accordingly
        originalLinksClone.forEach(link => {
            if ((String(link.source.id).toLowerCase() === searchValue || String(link.target.id).toLowerCase() === searchValue)) {
                // Highlight the link
                link.selected = true;
                linksToUpdate.push(link);
            }
        });
        // Update the visualization and simulation
        const targetNodes = useInput ? nodesToUpdate : state[svg].nodes;
        const targetLinks = useInput ? linksToUpdate : state[svg].links;
        state[svg].nodes = targetNodes;
        state[svg].links = targetLinks;
        renderVisualization(svg, targetNodes, targetLinks);
        simulations[svg].alpha(0.01).restart();// Wait for user interaction before resetting the simulation speed
        setTimeout(stopSimulation, 100);
        } catch (error){
        console.error('An error occurred:', error);
        }
    }    
    function brushNodes(nodesToBorder) {
        const processedData = nodesToBorder.map(id => String(id));
        // Select all circles within the SVG container
        const svgCircles = d3.selectAll('circle');
        // Reset all circles
        svgCircles
            .attr('stroke', "red")
            .attr('stroke-width', 0);
        // Highlight matched nodes
        svgCircles.each(function(d) {
            if (processedData.includes(String(d.id))) {
                d3.select(this)
                    .attr('stroke', "yellow")
                    .attr('stroke-width', 4);
            }
        });
    }
    function updateTooltipVisibility(tooltip, visibility) {
        tooltip.style("visibility", visibility);
    }
    function updateTooltipPosition(tooltip, event) {
        tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
    }
    
    function collectRedLines() {
        return d3.selectAll("line")
            .filter(function() {
                return d3.select(this).style("stroke") === "red";
            }).nodes();
    }    

    function ParallelCoordinateGraph(containerId, filterStroked = false) {
        const nodeLinksMap = new Map();
        const lines = filterStroked ? collectRedLines().map(line => line.__data__) : links;
    
        lines.forEach(link => {
            const sourceStr = String(filterStroked ? link.source.id : link.source);
            const targetStr = String(filterStroked ? link.target.id : link.target);
    
            if (!nodeLinksMap.has(sourceStr)) nodeLinksMap.set(sourceStr, []);
            if (!nodeLinksMap.has(targetStr)) nodeLinksMap.set(targetStr, []);
    
            nodeLinksMap.get(sourceStr).push(link);
            nodeLinksMap.get(targetStr).push(link);
        });
    
        const nodeData = {};
        nodeLinksMap.forEach((lines, nodeId) => {
            const totalLinks = lines.length;
            const incomingCount = lines.filter(link => String(link.target.id || link.target) === nodeId).length;
            const outgoingCount = lines.filter(link => String(link.source.id || link.source) === nodeId).length;
            const incomingPercent = (incomingCount / totalLinks) * 100;
            const outgoingPercent = (outgoingCount / totalLinks) * 100;
    
            const typeCounts = { family_relationship: 0, membership: 0, partnership: 0, ownership: 0, noType: 0 };
            lines.forEach(link => {
                typeCounts[link.type || 'noType']++;
            });
    
            const totalTypedLinks = Object.values(typeCounts).reduce((a, b) => a + b);
            for (const key in typeCounts) {
                typeCounts[key] = (typeCounts[key] / totalTypedLinks) * 100;
            }
    
            nodeData[nodeId] = {
                links: totalTypedLinks,
                incoming: incomingPercent.toFixed(2),
                outgoing: outgoingPercent.toFixed(2),
                ...Object.fromEntries(Object.entries(typeCounts).map(([key, value]) => [key, value.toFixed(2)]))
            };
        });
    
        const transformedNodes = Object.entries(nodeData).map(([id, data]) => ({ node: id, ...data }));
        const width = 2500, height = 1500, margin = { top: 40, right: 20, bottom: 20, left: 20 };
    
        const keys = ['links', 'outgoing', 'incoming', 'ownership', 'membership', 'family_relationship', 'partnership'];
        const ranges = { links: [0, Math.max(...transformedNodes.map(node => node.links))], ...Object.fromEntries(keys.slice(1).map(key => [key, [0, 100]])) };
        const x = new Map(keys.map(key => [key, d3.scaleLinear().range([margin.left, width - margin.right]).domain(ranges[key])]));
        const y = d3.scalePoint(keys, [margin.top, height - margin.bottom]);
        const color = d3.scaleSequential(x.get('links').domain(), t => d3.interpolateBrBG(1 - t));
    
        const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]).attr("width", width).attr("height", height).style("max-width", "100%").style("height", "auto");
    
        const line = d3.line().defined(([, value]) => value != null).x(([key, value]) => x.get(key)(value)).y(([key]) => y(key));
    
        const tooltip = d3.select(containerId).append("div").style("position", "absolute").style("visibility", "hidden").style("background", "#fff").style("border", "1px solid #000").style("padding", "10px").style("border-radius", "5px").style("font-size", "12px");
    
        const specificStyles = {
            "weeks": { color: "blue", strokeWidth: 8, opacity: 1 },
            "979893388": { color: "black", strokeWidth: 8, opacity: 1 },
            "Calvin Salas": { color: "darkred", strokeWidth: 8, opacity: 1 },
            "8327": { color: "orange", strokeWidth: 8, opacity: 1 },
            "Amanda Mckenzie": { color: "red", strokeWidth: 8, opacity: 1 },
            "160": { color: "yellow", strokeWidth: 8, opacity: 1 },
            "SeaSpray Wave SRL Solutions": { color: "pink", strokeWidth: 8, opacity: 1 },
            "âIllegal": { color: "green", strokeWidth: 8, opacity: 1 }
        };
    
        const path = svg.append("g").attr("fill", "none").attr("stroke-width", 1).attr("stroke-opacity", 0.4).selectAll("path").data(transformedNodes).join("path")
            .attr("stroke", d => specificStyles[d.node] ? specificStyles[d.node].color : color(d.links))
            .attr("stroke-width", d => specificStyles[d.node] ? specificStyles[d.node].strokeWidth : 2)
            .attr("stroke-opacity", d => specificStyles[d.node] ? specificStyles[d.node].opacity : 1)
            .attr("d", d => line(d3.cross(keys, [d], (key, d) => [key, d[key]])))
            .call(handleMouseEvents, tooltip, specificStyles);
    
        const axes = svg.append("g").selectAll("g").data(keys).join("g").attr("transform", d => `translate(0,${y(d)})`).each(function(d) { d3.select(this).call(d3.axisBottom(x.get(d)).tickSize(6).tickPadding(6)); })
            .call(g => g.append("text").attr("x", margin.left).attr("y", -6).attr("text-anchor", "start").attr("fill", "red").attr("font-size", "30px").text(d => d));
    
        axes.selectAll(".tick text").attr("font-size", "12px");
    
        const brush = d3.brushX().extent([[margin.left, -25], [width - margin.right, 25]]).on("start brush end", brushed);
    
        axes.call(brush);
    
        const selections = new Map();
        let selectedNodes = [];
    
        function brushed({ selection }, key) {
            if (selection === null) selections.delete(key);
            else selections.set(key, selection.map(x.get(key).invert));
    
            selectedNodes = [];
            path.each(function(d) {
                const active = Array.from(selections).every(([key, [min, max]]) => d[key] >= min && d[key] <= max);
                d3.select(this).style("stroke", active ? (specificStyles[d.node]?.color || color(d.links)) : "#ddd")
                    .style("stroke-width", active ? (specificStyles[d.node]?.strokeWidth || 1) : 1)
                    .style("stroke-opacity", active ? 1 : 0);
                if (active) {
                    d3.select(this).raise();
                    selectedNodes.push(d.node);
                }
            });
            svg.property("value", selectedNodes).dispatch("input");
            brushNodes(selectedNodes);
        }
    
        function returnSelectedNodes() {
            return selectedNodes;
        }
    
        d3.select(containerId).append(() => svg.node());
    
        return {
            svgNode: svg.node(),
            returnSelectedNodes
        };
    
        function handleMouseEvents(element, tooltip, specificStyles) {
            const initialStates = new WeakMap();
    
            element.on("mouseover", function(event) {
                const d = d3.select(this).datum();
                tooltip.html(`<strong>Node:</strong> ${d.node}<br>
                              <strong>Links:</strong> ${d.links}<br>
                              <strong>Family Relationship:</strong> ${d.family_relationship}<br>
                              <strong>Incoming:</strong> ${d.incoming}<br>
                              <strong>Membership:</strong> ${d.membership}<br>
                              <strong>Outgoing:</strong> ${d.outgoing}<br>
                              <strong>Ownership:</strong> ${d.ownership}<br>
                              <strong>Partnership:</strong> ${d.partnership}`)
                       .style("font-size", "30px")
                       .style("visibility", "visible");
    
                updateTooltipVisibility(tooltip, "visible");
                updateTooltipPosition(tooltip, event);
    
                initialStates.set(this, {
                    strokeWidth: parseFloat(d3.select(this).attr("stroke-width")),
                    opacity: parseFloat(d3.select(this).attr("stroke-opacity"))
                });
    
                d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", specificStyles[d.node]?.strokeWidth || 5);
            })
            .on("mousemove", function(event) {
                updateTooltipPosition(tooltip, event);
            })
            .on("mouseout", function() {
                const storedState = initialStates.get(this);
                if (storedState) {
                    d3.select(this).attr("stroke-opacity", storedState.opacity).attr("stroke-width", storedState.strokeWidth);
                }
                updateTooltipVisibility(tooltip, "hidden");
            });
        }
    }
    let isDragging = false;
    let startX, startY;
    let currentSvg = null; // To keep track of the SVG element being interacted with
    let rect = null; // To keep track of the current rectangle being drawn
    let isTracking = false;
    
    function createBox(svgElement, x, y) {
        // Remove existing rectangle if any
        const existingRect = svgElement.querySelector('rect');
        if (existingRect) {svgElement.removeChild(existingRect);}
        
        rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', 0);
        rect.setAttribute('height', 0);
        rect.setAttribute('fill', 'rgba(255, 0, 0, 0.5)');
        rect.setAttribute('id', `rect-${svgElement.id}`);
        svgElement.appendChild(rect);
    }
    
    function startDrag(event) {
        if (!event.shiftKey || !currentSvg) return; // Ensure Shift key is held and we're interacting with an SVG
        isDragging = true;
        const rectBounds = currentSvg.getBoundingClientRect();
        startX = event.clientX - rectBounds.left;
        startY = event.clientY - rectBounds.top;
        createBox(currentSvg, startX, startY);
        document.addEventListener('mousemove', moveDrag);
    }
    
    function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener('mousemove', moveDrag);
    }
    
    function moveDrag(event) {
        if (!isDragging || !currentSvg) return;
        const rectBounds = currentSvg.getBoundingClientRect();
        const currentX = event.clientX - rectBounds.left;
        const currentY = event.clientY - rectBounds.top;
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        rect.setAttribute('x', Math.min(currentX, startX));
        rect.setAttribute('y', Math.min(currentY, startY));
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
    }
    
    // Assuming your SVGs have IDs like 'svgFiltered0', 'svgFiltered1', etc.
    const svgs = document.querySelectorAll('#svgFiltered0,#svgFiltered1,#svgFiltered2,#svgFiltered3');
    svgs.forEach(svg => {
        svg.addEventListener('mousemove', () => {
            if (isTracking) currentSvg = svg; // Set the current SVG on mousemove if tracking
        });
        svg.addEventListener('mouseover', () => {
            if (isTracking) currentSvg = svg; // Set the current SVG on mouseover if tracking
        });
        svg.addEventListener('mouseout', () => {
            if (isTracking) currentSvg = null; // Reset the current SVG on mouseout if tracking
        });
    });
    
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Shift' && !isTracking) {
            isTracking = true;
            document.addEventListener('mousemove', trackMousePosition);
        }
    });
    
    window.addEventListener('keyup', (event) => {
        if (event.key === 'Shift' && isTracking) {
            isTracking = false;
            endDrag(); // End dragging if Shift key is released
            document.removeEventListener('mousemove', trackMousePosition);
        }
    });
    
    function trackMousePosition(event) {
        if (!isDragging && currentSvg) {
            startDrag(event); // Initialize startDrag on first Shift key press and mouse movement
        }
    }
    
    // Function to remove all SVG rectangles
    function removeRectangle() {
        const svgIds = ['svgFiltered0', 'svgFiltered1', 'svgFiltered2', 'svgFiltered3'];
        svgIds.forEach(id => {
            const svgElement = document.getElementById(id);
            if (svgElement) {
                const rectangles = svgElement.querySelectorAll('rect');
                rectangles.forEach(rect => {
                    if (rect && rect.parentNode) {
                        rect.parentNode.removeChild(rect);
                    }
                });
            }
        });
    }
    
    // Updated findNodesAndLinks function
    function findNodesAndLinks() {
        const svgs = document.querySelectorAll('#svgFiltered0,#svgFiltered1,#svgFiltered2,#svgFiltered3');
        const coveredNodes = [];
        const coveredLinks = [];
        svgs.forEach(svg => {
            const rect = svg.querySelector('rect');
            if (!rect) return;

            const rectBounds = rect.getBoundingClientRect();
            const nodes = svg.querySelectorAll('circle');
            const links = svg.querySelectorAll('line');

            nodes.forEach(node => {
                const nodeBounds = node.getBoundingClientRect();
                const overlapWidth = Math.max(0, Math.min(nodeBounds.right, rectBounds.right) - Math.max(nodeBounds.left, rectBounds.left));
                const overlapHeight = Math.max(0, Math.min(nodeBounds.bottom, rectBounds.bottom) - Math.max(nodeBounds.top, rectBounds.top));
                const overlapArea = overlapWidth * overlapHeight;
                const nodeArea = (nodeBounds.right - nodeBounds.left) * (nodeBounds.bottom - nodeBounds.top);

                if (overlapArea / nodeArea > 0.5) { // Majority of the node is covered
                    coveredNodes.push(node);
                    node.style.stroke = 'red'; // Add red stroke
                    node.style.strokeWidth = 4;
                }
            });
            // Function to check if a link's source or target matches any node ID
            function linkMatchesNodeID(link) {
                // Extract IDs from nodes
                const nodeIDs = coveredNodes.map(circle => circle.__data__.id);
                // Check if the link's source or target matches any node ID
                return nodeIDs.includes(link.source.id) || nodeIDs.includes(link.target.id);
            }
            links.forEach(link => {
                if(linkMatchesNodeID(link.__data__)){
                    coveredLinks.push(link);
                    link.style.stroke = 'red'; // Add red stroke
                }
            });
        });
        console.log('Covered Links:', coveredLinks);
    }
        
    function getAttributeNetwork(svgID, nodes, links) {
        function normalizeType(type) {
            return type === undefined || type === 'nolinktype' ? '' : type;
        }
         // Group nodes by type
    const groupedNodes = nodes.reduce((acc, node) => {
        const type = normalizeType(node.type);
        if (!acc[type]) acc[type] = [];
        acc[type].push(node);
        return acc;
    }, {});

    // Count links associated with each type
    const linkCounts = links.reduce((acc, link) => {
        const sourceType = normalizeType(link.source.type);
        const targetType = normalizeType(link.target.type);
        acc[sourceType] = (acc[sourceType] || 0) + 1;
        acc[targetType] = (acc[targetType] || 0) + 1;
        return acc;
    }, {});

    const aggregatedLinks = links.reduce((acc, link) => {
    const sourceType = normalizeType(link.source.type);
    const targetType = normalizeType(link.target.type);

    const newLink = {
        type: link.type || 'nolinktype',
        source: sourceType || undefined,
        target: targetType || undefined,
        types: { [link.type]: 1 }
    };

    const existingLink = acc.find(l => l.source === newLink.source && l.target === newLink.target);
    if (existingLink) {
        existingLink.count++;
        Object.keys(newLink.types).forEach(type => {
            existingLink.types[type] = (existingLink.types[type] || 0) + newLink.types[type];
        });
    } else {
        newLink.count = 1;
        acc.push(newLink);
    }
    return acc;
    }, []);

    // Transform groupedNodes into an array of aggregated nodes with sizes based on link counts
    const aggregatedNodes = Object.entries(groupedNodes).map(([type, originalNodes]) => {
        return {
            id: type || undefined, // Using type as the identifier, default to 'notype'
            type: type || undefined, // Conditionally assign 'type' or 'notype'
            degree: linkCounts[type] || 0, // Size based on link counts, default to 0 if none
            originalNodes: originalNodes // Keeping a reference to the original nodes
        };
    });

    // Filter out invalid links
    const validAggregatedLinks = aggregatedLinks.filter(link => {
        const sourceNode = aggregatedNodes.find(node => node.id === link.source);
        const targetNode = aggregatedNodes.find(node => node.id === link.target);
        return sourceNode !== undefined && targetNode !== undefined;
    });
    renderAttributeNetwork(svgID, aggregatedNodes, validAggregatedLinks);
    }



    function renderAttributeNetwork(svgId, nodes, links) {
        const svg = d3.select(`#${svgId}`);
        svg.selectAll("*").remove();
        const zoomContainer = svg.append("g");
        const zoom = d3.zoom()
            .scaleExtent([0.05, 2])
            .on("zoom", function (event) {
                zoomContainer.attr("transform", event.transform);
            });
        svg.call(zoom);

        const drag = simulation => {
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.01).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
    
            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }
    
            function dragended(event, d) {
                if (!event.active) {
                    simulation.alphaTarget(0); 
                    setTimeout(stopSimulation, 1000);
                }
                d.fx = null;
                d.fy = null;
            }

            return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
        }

        const simulations = {};
        simulations[svgId] = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(50))
            .force("charge", d3.forceManyBody().strength(-100).distanceMax(40).distanceMin(5))
            .force("collide", d3.forceCollide(d => Math.max(d.degree * 0.4, 40)).iterations(10))
            .force("center", d3.forceCenter(svg.node().clientWidth / 2, svg.node().clientHeight / 2))
            .alphaDecay(0.02);

        const link = zoomContainer.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("stroke", "#c2ffc1")
            .attr("stroke-width", d => d.count * 0.5 || 1)
            .on("mouseover", function(event, d) {
                const typesCount = Object.entries(d.types)
                    .map(([type, count]) => `${type}: ${count}`)
                    .join(", ");
                const sourceNode = d.source.id || d.source; // Adjust this based on your data structure
                const targetNode = d.target.id || d.target; // Adjust this based on your data structure
                d3.select(this).append("title")
                    .text(`Source: ${sourceNode}, Target: ${targetNode}, Types: ${typesCount}, Total: ${d.count}`);
            })
            .on("click", function(event, d) {
                link.attr("stroke", "#c2ffc1").attr("opacity", 1);                
                d.selected = true;
                d3.select(this).attr("stroke", "red").attr("opacity", 1);                
                showDetails(d);   
            });

        const node = zoomContainer.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("r", d => Math.max(d.degree * 0.05, 25))
            .attr("fill", d => nodeFillColors[d.id] || nodeColorScheme[d.type] || "gray")
            .call(drag(simulations[svgId]))
            .on("mouseover", function(event, d) {
                d3.select(this).append("title")
                    .text(`Type: ${d.id}`);
            })
            .on("click", function(event, d) {
                createPieChart(data, links, '#connectionsPie', d);
            });
            

        simulations[svgId].on("tick", () => {
            node.attr("cx", d => d.x)
                .attr("cy", d => d.y);
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
        });
    }

    // Function to create pie charts
    function createPieChart(data, links, containerId, nodeData = null) {
        const svg = d3.select(containerId).append("svg")
            .attr("width", 300)
            .attr("height", 300)
            .append("g")
            .attr("transform", "translate(150, 150)");

        const svg2 = d3.select(containerId).append("svg")
            .attr("width", 300)
            .attr("height", 300)
            .append("g")
            .attr("transform", "translate(150, 150)");

        if (nodeData) {
            let sendingTypes = {};
            let receivingTypes = {};
            links.forEach(link => {
                if (link.source === nodeData) {
                    const type = link.type;
                    sendingTypes[type] = (sendingTypes[type] || 0) + 1;
                }
            });
            links.forEach(link => {
                if (link.target === nodeData) {
                    const type = link.type;
                    receivingTypes[type] = (receivingTypes[type] || 0) + 1;
                }
            });

            // Convert connectionTypes object to array for pie chart
            const sentData = Object.entries(sendingTypes).map(([type, count]) => {
                const color = linkColorScheme[type];
                return { type, count, color };
            });
            const receivedData = Object.entries(receivingTypes).map(([type, count]) => {
                const color = linkColorScheme[type];
                return { type, count, color };
            });

            // Calculate total sent and received counts
            const totalSent = sentData.reduce((sum, d) => sum + d.count, 0);
            const totalReceived = receivedData.reduce((sum, d) => sum + d.count, 0);

            if (sentData.length > 0) {
                svg.append("text")
                    .attr("x", 0)
                    .attr("y", -130)
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .text(nodeData.id + " is sending " + totalSent + " links");

                const pie = d3.pie().value(d => d.count)(sentData);
                const arc = d3.arc().innerRadius(0).outerRadius(100);

                svg.selectAll(".sent-path")
                    .data(pie)
                    .enter().append("path")
                    .attr("class", "sent-path")
                    .attr("d", arc)
                    .attr("fill", d => d.data.color)
                    .each(function(d) { this._current = d; });

                svg.selectAll(".sent-text")
                    .data(pie)
                    .enter().append("text")
                    .attr("class", "sent-text")
                    .attr("transform", d => `translate(${arc.centroid(d)})`)
                    .attr("dy", ".35em")
                    .text(d => d.data.type);
            }

            if (receivedData.length > 0) {
                svg2.append("text")
                    .attr("x", 0)
                    .attr("y", -130)
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .text(nodeData.id + " is receiving " + totalReceived + " links");

                const pie2 = d3.pie().value(d => d.count)(receivedData);
                const arc2 = d3.arc().innerRadius(0).outerRadius(100);

                svg2.selectAll(".received-path")
                    .data(pie2)
                    .enter().append("path")
                    .attr("class", "received-path")
                    .attr("d", arc2)
                    .attr("fill", d => d.data.color)
                    .each(function(d) { this._current = d; });

                svg2.selectAll(".received-text")
                    .data(pie2)
                    .enter().append("text")
                    .attr("class", "received-text")
                    .attr("transform", d => `translate(${arc2.centroid(d)})`)
                    .attr("dy", ".35em")
                    .text(d => d.data.type);
            }
        } else {
            const pie = d3.pie().value(d => d.count)(data);
            const arc = d3.arc().innerRadius(0).outerRadius(100);

            svg.selectAll(".path")
                .data(pie)
                .enter().append("path")
                .attr("class", "path")
                .attr("d", arc)
                .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
                .each(function(d) { this._current = d; });

            svg.selectAll(".text")
                .data(pie)
                .enter().append("text")
                .attr("class", "text")
                .attr("transform", d => `translate(${arc.centroid(d)})`)
                .attr("dy", ".35em")
                .text(d => d.data.type);
        }
    }
    // Function to remove pie charts
    function removePieCharts() {
        d3.select('#nodeTypesPie').html("");
        d3.select('#linkTypesPie').html("");
        d3.select('#connectionsPie').html("");
    }
    function removeParallelCharts() {
        d3.select('#filteredContainer').html("");
    }

});
