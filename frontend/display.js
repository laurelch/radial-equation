import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import * as dat from 'lil-gui'

// On click event listener
document.addEventListener('click', (event) =>
{
    console.log('click')
    // solveRadial()
})

/**
 * Solves the Hydrogen radial function.
 * @param {Number} zeta 
 * @param {Number} n 
 * @param {Number} l 
 */
const solveRadial = (zeta, n, l) => {
    console.log("zeta = ",zeta, "n = ", n, "l = ",l)
    const xmin = -8., dx = .01, rmax = 100.
    const zmesh = zeta
    const mesh = Math.floor(((Math.log(zmesh*rmax)-xmin)/dx))
    const gridSize = mesh+1 // size of radial grid

    // Allocate memory for data to be received
    const rPointer = Module.ccall('allocate_memory', 'number', ['number'], [gridSize])
    const potPointer = Module.ccall('allocate_memory', 'number', ['number'], [gridSize])
    const radialPointer = Module.ccall('allocate_memory', 'number', ['number'], [gridSize])

    // Call solve_radial() in cpp, void solve_radial(int n, int l, double zeta, double* r, double* pot, double* radial)
    const eigen = Module.ccall('solve_radial',
                'number',
                ['number', 'number', 'number', 'number', 'number', 'number'],
                [n, l, zeta, rPointer, potPointer, radialPointer]
    )

    // Convert received pointer to array
    const r = new Float64Array(Module.HEAPF64.buffer, rPointer, gridSize)
    const pot = new Float64Array(Module.HEAPF64.buffer, potPointer, gridSize)
    const radial = new Float64Array(Module.HEAPF64.buffer, radialPointer, gridSize)

    // Check results
    const precision = 2
    console.log("r[0] = ", r[0].toFixed(precision), ", r[mesh] = ", r[mesh].toFixed(precision))
    console.log("pot[0] = ", pot[0].toExponential(precision), ", pot[500] = ", pot[500].toExponential(precision))
    console.log("radial[0] = ", radial[0].toExponential(precision), ", radial[500] = ", radial[500].toExponential(precision))
    console.log("eigen = ", eigen.toExponential(precision))

    // Free memory
    Module._free(rPointer)
    Module._free(potPointer)
    Module._free(radialPointer)
}

/**
 * UI
 */
const gui = new dat.GUI({width: 400})

// Initialize user inputs
const userInput = {
    zeta: 1,
    n: 1,
    l: 0
}
const nMax = 5

const verifyUserInput = (zeta, n, l) => {
    if(n <= l){
        console.log('invalid')
    }else{
        solveRadial(zeta, n, l)
    }
}

gui.add(userInput, 'zeta', 1, 10, 0.01).name('Atomic Charge (zeta)').onChange(zeta => {
        verifyUserInput(zeta, userInput.n, userInput.l)
    }
)
gui.add(userInput, 'n', 1, nMax, 1).name('Principal Quantum Number (n)').onChange(n => {
        verifyUserInput(userInput.zeta, n, userInput.l)
    }
)
gui.add(userInput, 'l', 0, nMax-1,1).name('Orbital Quantum Number (l)').onChange(l => {
        verifyUserInput(userInput.zeta, userInput.n, userInput.l)
    }
)