import Simulation from './modules/Simulation.js'
// import Translator from './modules/Translator.js'

// const translator = new Translator({
//   persist: true,
//   languages: ['de'],
//   detectLanguage: true
// })
// translator.load('de')

/**
 * Waits for the current simulation to complete and the restarts it
 *
 * @param {Node} node The `.simulation` node
 * @param {Function} sim The simulation instance
 */
async function simulationRunner (node, sim) {
  if (sim.active) return
  node.classList.add('running')
  await sim.start()
  node.classList.remove('running')
}

// Start simulations on page load and make them restartable
for (const node of document.querySelectorAll('.simulation')) {
  const cid = (node.querySelector('canvas')).id
  const sim = new Simulation(cid)

  node.addEventListener('click', () => {
    simulationRunner(node, sim)
  })
  simulationRunner(node, sim)
}

/**
 * Repositions the range output
 *
 * @param {string} node The range node
 */
function reposition (node) {
  const output = node.nextElementSibling
  output.value = node.value
  output.style.setProperty('--width', `calc(${node.offsetWidth}px - 1.5em)`)
  node.parentNode.style.setProperty('--val', +node.value)
}

// Handle range inputs (cross-browser)
for (const node of document.querySelectorAll('.range input')) {
  node.addEventListener('input', () => { reposition(node) }, false)
  reposition(node)
}

// Update number of moving people in the right simulation
const range = document.querySelector('#range-movers')
range.addEventListener('input', () => {
  const cid = range.dataset.ref
  const canvas = document.querySelector(`#${cid}`)
  canvas.dataset.movers = range.value
  canvas.parentElement.dataset.canvasPopulation = range.value
}, false)

// Refer to mobile or desktop website based on device
const isMobile = /Mobi|Android/i.test(navigator.userAgent)

for (const item of document.querySelectorAll('[data-href-mobile]')) {
  item.setAttribute('href', item.dataset[`href${isMobile ? 'Mobile' : 'Desktop'}`])
}