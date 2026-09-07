import { useState } from 'react'
import CompareSection from './CompareSection.jsx'
import NodeDetail from './NodeDetail.jsx'
import PhaseLegend from './PhaseLegend.jsx'
import ProductTabs from './ProductTabs.jsx'
import ProductTopology from './ProductTopology.jsx'
import { getProduct, products, scenario } from '../data/products.js'

const COMPARE = 'compare'

const tabs = [
  ...products.map((product) => ({
    id: product.id,
    name: product.name,
    vendor: product.vendor,
  })),
  { id: COMPARE, name: 'Compare all three', vendor: 'Side by side', standalone: true },
]

export default function TraceExplorer({ target, compare = false, onTabChange }) {
  const [productId, setProductId] = useState(target?.productId ?? products[0].id)
  const [nodeId, setNodeId] = useState(target?.nodeId ?? null)
  const [engineStep, setEngineStep] = useState(-1)

  // Arriving from a lesson: open that product on the component that does the
  // job the lesson explained. Adjusted during render so there is no flash.
  const [seenJump, setSeenJump] = useState(target?.nonce ?? null)
  if (target && target.nonce !== seenJump) {
    setSeenJump(target.nonce)
    setProductId(target.productId)
    setNodeId(target.nodeId ?? null)
    setEngineStep(-1)
  }

  const product = getProduct(productId)
  const node = product.nodes.find((item) => item.id === nodeId) ?? product.nodes[0]
  const zone = product.zones.find((item) => item.id === node.zone)

  function handleTabChange(nextId) {
    if (nextId !== COMPARE) {
      setProductId(nextId)
      setNodeId(null)
      setEngineStep(-1)
    }
    onTabChange?.(nextId)
  }

  function selectNode(id) {
    setNodeId(id)
    setEngineStep(-1)
  }

  return (
    <div className="flex flex-col gap-6">
      <ProductTabs
        items={tabs}
        selectedId={compare ? COMPARE : productId}
        onChange={handleTabChange}
      />

      {compare ? (
        <CompareSection />
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {product.name} — the pipeline actually running
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {product.tagline} Click any box to open what it does inside.
                </p>
              </div>
              <PhaseLegend />
            </header>

            <ProductTopology
              productId={productId}
              selectedNodeId={node.id}
              onSelectNode={selectNode}
            />

            <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                The idea behind the design:
              </span>{' '}
              {product.bigIdea}
            </p>
          </section>

          <section
            aria-label="Selected component"
            className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-950"
          >
            <NodeDetail
              node={node}
              zone={zone}
              engineStep={engineStep}
              onSelectStep={setEngineStep}
            />
            <p className="mt-5 border-t border-slate-200 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Component names and stage lists follow{' '}
              <a
                href={product.docs.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-sky-600 dark:hover:text-sky-400"
              >
                {product.docs.label}
              </a>
              . Tracing: {scenario.summary}.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
