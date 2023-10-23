# Interactive Hydrogen Radial
## Schrödinger's equation
$\Psi_{n,l,m}(r, \theta, \psi) = R_{n,l}(r) Y_{l,m}(\theta, \psi)$

### Process of solving the equation
1. Frontend gets user inputs: $n, l, m$, and passes $n, l$ to backend.
2. Backend solves for $R(r)$, with $n, l$.
3. Frontend solves for $Y$, with $l, m$.
4. Compute $\Psi$ based on $R$ and $Y$.

## Compiling C++ file
Compile c++ file to test if it has any compile errors before compiling with `$emcc` (Emscripten):
```bash
g++ hydrogen_radial.cpp -o test
```

Set environment variables for `$emcc` when open a new terminal window:
```bash
source /usr/local/include/emsdk/emsdk_env.sh
```

Compile c++ file to wasm and js, and copy to `frontend` folder:
```bash
emcc hydrogen_radial.cpp -o hydrogen_radial.js -sEXPORTED_FUNCTIONS=_malloc,_free -sEXPORTED_RUNTIME_METHODS=ccall,UTF8ToString

cp *.js *.wasm ../frontend
```

## Communication between JS and C++
Sample functions, `function_1` and `function_2`, as well as the `allocate_memory` function in C++ file:
```c++
#ifdef __EMSCRIPTEN__
    EMSCRIPTEN_KEEPALIVE
#endif
float* function_1(int n, float* r){
    r[0] = n;
    return r;
}

#ifdef __EMSCRIPTEN__
    EMSCRIPTEN_KEEPALIVE
#endif
void function_2(int n, float* r){
    r[0] = n;
}

#ifdef __EMSCRIPTEN__
    EMSCRIPTEN_KEEPALIVE
#endif
double* allocate_memory(int buffer_size){
    return reinterpret_cast<double*>(malloc(buffer_size*sizeof(double)));
}
```

JS calls the C++ function `function_1` and other functions with `ccall`. Pass data to or retrieve data from WebAssembly (C++).
```js
// Test user input
const userInput = (zeta = 1.1, n = 2, l = 1) => {
    const xmin = -8., dx = .01, rmax = 100.
    const zmesh = zeta
    const mesh = Math.floor(((Math.log(zmesh*rmax)-xmin)/dx))
    console.log("userInput() mesh = ", mesh)

    // Allocate memory in cpp module and pass data to it
    const bytesPerElement = Module.HEAPF32.BYTES_PER_ELEMENT // each element is a float number
    const arraySize = 10
    const r = new Array(arraySize).fill(-1.1)
    const rPointer = Module._malloc((arraySize * bytesPerElement))
    Module.HEAPF32.set(r, (rPointer/bytesPerElement))
    const rPointerUpdated = Module.ccall('function_1', 'number', ['number', 'number'], [n, rPointer])
    Module._free(rPointer)

    // Allocate memory in cpp module and retrieve data from it
    const bufferSize = 100000
    const arrayPointer = Module.ccall('allocate_memory', 'number', ['number'], [bufferSize])
    Module.ccall('function_2', 'null', ['number', 'number'], [arrayPointer, bufferSize])
    const array = new Float32Array(Module.HEAPF32.buffer, arrayPointer, bufferSize)
    Module._free(arrayPointer)
}
```

<!-- Archived notes

## uWebSockets

GitHub repository: https://github.com/uNetworking/uWebSockets.git.

User manual: https://github.com/uNetworking/uWebSockets/blob/master/misc/READMORE.md

```bash
git clone --recurse-submodules https://github.com/uNetworking/uWebSockets.git

cd uWebSockets

# Update compiler version on Mac
softwareupdate -l
sudo softwareupdate -i 'Command Line Tools for Xcode-15.0' -R
gcc --version # Apple clang 15.0.0

# Build example files (examples/*.cpp)
sudo make
# Built Http3Server, Broadcast, HelloWorld, Crc32, ServerName, EchoServer, BroadcastingEchoServer, UpgradeSync, UpgradeAsync

make install # Install uWebSockets source files in /usr/local/include
```

###  Compile a HelloWorld example
```bash
# With websocket code in a cpp file only
g++ -march=native -O3 -Wpedantic -Wall -Wextra -Wsign-conversion -Wconversion -std=c++20 -IuWebSockets/src -IuWebSockets/uSockets/src -flto websocket_server.cpp uWebSockets/uSockets/*.o -lz -o HelloWorld
``` -->