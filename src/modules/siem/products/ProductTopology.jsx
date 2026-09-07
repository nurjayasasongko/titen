import TopologyScene from '../../../components/topology/TopologyScene.jsx'
import qradar from '../data/products/topology/qradar.js'
import splunk from '../data/products/topology/splunk.js'
import wazuh from '../data/products/topology/wazuh.js'

const specs = { qradar, splunk, wazuh }

/**
 * The product's real pipeline, running. Boxes map back to the component
 * detail below, so clicking the thing you just watched do something opens
 * the explanation of how it does it.
 */
export default function ProductTopology({ productId, selectedNodeId, onSelectNode }) {
  const spec = specs[productId]
  if (!spec) return null

  const selectedBox =
    spec.nodes.find((node) => node.detail === selectedNodeId)?.id ?? null

  return (
    <TopologyScene
      spec={spec}
      key={spec.id}
      selectedNodeId={selectedBox}
      onSelectNode={(boxId) => {
        const detail = spec.nodes.find((node) => node.id === boxId)?.detail
        if (detail) onSelectNode(detail)
      }}
      footnote={spec.footnote}
    />
  )
}
