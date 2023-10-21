document.addEventListener('click', (event) =>
{
    console.log('click')
    solveRadial()
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