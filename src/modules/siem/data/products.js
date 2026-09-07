import qradar from './products/qradar.js'
import splunk from './products/splunk.js'
import wazuh from './products/wazuh.js'

/** Add a product file, register it here, and the UI picks it up. */
export const products = [qradar, splunk, wazuh]

export function getProduct(id) {
  return products.find((product) => product.id === id) ?? products[0]
}

/** The one event every product is tracing, shown in the header. */
export const scenario = {
  id: 'failed-login',
  title: 'Failed login attempt',
  summary: 'Windows Server 2019 · Event ID 4625 · bad password over RDP · repeated 11 times in 2 minutes',
}
