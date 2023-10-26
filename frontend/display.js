import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MathUtils } from 'three'
import gsap from 'gsap'
import * as dat from 'lil-gui'

/**
 * Initialize Three.js scene with orbit controls and axes helper
 */
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const camera = new THREE.PerspectiveCamera(75, sizes.width/sizes.height, 0.01, 200)
camera.position.set(40, 40, 60)
scene.add(camera)
const axesHelper = new THREE.AxesHelper(100)
scene.add(axesHelper)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
const renderer = new THREE.WebGLRenderer({canvas: canvas})
renderer.setSize(sizes.width, sizes.height)
const clock = new THREE.Clock()
const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    controls.update()
    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}
tick()

let pointsGeometry = new THREE.BufferGeometry()
let points = new THREE.Points()

document.addEventListener('click', (event) => {
    console.log('click') // On click event listener
})

/**
 * Window resize and full screen controls.
 */
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
})
window.addEventListener('dblclick', () => {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement
    if(!fullscreenElement){
        if(canvas.requestFullscreen){
            canvas.requestFullscreen()
        }else if(canvas.webkitRequestFullscreen){
            canvas.webkitRequestFullscreen()
        }
    }else{
        if(document.exitFullscreen){
            document.exitFullscreen()
        }else if(document.webkitExitFullscreen){
            document.webkitExitFullscreen()
        }
    }
})

/**
 * Solves the radial part, R(r), of the Schroedinger equation.
 * @param {Number} zeta 
 * @param {Number} n 
 * @param {Number} l 
 */
function solveRadial(zeta, n, l) {
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

    return [r, radial]
}

/**
 * Obtains the radial equation R(r) points in 3D space.
 * @param {Array} r 
 * @param {Array} radial - R(r)
 * @param {Number} V - Number of vertical discretizations
 * @param {Number} H - Number of horizontal discretizations
 * @param {Number} layer - Number of layers displayed in the radial equation
 * @returns flatten positions of the points
 */
function getRadialInSpace(r, radial, H=8, V=16, layer=100) {
    const pointsPerLayer = V*H
    const points = pointsPerLayer*layer
    const positions = new Float32Array(points*3)
    const phiUnit = MathUtils.degToRad(180/H) // polar angle in radians from the y (up) axis
    const thetaUnit = MathUtils.degToRad(360/V) // equator angle in radians around the y (up) axis
    const partialRadius = new Float32Array(layer)
    const partialRadial = new Float32Array(layer)
    const getPartialRadial = () => {
        const length = radial.length
        const stepSize = Math.floor(length/layer)
        for(let i=0; i<layer; ++i){
            const index = i*stepSize
            partialRadius[i] = r[index]
            partialRadial[i] = radial[index]
        }
    }
    getPartialRadial()
    const addRadialLayer = (i) => {
        const layerRadius = partialRadius[i]
        const l = i*V*H // starting position of l-th layer in total positions
        let phi, theta, k
        for(let p=0; p<H; ++p){
            phi = p*phiUnit
            for(let t=0; t<V; ++t){
                theta = t*thetaUnit
                k = p*V+t // k-th point in current layer
                const start = 3*(l+k) // starting position of current point
                const pos = new THREE.Vector3().setFromSphericalCoords(layerRadius, phi, theta)
                for(let j=0; j<3; ++j){
                    positions[start+j] = pos.getComponent(j)
                }
            }
        }
    }
    for (let i=0; i<layer; ++i){
        addRadialLayer(i)
    }
    return positions
}

/**
 * Creates point cloud.
 * @param {Array} positions 
 * @param {Number} pointSize 
 * @returns Points geometry
 */
function createPointCloud(positions, pointSize=0.05){
    console.log(positions.slice(0,9))
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    pointsGeometry.computeBoundingBox()
    const material = new THREE.PointsMaterial({size:pointSize})
    points = new THREE.Points(pointsGeometry, material)
    scene.add(points)
}

function updatePointCloud(positions, pointSize=0.05){
    console.log(positions.slice(0,9))
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({size:pointSize})
    points = new THREE.Points(pointsGeometry, material)
}

/**
 * Initialize UI with lil.gui (dat.gui).
 * @param {*} zeta 
 * @param {*} n 
 * @param {*} l 
 * @returns gui
 */
function initUI(zeta=1, n=1, l=0) {
    const gui = new dat.GUI({width: 400})
    // Initialize user inputs
    const userInput = {
        zeta: zeta,
        n: n,
        l: l
    }
    const nMax = 5
    let [r, radial] = solveRadial(zeta, n, l)
    let positions = getRadialInSpace(r, radial)
    createPointCloud(positions)
    const verifyUserInput = (zeta, n, l) => {
        if(n <= l){
            console.log('invalid')
        }else{
            [r, radial] = solveRadial(zeta, n, l)
            positions = getRadialInSpace(r, radial)
            updatePointCloud(positions)
            renderer.render(scene, camera)
        }
    }
    gui.add(userInput, 'zeta', 1, 10, 0.01).name('Atomic Charge (zeta)').onChange(zeta => {
            verifyUserInput(zeta, userInput.n, userInput.l)})
    gui.add(userInput, 'n', 1, nMax, 1).name('Principal Quantum Number (n)').onChange(n => {
            verifyUserInput(userInput.zeta, n, userInput.l)})
    gui.add(userInput, 'l', 0, nMax-1,1).name('Orbital Quantum Number (l)').onChange(l => {
            verifyUserInput(userInput.zeta, userInput.n, userInput.l)})
    return gui
}

initUI()