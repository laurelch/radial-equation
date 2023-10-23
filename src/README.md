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

<!--## uWebSockets

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