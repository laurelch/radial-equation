import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Lut } from 'three/addons/math/Lut.js'
import { MathUtils } from 'three'
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
const camera = new THREE.PerspectiveCamera(50, sizes.width/sizes.height, 0.1, 2000)
camera.position.set(200, 200, 300)
scene.add(camera)
const axesHelper = new THREE.AxesHelper(400)
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

const displayColor = true
const applyLogToColor = true
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
 * 
 * @param {number} zeta - Number of atomic charge.
 * @param {number} n - Principal quantum number.
 * @param {number} l - Orbital quantum number.
 */
function solveRadial(zeta, n, l){
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

    // Find min and max in radial
    let radialMin = radial[0], radialMax = radial[0]
    for(let i=0; i<radial.length; ++i){
        if(radial[i]<radialMin){
            radialMin = radial[i]
        }else if(radial[i]>radialMax){
            radialMax = radial[i]
        }
    }
    // Free memory
    Module._free(rPointer)
    Module._free(potPointer)
    Module._free(radialPointer)

    // console.log('r.length, min, max', r.length, radialMin, radialMax)
    return [r, radial, radialMin, radialMax]
}

function applyColor(radial, min, max, style='rainbow'){
    const length = radial.length
    const colors = new Float32Array(length*3)
    const lut = new Lut(style) // color look up table
    let shift = 0
    if(min<0){
        shift = Number.EPSILON - min
        max += shift
        min += shift
    }
    if(applyLogToColor){
        lut.minV = Math.log(min)
        lut.maxV = Math.log(max)
    }else{
        lut.minV = min
        lut.maxV = max
    }
    console.log('applyColor', min, max)
    const color = new THREE.Color()
    for(let i=0; i<length; ++i){
        const newRadial = radial[i] + shift
        let lutColor = new THREE.Color()
        if(applyLogToColor){
            lutColor = lut.getColor(Math.log(newRadial))
        }else{
            lutColor = lut.getColor(newRadial)
        }
        // console.log(i, radial[i], newRadial, lutColor)
        color.copy(lutColor).convertSRGBToLinear()
        colors.set([color.r, color.g, color.b], i*3)
    }
    return colors
}

/**
 * Compute point positions in a 3D sphere using a specified style.
 * 
 * @param {Float64Array} r - Array of the radius of the sphere.
 * @param {Float64Array} radial - Array of the radial equation value with respect to radius, i.e. R(r).
 * @param {number} points - The number of points (optional, default is 200).
 * @param {number} H - The horizontal resolution (optional, default is 8).
 * @param {number} V - The vertical resolution (optional, default is 16).
 * @param {number} layer - The number of layers (optional, default is 100).
 * @param {string} style - The style to use (optional, default is 'layer').
 * @returns {Float32Array} - A Float32Array containing the positions of the generated points (size: points * 3).
 */
function generatePointsInSphere(r, radial, radialColor=null, points=200, H=16, V=32, layer=40, style='layer'){
    if(style==='layer'){
        const pointsPerLayer = V*H
        points = pointsPerLayer*(layer+1)
    }
    const positions = new Float32Array(points*3)
    const colors = new Float32Array(points*3)
    const partialLayer = layer+1
    const partialColor = new Float32Array(partialLayer*3)
    const length = r.length
    const stepSize = Math.floor(length/layer)
    if(style==='layer'){
        const phiUnit = MathUtils.degToRad(180/H) // polar angle in radians from the y (up) axis
        const thetaUnit = MathUtils.degToRad(360/V) // equator angle in radians around the y (up) axis
        const partialRadius = new Float32Array(partialLayer)
        const partialRadial = new Float32Array(partialLayer)
        const getPartial = () => {
            // console.log('stepSize = ', stepSize)
            for(let i=0; i<layer; ++i){
                let index = i*stepSize
                partialRadius[i] = r[index]
                partialRadial[i] = radial[index]
                if(displayColor){
                    for(let j=0; j<3; ++j){
                        partialColor[3*i+j] = radialColor[3*index+j]
                        // partialColor[3*i+j] = 1 // white
                    }
                }
            }
            partialRadius[partialLayer-1] = r[length-1]
            partialRadial[partialLayer-1] = radial[length-1]
            if(displayColor){
                for(let j=0; j<3; ++j){
                    partialColor[3*(partialLayer-1)+j] = radialColor[3*(length-3)+j]
                    // partialColor[3*(partialLayer-1)+j] = 1 // white
                }
            }
        }
        getPartial()
        // console.log('partialRadius', partialRadius)
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
                        if(displayColor) colors[start+j] = partialColor[3*i+j]
                    }
                }
            }
        }
        for (let i=0; i<partialLayer; ++i){
            addRadialLayer(i)
        }
    }
    // printColors(partialColor)
    if(displayColor){
        return [positions, colors]
    }
    return positions
}

/**
 * Create a bounding box with given size.
 * 
 * @param {number} size - Size of the box side.
 * @returns {THREE.BoxHelper} - A THREE.BoxHelper object for the bounding box.
 */
function createBoundingBox(size=200){
    const geometry = new THREE.BoxGeometry(size, size, size)
    const wireframe = new THREE.WireframeGeometry(geometry)
    const line = new THREE.LineSegments(wireframe)
    line.material.depthTest = false
    line.material.opacity = 0.25
    line.material.transparent = true
    return new THREE.BoxHelper(line)
}

/**
 * Create point cloud as a THREE.Points object based on given positions.
 * 
 * @param {Float32Array} positions - A Float32Array containing the positions of the generated points (size: points * 3).
 * @param {number} pointSize - Size of the points in pixels (optional, default is 0.05).
 * @returns {THREE.Points} - A THREE.Points object for displaying points.
 */
function createPointCloud(positions, colors=null, pointSize=2.5){
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    let material = new THREE.PointsMaterial({size:pointSize})
    if(colors != null){
        pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        material = new THREE.PointsMaterial({size:pointSize, vertexColors:true})
    }
    pointsGeometry.computeBoundingBox()
    return new THREE.Points(pointsGeometry, material)
}

/**
 * Initialize UI with lil-gui (dat.gui).
 * 
 * @param {number} zeta - Number of atomic charge.
 * @param {number} n - Principal quantum number.
 * @param {number} l - Orbital quantum number.
 * @returns {dat.GUI} GUI generated by lil-gui (dat.gui)
 */
function initUI(zeta=2, n=1, l=0){
    const gui = new dat.GUI({width: 400})
    // Initialize user inputs
    const userInput = {
        zeta: zeta,
        n: n,
        l: l
    }
    const boundingBox = createBoundingBox()
    scene.add(boundingBox)
    renderer.render(scene, camera)

    const nMax = 5
    let [r, radial, radialMin, radialMax] = solveRadial(zeta, n, l)
    if(displayColor){
        let radialColor = applyColor(radial, radialMin, radialMax)
        let [positions, colors] = generatePointsInSphere(r, radial, radialColor)
        points = createPointCloud(positions, colors)
    }else{
        let positions = generatePointsInSphere(r, radial)
        points = createPointCloud(positions)
    }
    scene.add(points)
    const verifyUserInput = (zeta, n, l) => {
        if(n <= l){
            console.log('invalid')
        }else{
            let [r, radial, radialMin, radialMax] = solveRadial(zeta, n, l)
            console.log('r.length, radial.length, min, max', r.length, radial.length, radialMin, radialMax)
            if(displayColor){
                let radialColor = applyColor(radial, radialMin, radialMax)
                let [positions, colors] = generatePointsInSphere(r, radial, radialColor)
                points = createPointCloud(positions, colors)
            }else{
                let positions = generatePointsInSphere(r, radial)
                points = createPointCloud(positions)
            }
            renderer.render(scene, camera)
        }
    }
    gui.add(userInput, 'zeta', 1, 10, 0.1).name('Atomic Charge (zeta)').onChange(zeta => {
            verifyUserInput(zeta, userInput.n, userInput.l)})
    gui.add(userInput, 'n', 1, nMax, 1).name('Principal Quantum Number (n)').onChange(n => {
            verifyUserInput(userInput.zeta, n, userInput.l)})
    gui.add(userInput, 'l', 0, nMax-1,1).name('Orbital Quantum Number (l)').onChange(l => {
            verifyUserInput(userInput.zeta, userInput.n, userInput.l)})
    return gui
}

document.addEventListener('wasmReady', () => {
    console.log('display.js - heard wasmReady event')
    initUI()
})

Module['onRuntimeInitialized'] = () => {
    console.log('display.js - onRuntimeInitialized!')
}

// Add when developing with localhost
// initUI()