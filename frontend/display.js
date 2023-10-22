document.addEventListener('click', (event) =>
{
    console.log('click')
    userInput()
})

const test = () => {
    console.log("onLoad test")
}

// Interact with hydrogen_radial.cpp
const solveRadial = () => {
    const n = 2
    const l = 1
    const zeta = 1.1
    Module.ccall('solve_radial',
        'null',
        ['number', 'number', 'number'],
        [n, l, zeta]
        )
}

const userInput = (zeta = 1.1, n = 2, l = 1) => {
    // const zeta = 1.1, n = 2, l = 1
    const xmin = -8., dx = .01, rmax = 100.
    const zmesh = zeta
    const mesh = Math.floor(((Math.log(zmesh*rmax)-xmin)/dx));
    console.log("userInput() mesh = ", mesh);

    // Allocate memory
    const bytesPerElement = Module.HEAPF32.BYTES_PER_ELEMENT // each element is a float
    const rLength = mesh + 1; // array length
    const r = new Array(rLength).fill(-1.1);
    console.log("memory check",rLength, bytesPerElement, rLength*bytesPerElement)
    const rPointer = Module._malloc((rLength * bytesPerElement))
    Module.HEAPF32.set(r, (rPointer/bytesPerElement));
    const rPointerUpdated = Module.ccall('user_input',
        'number',
        ['number', 'number', 'number', 'number'],
        [zeta, n, l, rPointer]
    )

    console.log(r, rPointer, rPointerUpdated);

    Module._free(rPointer)
}