# SDF Mesh Approximation Project

## Project Goal

Build a web-based tool that takes an input mesh and computes a Signed Distance Field (SDF) representation that closely approximates it. The SDF is composed of primitive operations encoded in Reverse Polish Notation (RPN), allowing for GPU-accelerated evaluation.

## Core Concepts

### Signed Distance Fields (SDFs)

An SDF is a function that, for any point in space, returns the signed distance to the nearest surface:
- Negative values: inside the surface
- Zero: on the surface
- Positive values: outside the surface

### RPN-Encoded SDF Representation

SDFs will be stored in a texture where each texel encodes an operation in an RPN stack-based format:
- **Primitives**: sphere, box, cylinder, torus, plane, etc.
- **Operations**: union, intersection, subtraction, smooth blend
- **Transforms**: translate, rotate, scale

Example RPN sequence for `smoothUnion(sphere(0.5), translate(box(0.3), vec3(1,0,0)), 0.1)`:
```
[SPHERE, 0.5] [BOX, 0.3] [TRANSLATE, 1, 0, 0] [SMOOTH_UNION, 0.1]
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (WebGPU)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Mesh Input  │───▶│  Reference   │    │  SDF Texture     │  │
│  │  (.obj, etc) │    │  Distance    │    │  (RPN encoded)   │  │
│  └──────────────┘    │  Field       │    └────────┬─────────┘  │
│                      │  Texture     │             │            │
│                      └──────┬───────┘             │            │
│                             │                     │            │
│                             ▼                     ▼            │
│                      ┌──────────────────────────────────┐      │
│                      │      Comparison Shader           │      │
│                      │  (evaluate SDF vs reference)     │      │
│                      └──────────────┬───────────────────┘      │
│                                     │                          │
│                                     ▼                          │
│                      ┌──────────────────────────────────┐      │
│                      │      Error Metric / Loss         │      │
│                      └──────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Stack

### Runtime Environment
- **Browser-based**: Must run entirely in a browser tab
- **WebGPU**: Primary compute/rendering API
- **Language**: TypeScript for orchestration, WGSL for shaders

### Why WebGPU?
- Modern GPU compute capabilities in the browser
- Compute shaders for parallel SDF evaluation
- Storage textures for distance field generation
- Wide adoption trajectory (Chrome, Firefox, Safari)

## Pipeline Stages

### Stage 1: Mesh to Distance Field

**Input**: Triangle mesh (vertex positions, indices)

**Process**:
1. Upload mesh data to GPU buffers
2. Run compute shader that, for each voxel in a 3D grid:
   - Compute distance to nearest triangle
   - Determine sign (inside/outside) via ray casting or normal direction
3. Store result in 3D texture

**Output**: 3D texture containing ground-truth distance field

### Stage 2: SDF Encoding

**Input**: SDF primitive parameters (to be optimized)

**Process**:
1. Encode SDF operations as RPN sequence
2. Pack into texture format:
   - Each texel = one operation or parameter
   - Fixed instruction set with opcodes
3. Upload to GPU

**Output**: SDF texture (RPN-encoded instruction sequence)

### Stage 3: SDF Evaluation

**Input**: SDF texture, sample points

**Process**:
1. Compute shader evaluates RPN sequence at each point
2. Stack-based interpreter in shader:
   - Push primitive results onto stack
   - Apply operations (union, etc.) by popping/pushing
3. Final stack value = SDF distance at that point

**Output**: Evaluated distance values

### Stage 4: Comparison / Loss Computation

**Input**: Reference distance field, evaluated SDF distances

**Process**:
1. Sample both at same points
2. Compute error metrics:
   - Mean squared error
   - Maximum error
   - Surface accuracy (error near zero-crossing)
3. Reduce to single loss value

**Output**: Loss/error metric for optimization

## SDF Instruction Set (Draft)

### Opcodes (8-bit)

| Code | Name | Stack Effect | Parameters |
|------|------|--------------|------------|
| 0x01 | SPHERE | push 1 | radius |
| 0x02 | BOX | push 1 | half-extents (x,y,z) |
| 0x03 | CYLINDER | push 1 | radius, height |
| 0x04 | TORUS | push 1 | major_r, minor_r |
| 0x05 | PLANE | push 1 | normal (x,y,z), offset |
| 0x10 | UNION | pop 2, push 1 | - |
| 0x11 | INTERSECT | pop 2, push 1 | - |
| 0x12 | SUBTRACT | pop 2, push 1 | - |
| 0x13 | SMOOTH_UNION | pop 2, push 1 | blend_radius |
| 0x20 | TRANSLATE | pop 1, push 1 | offset (x,y,z) |
| 0x21 | ROTATE | pop 1, push 1 | quaternion (x,y,z,w) |
| 0x22 | SCALE | pop 1, push 1 | scale (uniform) |

### Texture Layout

Option A: **1D texture array**
- Linear sequence of instructions
- Simple addressing
- Limited by max texture width

Option B: **2D texture**
- Row = one SDF primitive tree
- Allows multiple SDFs in parallel
- Better for batch evaluation

## Key Technical Challenges

### 1. Mesh Distance Field Generation
- Efficient GPU-based distance computation
- Correct sign determination (inside/outside)
- Handling non-watertight meshes

### 2. RPN Shader Interpreter
- Fixed-size stack in shader (no dynamic allocation)
- Instruction decoding efficiency
- Numerical precision

### 3. Optimization Loop
- How to update SDF parameters based on loss
- Gradient computation (finite differences? autodiff?)
- Avoiding local minima

### 4. WebGPU Constraints
- Workgroup size limits
- Buffer size limits
- Cross-browser compatibility

## Development Phases

### Phase 1: Foundation
- [ ] Project setup (Vite + TypeScript + WebGPU)
- [ ] Basic WebGPU initialization and canvas setup
- [ ] Simple shader compilation pipeline
- [ ] Mesh loading (OBJ parser)

### Phase 2: Reference Distance Field
- [ ] Mesh data upload to GPU
- [ ] Distance-to-triangle compute shader
- [ ] Inside/outside determination
- [ ] 3D texture output and visualization

### Phase 3: SDF Encoding & Evaluation
- [ ] Define instruction binary format
- [ ] SDF texture encoder (CPU side)
- [ ] RPN interpreter compute shader
- [ ] Basic primitives (sphere, box)
- [ ] Basic operations (union, intersection)

### Phase 4: Comparison Pipeline
- [ ] Side-by-side evaluation shader
- [ ] Error metric computation
- [ ] Loss reduction shader
- [ ] Visualization of error

### Phase 5: Optimization (Future)
- [ ] Parameter optimization strategy
- [ ] Structure optimization (which primitives)
- [ ] Interactive editing

## File Structure (Planned)

```
/
├── src/
│   ├── main.ts              # Entry point
│   ├── webgpu/
│   │   ├── context.ts       # WebGPU initialization
│   │   ├── pipeline.ts      # Shader pipeline management
│   │   └── buffers.ts       # Buffer/texture helpers
│   ├── mesh/
│   │   ├── loader.ts        # OBJ/mesh loading
│   │   └── distance-field.ts # Mesh-to-DF computation
│   ├── sdf/
│   │   ├── encoder.ts       # RPN encoding
│   │   ├── primitives.ts    # Primitive definitions
│   │   └── operations.ts    # CSG operations
│   └── shaders/
│       ├── mesh-distance.wgsl
│       ├── sdf-eval.wgsl
│       └── comparison.wgsl
├── public/
│   └── meshes/              # Sample meshes
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Open Questions

1. **Resolution trade-offs**: What 3D texture resolution is practical? 64³? 128³? 256³?

2. **Instruction encoding density**: Pack multiple ops per texel, or one per texel for simplicity?

3. **Optimization approach**:
   - Gradient descent on continuous parameters?
   - Genetic algorithms for structure?
   - User-guided primitive placement?

4. **Error weighting**: Should surface accuracy matter more than volumetric accuracy?

5. **Progressive refinement**: Start coarse and refine, or fixed resolution?

## References

- [Inigo Quilez SDF Functions](https://iquilezles.org/articles/distfunctions/)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [WGSL Specification](https://www.w3.org/TR/WGSL/)
- [Mesh to SDF techniques](https://github.com/christopherbatty/SDFGen)

---

*This document will be updated as design decisions are made and implementation progresses.*
