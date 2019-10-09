precision mediump float;

#define INF 1.0e+12
#define EPS 1.0e-3 // Reflect/shadow/transmission ray offset
#define MAX_RECURSION 1 // Maximum depth for rays
#define MAX_LIGHTS 10
#define MAX_MATERIALS 10
#define M_PI 3.1415926535897932384626433832795

/*******************************************
                DATA TYPES
********************************************/
struct Material {
  vec3 kd;
  vec3 ks;
  vec3 ka;
  vec3 kt;
  float shininess;
  float refraction;
  int special;
};

struct Light {
    vec3 pos;
    vec3 color;
    vec3 atten;
    vec3 towards;
    float angle;
};

struct Ray {
  vec3 p0;
  vec3 v;
};

struct Intersection {
  vec3 p; // Point of intersection
  vec3 n; // Normal of intersection
  int mIdx; // Index into materials array
  float sCoeff; // Coefficient for checkerboard or special material
};


/*******************************************
                UNIFORMS
********************************************/
// Uniforms set from Javascript that are constant
// over all fragments
uniform float canvas_height;
uniform float canvas_width;
uniform int numObjects;
uniform int numLights;
uniform Light lights[MAX_LIGHTS];
uniform int numMaterials;
uniform Material materials[MAX_MATERIALS];
uniform int showLights;
uniform float beaconRadius;

// Ray tracer special options
uniform int orthographic;

// Camera parameters
uniform vec3 eye;
uniform vec3 right;
uniform vec3 up;
uniform float fovx;
uniform float fovy;


/*******************************************
           RAY CASTING FUNCTIONS
********************************************/

// TODO: Put helper functions here if you'd like

/** TODO: PUT YOUR CODE HERE **/


/**
* Given a point on a plane and a normal, intersect a ray
* with the plane they determine
*
* @param {Ray} ray : The ray in world coordinates
* @param {vec3} n : The plane normal
* @param {vec3} p : A point on the plane
* @param {int} mIdx : Array index of material that the plane is made of
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.P0 + t*ray.V
*/
float rayIntersectPlane(Ray ray, vec3 n, vec3 p, int mIdx, out Intersection intersect) {
    float denom = dot(ray.v, n);
    float t = INF;
    if (abs(denom) > 0.0) {
        // The ray is not parallel to the plane
        float num = dot(p - ray.p0, n);
        t = num / denom;
        if (t > 0.0) {
            // Plane is in front of ray
            intersect.p = ray.p0 + t*ray.v;
            intersect.n = n;
            intersect.mIdx = mIdx;
        }
        else {
            t = INF;
        }
    }
    return t;
}


/**
* Intersect a ray with a given triangle /\abc, assuming a, b, and c
* have been specified in CCW order with respect to the triangle normal
*
* @param {Ray} ray : The ray in world coordinates
* @param {vec3} a : Point a on the triangle
* @param {vec3} b : Point b on the triangle
* @param {vec3} c: Point c on the triangle
* @param {int} mIdx : Array index of material that the triangle is made of
* @param {mat4} MInv: Inverse of the transformation M that's applied to the triangle before ray intersection
* @param {mat3} N: The normal transformation associated to M
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.P0 + t*ray.V
*/
float rayIntersectTriangle(Ray ray, vec3 a, vec3 b, vec3 c,
                            int mIdx, mat4 MInv, mat3 N,
                            out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index


/** TODO: PUT YOUR CODE HERE **/
    // TODO: The below three are dummy values
    intersect.p = vec3(0, 0, 0);
    intersect.n = vec3(0, 0, 0);
    return INF;
}


/**
* Intersect a ray with a given sphere
*
* @param {Ray} ray : The ray in world coordinates
* @param {vec3} c : Center of the sphere
* @param {float} r : Radius of the sphere
* @param {int} mIdx : Array index of material that the sphere is made of
* @param {mat4} MInv: Inverse of the transformation M that's applied to the sphere before ray intersection
* @param {mat3} N: The normal transformation associated to M
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.P0 + t*ray.V
*/
float rayIntersectSphere(Ray ray, vec3 c, float r,
                            int mIdx, mat4 MInv, mat3 N,
                            out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index

/** TODO: PUT YOUR CODE HERE **/
    // TODO: The below three are dummy values
    intersect.p = vec3(0, 0, 0);
    intersect.n = vec3(0, 0, 0);
    intersect.sCoeff = 1.0; // TODO: Change this for special material extra task
    return INF;
}


/**
* Intersect a ray with a (possibly transformed) box, whose extent
* in untransformed space is [center[0]-width/2, center[0]+width/2],
*                           [center[1]-height/2, center[1]+height/2],
*                           [center[2]-length/2, center[2]+length/2]
*
* @param {Ray} ray : The ray in world coordinates
* @param {float} W : Extent of the box along the x dimension
* @param {float} H : Extent of the box along the y dimension
* @param {float} L : Extent of the box along the z dimension
* @param {vec3} c : Center of the box
* @param {int} mIdx : Array index of material that the box is made of
* @param {mat4} MInv: Inverse of the transformation M that's applied to the box before ray intersection
* @param {mat3} N: The normal transformation associated to M
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.P0 + t*ray.V
*/
float rayIntersectBox(Ray ray, float W, float H, float L,
                        vec3 c, int mIdx, mat4 MInv, mat3 N,
                        out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index

/** TODO: PUT YOUR CODE HERE **/
    // TODO: The below three are dummy values
    intersect.p = vec3(0, 0, 0);
    intersect.n = vec3(0, 0, 0);
    intersect.sCoeff = 1.0; // TODO: Change this for special material extra task
    return INF;
}


/**
* Intersect a ray with a given cylinder
*
* @param {Ray} ray : The ray in world coordinates
* @param {vec3} c : Center of cylinder
* @param {float} r : Radius of cylinder
* @param {float} h : Height of cylinder
* @param {int} mIdx : Array index of material that the cylinder is made of
* @param {mat4} MInv: Inverse of the transformation M that's applied to the cylinder before ray intersection
* @param {mat3} N: The normal transformation associated to M
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.P0 + t*ray.V
*/
float rayIntersectCylinder(Ray ray, vec3 c, float r, float h,
                            int mIdx, mat4 MInv, mat3 N,
                            out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index
    intersect.sCoeff = 1.0; // TODO: Change this for special material extra task
/** TODO: PUT YOUR CODE HERE **/
    // TODO: The below three are dummy values
    intersect.p = vec3(0, 0, 0);
    intersect.n = vec3(0, 0, 0);
    return INF;
}


/**
* Intersect a ray with a given cone
*
* @param {Ray} ray : The ray in world coordinates
* @param {vec3} c : Center of cone
* @param {float} r : Radius of cone
* @param {float} h : Height of cone
* @param {int} mIdx : Array index of material that the cone is made of
* @param {mat4} MInv: Inverse of the transformation M that's applied to the cone before ray intersection
* @param {mat3} N: The normal transformation associated to M
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.P0 + t*ray.V
*/
float rayIntersectCone(Ray ray, vec3 c, float r, float h,
                            int mIdx, mat4 MInv, mat3 N,
                            out Intersection intersect) {
    intersect.mIdx = mIdx; // Store away the material index
    intersect.sCoeff = 1.0; // TODO: Change this for special material extra task
/** TODO: PUT YOUR CODE HERE **/
    // TODO: The below three are dummy values
    intersect.p = vec3(0, 0, 0);
    intersect.n = vec3(0, 0, 0);
    return INF;
}


/**
* A function which intersects a ray with a scene, returning the
* t parameter of the closest intersection, or INF if no intersection
* happened, along with an out parameter storing the point, normal,
* and material of the intersection
* NOTE: This function is merely declared here; it is defined in its
* entirety in Javascript before this shader is compiled, since information
* about the scene must be hardcoded into the shader
*
* @param {Ray} ray : The ray in world coordinates
* @param {Intersection (out)} intersect : The intersection
*
* @returns {float} t : Parameter t so that point of intersection is ray.P0 + t*ray.V
*/
float rayIntersectScene(Ray ray, out Intersection intersect){return INF;}


/*******************************************
        RAY ILLUMINATION FUNCTIONS
********************************************/

/**
* Pull a material out of the list of materials, based on its
* index.  This function is necessary, because it is not possible
* to use non-constant indices into arrays in GLSL, so one must
* loop over the entire array of materials to find the right one
*
* @param {int} mIdx : The index into the materials array of the
*                     material we seekd
*
* @returns {Material} m : The appropriate material struct
*/
Material getMaterial(int mIdx) {
    Material m;
    for (int i = 0; i < MAX_MATERIALS; i++) {
        if (i == mIdx) {
            m = materials[i];
        }
    }
    return m;
}

/**
* Determine whether a point is in the shadow of a light
*
* @param {Intersection} intersect : Intersection point we're checking
* @param {int} lightIndex : Index into the array of lights of
*                           the light we want to check
*/
bool pointInShadow(Intersection intersect, Light l) {

/** TODO: PUT YOUR CODE HERE **/
    return false; // TODO: This is a dummy value
}

/**
* Get the phong illumination color
*/
vec3 getPhongColor(Intersection intersect, Material m) {
    vec3 color = vec3(0.0, 0.0, 0.0);
    // To help with debugging, color the fragment based on the
    // normal of the intersection.  But this should eventually
    // be replaced with code to do Phong illumination below
    color = 0.5*(intersect.n + 1.0);

/** TODO: PUT YOUR CODE HERE **/
    return color;
}


/**
*
*/
varying vec2 v_position;
Ray getRay() {
    Ray ray;
    ray.p0 = eye;
    // TODO: Finish constructing ray by figuring out direction, using
    // v_position.x, v_position.y, fovx, fovy, up, and right
    if (orthographic == 1) {
        // TODO: Fill in code for constructing orthographic rays
        // (You can ignore this if you aren't doing the orthographic extra task)

/** TODO: PUT YOUR CODE HERE **/
    }
    else {
        // TODO: Fill in ordinary perspective ray based on fovx and fovy (the default option)

/** TODO: PUT YOUR CODE HERE **/
    }
    return ray;
}

void showLightBeacons(Ray rayInitial, float tInitial) {
    // Show light beacons if the user so chooses
    // (NOTE: This requires a working implementation of rayIntersectSphere)
    mat4 identity4 = mat4(1.0);
    mat3 identity3 = mat3(1.0);
    Intersection intersect;
    if (showLights == 1) {
        for (int i = 0; i < MAX_LIGHTS; i++) {
            if (i < numLights) {
                Light light = lights[i];
                float tlight = rayIntersectSphere(rayInitial, light.pos, beaconRadius,
                                                  0, identity4, identity3, intersect);
                if (tlight < tInitial) {
                    gl_FragColor = vec4(light.color, 1.0);
                }
            }
        }
    }
}

void main() {
    Ray ray = getRay();
    Ray rayInitial = ray;
    bool insideObj = false;
    Intersection intersect;
    intersect.sCoeff = 1.0;
    vec3 color = vec3(0.0, 0.0, 0.0);
    vec3 weight = vec3(1.0, 1.0, 1.0);
    float t;
    float tInitial;
    for (int depth = 0; depth < MAX_RECURSION; depth++) {
        t = rayIntersectScene(ray, intersect);
        if (depth == 0) {
            tInitial = t;
        }
        if (t < INF) {
            Material m = getMaterial(intersect.mIdx);
            // Figure out whether the ray is inside the object it
            // intersected by using the dot product between a vector
            // from the endpoint of the ray and the intersection
            // point and the intersection normal
            if (dot(ray.p0 - intersect.p, intersect.n) < 0.0) {
                intersect.n *= -1.0;
                insideObj = true;
            }
            else {
                insideObj = false;
            }
            color += weight*getPhongColor(intersect, m);
            // TODO: Reflect ray, multiply weight by specular of this object,
            // and recursively continue
            // If doing extra task on transmission, only reflect if the
            // transmission coefficient kt is zero in all components
            // Otherwise, do transmission with snell's law

/** TODO: PUT YOUR CODE HERE **/
        }
        else {
            // Ray doesn't intersect anything, so no use continuing
            break;
        }
    }
    gl_FragColor = vec4(color, 1.0);
    showLightBeacons(rayInitial, tInitial);
}
