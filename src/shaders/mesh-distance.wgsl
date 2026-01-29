// Compute signed distance field from a triangle mesh.
// Each thread computes the distance for one voxel.

struct Uniforms {
    volume_min: vec3f,
    _pad0: f32,
    volume_max: vec3f,
    _pad1: f32,
    resolution: f32,
    triangle_count: f32,
    _pad2: f32,
    _pad3: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> vertices: array<f32>;
@group(0) @binding(2) var<storage, read> indices: array<u32>;
@group(0) @binding(3) var output: texture_storage_3d<r32float, write>;

// Get vertex position from flat vertex array
fn get_vertex(idx: u32) -> vec3f {
    let base = idx * 3u;
    return vec3f(vertices[base], vertices[base + 1u], vertices[base + 2u]);
}

// Get triangle vertices by triangle index
fn get_triangle(tri_idx: u32) -> array<vec3f, 3> {
    let base = tri_idx * 3u;
    let i0 = indices[base];
    let i1 = indices[base + 1u];
    let i2 = indices[base + 2u];
    return array<vec3f, 3>(get_vertex(i0), get_vertex(i1), get_vertex(i2));
}

// Compute unsigned distance from point to triangle
fn point_triangle_distance(p: vec3f, v0: vec3f, v1: vec3f, v2: vec3f) -> f32 {
    let e0 = v1 - v0;
    let e1 = v2 - v0;
    let v = p - v0;

    let d00 = dot(e0, e0);
    let d01 = dot(e0, e1);
    let d11 = dot(e1, e1);
    let d20 = dot(v, e0);
    let d21 = dot(v, e1);

    let denom = d00 * d11 - d01 * d01;

    // Handle degenerate triangles
    if abs(denom) < 1e-10 {
        return length(p - v0);
    }

    var s = (d11 * d20 - d01 * d21) / denom;
    var t = (d00 * d21 - d01 * d20) / denom;

    // Clamp to triangle
    if s < 0.0 {
        s = 0.0;
    }
    if t < 0.0 {
        t = 0.0;
    }
    if s + t > 1.0 {
        let scale = 1.0 / (s + t);
        s *= scale;
        t *= scale;
    }

    let closest = v0 + s * e0 + t * e1;
    return length(p - closest);
}

// Compute triangle normal (for sign determination)
fn triangle_normal(v0: vec3f, v1: vec3f, v2: vec3f) -> vec3f {
    return normalize(cross(v1 - v0, v2 - v0));
}

// Pseudonormal for sign computation at closest point
fn compute_sign(p: vec3f, v0: vec3f, v1: vec3f, v2: vec3f) -> f32 {
    let normal = triangle_normal(v0, v1, v2);
    let center = (v0 + v1 + v2) / 3.0;
    let to_point = p - center;
    return sign(dot(normal, to_point));
}

@compute @workgroup_size(8, 8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let resolution = u32(uniforms.resolution);

    // Check bounds
    if gid.x >= resolution || gid.y >= resolution || gid.z >= resolution {
        return;
    }

    // Compute world position for this voxel (center of voxel)
    let voxel_size = (uniforms.volume_max - uniforms.volume_min) / uniforms.resolution;
    let p = uniforms.volume_min + (vec3f(gid) + 0.5) * voxel_size;

    // Find minimum distance to all triangles
    var min_dist = 1e10;
    var closest_tri = 0u;
    let tri_count = u32(uniforms.triangle_count);

    for (var i = 0u; i < tri_count; i++) {
        let tri = get_triangle(i);
        let d = point_triangle_distance(p, tri[0], tri[1], tri[2]);
        if d < min_dist {
            min_dist = d;
            closest_tri = i;
        }
    }

    // Compute sign based on closest triangle's normal
    let tri = get_triangle(closest_tri);
    let s = compute_sign(p, tri[0], tri[1], tri[2]);

    // Write signed distance
    textureStore(output, gid, vec4f(s * min_dist, 0.0, 0.0, 0.0));
}
