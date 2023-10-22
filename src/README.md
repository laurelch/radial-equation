# Interactive Hydrogen Radial
## Schrödinger's equation
$\Psi_{n,l,m}(r, \theta, \psi) = R_{n,l}(r) Y_{l,m}(\theta, \psi)$

### Process of solving the equation
1. Frontend gets user inputs: $n, l, m$, and passes $n, l$ to backend.
2. Backend solves for $R(r)$, with $n, l$.
3. Frontend solves for $Y$, with $l, m$.
4. Compute $\Psi$ based on $R$ and $Y$.

## Compiling C++ file
Compile c++ file:
```bash
g++ -o test hydrogen_radial.cpp
```
Set environment variables for `$emcc`:
```bash
source /usr/local/include/emsdk/emsdk_env.sh
```

Compile c++ file to wasm and js:
```bash
emcc hydrogen_radial.cpp -o hydrogen_radial.js -sEXPORTED_FUNCTIONS=_malloc,_free -sEXPORTED_RUNTIME_METHODS=ccall,UTF8ToString
```

Then copy the generated *.js and *.wasm files to frontend folder:
```bash
cp *.js *.wasm ../frontend
```

## Allocate memory in JS and pass to C++ function
```js
const arrayPointer = Module._malloc((arrayLength * bytesPerElement));
```
