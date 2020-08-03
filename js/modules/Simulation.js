/**
 * Creates a new simulation instance
 */
export default class Simulation {
  /**
   * Simulation constructor
   *
   * @param {string} cid Expects an CSS selector of the canvas
   */
  constructor (cid) {
    /**
     * ## Configuration parameters
     *
     * ### Simulation globals
     */
    // Canvas of the current simulation instance
    this.canvas = document.querySelector(`#${cid}`)
    // Canvas for statistics display
    this.statCanvas = document.querySelector(`canvas[data-ref="${cid}"]`)
    // Text element for statistics display
    this.statTextNode = document.querySelector(`p[data-ref="${cid}"]`)
    // Runtime in frames
    this.frames = 0
    // Track if simulation is running
    this.active = false

    /**
     * ### Person states
     */
    // Four simulated person states
    this.healthy = 'hsl(76, 56%, 61%)' // 'hsl(0, 0%, 82%)'
    this.infected = 'hsl(352, 67%, 57%)'
    this.cured = 'hsl(196, 100%, 47%)'
    this.dead = 'hsl(0, 0%, 10%)'
    // Extra color for infected people exceeding hospital capacity
    this.emergency = 'hsl(358, 70%, 44%)'
    // Order of states in generated graph, from bottom upwards
    this.order = { [this.infected]: 0, [this.cured]: 1, [this.healthy]: 2, [this.dead]: 3 }
    // Display names for states
    this.labels = {
      [this.infected]: 'Infected',
      [this.healthy]: 'Healthy',
      [this.cured]: 'Recovered',
      [this.dead]: 'Dead'
    }

    /**
     * ### Simulation parameters
     */
    // Hospital capacity line color
    this.hospital = 'hsl(0, 0%, 10%)'
    // Hospital capacity as percentage of simulation population
    this.capacity = 0.5
    // Simulated person (disk) radius in CSS pixels
    this.radius = 5
    // Simulated person celerity in CSS pixels moved per frame
    this.celerity = 2
    // Minimum time until infection passes in frames
    this.curetime = 300
    // Chance to survive a frame while infected
    this.survive = 0.99999
    // Framerate interval at which each simulation data is calculated
    this.fpsInterval = 1000 / 55

    /**
     * ### Runtime internals
     */
    // Text statistics of last frame
    this.lastStats = undefined
  }

  /**
   * ## Utility Functions
   */
  /**
   * Generates a random integer
   *
   * @param {number} max Maximum number to be generated
   * @returns {number} Random number
   */
  randomInt (max) {
    return Math.floor(Math.random() * Math.floor(max))
  }

  /**
   * Calculates the distance between two persons
   *
   * @param {number} alice Person one
   * @param {number} bob Person two
   * @returns {number} The calculated distance
   */
  distance (alice, bob) {
    return Math.sqrt(Math.pow(alice.x - bob.x, 2) +
      Math.pow(alice.y - bob.y, 2)) - alice.r - bob.r
  }

  /**
   * Calculates the direction of two persons
   *
   * @param {number} alice Person one
   * @param {number} bob Person two
   * @returns {number} The calculated direction
   */
  direction (alice, bob) {
    return Math.atan2(bob.y - alice.y, bob.x - alice.x)
  }

  /**
   * Waits for a specified amount of time
   *
   * @param {number} ms Milliseconds to wait
   * @returns {Promise} The promise to resolve
   */
  wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * A faster `.map()` implementation for arrays
   *
   * @param {Array} subject The array (or array-like) to map over
   * @param {Function} fn The mapper function
   * @returns {Array} The array containing the results
   */
  fastMap (subject, fn) {
    const length = subject.length
    const result = new Array(length)

    for (let i = 0; i < length; i++) {
      result[i] = fn(subject[i], i, subject)
    }

    return result
  }

  /**
   * ## Simulation Functions
   */
  /**
   * Displays statistics as text
   *
   * @param {Array} stats Array of objects with state color and person count
   */
  print (stats) {
    const p = this.statTextNode
    // Save unnecessary repaint if stats haven't changed
    if (!p || JSON.stringify(stats) === this.lastStats) return
    this.lastStats = JSON.stringify(stats)

    // Fastest way to remove all child elements (e.g. faster than `.innerHTML = ''`)
    while (p.firstChild) p.firstChild.remove()

    stats.forEach(f => {
      const color = f[0]
      const count = f[1]
      const span = document.createElement('span')
      span.style.color = color
      span.textContent = `${this.labels[color]}: ${count}`
      p.appendChild(span)
      p.appendChild(document.createElement('br'))
    })
  }

  /**
   * Displays statistics graphically
   *
   * @param {Array} people The simulation's population
   */
  record (people) {
    people.sort((alice, bob) => this.order[alice.state] - this.order[bob.state])
    const treatable = Math.floor(people.length * this.capacity)

    const canvas = this.statCanvas
    const ctx = canvas.getContext('2d')
    const states = this.fastMap(people, p => p.state)

    // Clear canvas when simulation is restarted
    if (this.frames === 0) ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Shift image to the left by one pixel
    if (++this.frames > canvas.width) {
      ctx.putImageData(ctx.getImageData(1, 0, canvas.width - 1, canvas.height), 0, 0)
    }

    const x = Math.min(this.frames, canvas.width)
    states.forEach((state, index) => {
      if (state === this.infected && index > treatable) state = this.emergency
      ctx.fillStyle = index === treatable ? this.hospital : state
      ctx.fillRect(x - 1, canvas.height - index, 1, 1)
    })

    const stats = [...new Set(states)].map(
      x => [x, states.filter(y => y === x).length]
    )

    this.print(stats)
  }

  /**
   * ### Run the Simulation
   *
   */
  /**
   * Updates peoples states and positions
   *
   * @param {Array} person The person
   * @param {Array} people The simulation's population
   * @returns {Array} The updated person
   */
  update (person, people) {
    if (person.moves()) {
      person.x += Math.cos(person.angle) * person.c
      person.y += Math.sin(person.angle) * person.c
    }

    const cases = people.filter(p => p.state === this.infected).length
    const treatable = people.length * this.capacity

    if (person.state === this.infected) {
      if (person.ttc > 0) {
        if (Math.random() > this.survive || (cases > treatable && Math.random() > this.survive * 0.9997)) {
          person.state = this.dead
          person.moves = () => false
        }
        if (Math.random() > (cases - treatable) / people.length) person.ttc--
      } else {
        person.state = this.cured
      }
    }

    return person
  }

  /**
   * Detects wall collisions
   *
   * @param {Array} person The person
   * @returns {Array} The person's wall collisions
   */
  wallies (person) {
    let deltaX = Math.cos(person.angle) * person.c
    let deltaY = Math.sin(person.angle) * person.c

    if (person.x < person.r) {
      deltaX = Math.abs(deltaX)
    } else if (person.x > this.canvas.width - person.r) {
      deltaX = -1 * Math.abs(deltaX)
    }

    if (person.y < person.r) {
      deltaY = Math.abs(deltaY)
    } else if (person.y > this.canvas.height - person.r) {
      deltaY = -1 * Math.abs(deltaY)
    }

    person.angle = Math.atan2(deltaY, deltaX)
    return person
  }

  /**
   * Handles interpersonal collisions
   *
   * @param {Array} person The person
   * @param {Array} people The simulation's population
   * @returns {Array} The person's interpersonal collisions
   */
  collide (person, people) {
    people.forEach(enemy => {
      if (enemy === person || this.distance(person, enemy) > 0) return

      if (person.state === this.healthy && enemy.state === this.infected) {
        person.state = this.infected
      }

      if (enemy.state !== this.dead) {
        person.angle = this.direction(person, enemy) - Math.PI // Baster's angle
      }
    })

    return person
  }

  /**
   * Renders each person to canvas at its current state and position
   *
   * @param {Array} people The simulation's population
   */
  render (people) {
    const ctx = this.canvas.getContext('2d')
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    people.forEach(person => {
      ctx.beginPath()
      ctx.arc(person.x, person.y, person.r, 0, 2 * Math.PI, false)
      ctx.fillStyle = person.state
      ctx.fill()
    })
  }

  /**
   * Starts the current simulation
   *
   * @returns {Promise} The simulation to complete
   */
  start () {
    if (this.active) return
    this.active = true
    this.frames = 0

    const canvas = this.canvas
    const population = parseInt(canvas.dataset.population)

    let people = new Array(population)
      .fill()
      .map((_, index) => {
        return {
          x: this.radius + this.randomInt(canvas.width - 2 * this.radius),
          y: this.radius + this.randomInt(canvas.height - 2 * this.radius),
          r: this.radius,
          c: this.celerity,
          moves: () => index < parseInt(canvas.dataset.movers),
          angle: 2 * Math.random() * Math.PI,
          state: index === 0 ? this.infected : this.healthy,
          ttc: this.curetime + this.curetime * Math.random()
        }
      })

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async resolve => {
      let request
      const animate = () => {
        request = requestAnimationFrame(animate)
        this.render(people)
      }

      animate()

      while (people.filter(p => p.state === this.infected).length > 0) {
        people = this.fastMap(people, p => this.update(p, people))
        people = this.fastMap(people, p => this.wallies(p))
        people = this.fastMap(people, p => this.collide(p, people))
        this.record(people)

        await this.wait(this.fpsInterval)
      }

      cancelAnimationFrame(request)
      this.active = false
      return resolve()
    })
  }
}