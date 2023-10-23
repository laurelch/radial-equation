document.addEventListener('click', (event) =>
{
    console.log('click')
    solveRadial()
})

const test = () => {
    console.log("onLoad test")
}

const solveRadial = (zeta = 1, n = 2, l = 1) => {
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