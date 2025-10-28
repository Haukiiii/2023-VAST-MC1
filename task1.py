import json
import codecs
import networkx as nx
from pyvis.network import Network
# Read the JSON file with the 'utf-8-sig' encoding
with codecs.open('MC1.json', 'r', encoding='utf-8-sig') as file:
    data = json.load(file)

# Write the JSON data back to a new file with the 'utf-8' encoding
with open('MC1_fixed.json', 'w', encoding='utf-8') as file:
    json.dump(data, file, ensure_ascii=False, indent=4)

# Read the fixed JSON file with the 'utf-8' encoding
with open('MC1_fixed.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Step 2: Extract nodes and links
nodes = data['nodes']
links = data['links']

# Calculate node degree (sum of inward and outward connections)
# Convert the links to a NetworkX MultiDiGraph
G = nx.MultiDiGraph()
G.add_weighted_edges_from([(link['source'], link['target'], link.get('weight', 0.0)) for link in links])

# Filter the nodes and links using NetworkX
# For example, let's keep only nodes with a degree greater than 1
node_degrees = G.degree()
nodes_to_keep = [node[0] for node in node_degrees if node[1] > 20]
H = nx.subgraph(G, nodes_to_keep)
# Convert the filtered NetworkX graph to a list of nodes and links for Pyvis
nodes = [{'id': node_id, 'type': node_data.get('type', ''), 'dataset': node_data.get('dataset', ''), 'country': node_data.get('country', '')} for node_id, node_data in H.nodes(data=True)]
links = [{'source': link[0], 'target': link[1], 'type': link[2].get('type', ''), 'weight': link[2].get('weight', 0.0)} for link in H.edges(data=True)]

# Step 3: Create a Pyvis network object
net = Network(directed=True, height="480px", width="50%")
net.repulsion()
net_selected = Network(height="50%", width="50%",bgcolor="#222222")

# Step 4: Add nodes with attributes
for node in nodes:
    # Provide default values for missing attributes
    node_id = node['id']
    node_type = node.get('type', '')
    node_dataset = node.get('dataset', '')
    node_country = node.get('country', '')
    
    net.add_node(node_id, type=node_type, dataset=node_dataset, country=node_country)
# Step 5: Add links with attributes
for link in links:
    # Provide default values for missing attributes
    link_source = link['source']
    link_target = link['target']
    link_type = link.get('type', '')
    link_weight = link.get('weight', 0.0)
    link_dataset = link.get('dataset', '')
    link_key = link.get('key', 0)
    
    # Generate unique link ID to differentiate multiple links between the same nodes
    link_id = f"{link_source}_{link_target}"
    
    net.add_edge(link_source, link_target, type=link_type, weight=link_weight, dataset=link_dataset, key=link_key, title=link_id)


# Apply lazy loading
net.toggle_physics(False)  # Disable physics for faster loading
net.set_options("""
{
    "nodes": {
        "shape": "dot",
        "scaling": {
            "min": 10,
            "max": 30
        }
    },
    "links": {
        "color": "gray",
        "smooth": false
    },
    "physics": {
        "enabled": true,
        "barnesHut": {
            "gravitationalConstant": -2000,
            "centralGravity": 1,
            "springLength": 1,
            "springConstant": 1,
            "damping": 0.1
        }
    }
}
""")
net.options = {
    "layout": {
        "improvedLayout": False,
    },
    "width": "100%",
    "height": "100%"
}

# Step 6: Visualize the network
net.show('your_network.html')