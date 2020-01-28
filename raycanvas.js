/**
    A class to construct a shader corresponding to a scene.
    Every time the scene is changed, this should create a new
    fragment shader with elements of the scene declared as constants,
    and then it will call this fragment shader to set off the ray tracer

    Assumes that
    ggslac/viewers/scenecanvas.js
    ggslac/viewers/basecanvas.js
    have been included already
 */


const BASIC_VERTEXSHADER_SRC = "attribute vec2 a_position;varying vec2 v_position;void main() {gl_Position = vec4(a_position, 0, 1);v_position = a_position;}";
const DEFAULT_RAY_INTERSECT_SCENE_SRC = "float rayIntersectScene(Ray ray, out Intersection intersect){return INF;}";
const CHECK_NEAREST_INTERSECTION_SRC = "\tif(tCurr < tMin) {\n" +
                                        "\t\ttMin = tCurr;\n"+
                                        "\t\tintersect = intersectCurr;\n" +
                                        "\t}\n";
const MAX_MATERIALS = 10

function vec3ToGLSLStr(v, k) {
    if (k === undefined) {
        k = 5;
    }
    return "vec3(" + v[0].toFixed(k) + "," + v[1].toFixed(k) + "," + v[2].toFixed(k) + ")";
}

function matToGLSLStr(m, k) {
    if (k === undefined) {
        k = 5;
    }
    let s = "mat4(";
    if (m.length == 9) {
        s = "mat3(";
    }
    for (let i = 0; i < m.length; i++) {
        s += m[i].toFixed(k);
        if (i < m.length-1) {
            s += ",";
        }
    }
    s += ")";
    return s;
}

/**
 * 
 * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
 * @param {SceneCanvas} glslcanvas Pointer to glsl canvas
 */
function RayCanvas(glcanvas, glslcanvas) {
    // Initialize a WebGL handle and keyboard/mouse callbacks
    BaseCanvas(glcanvas); 
    // Store a pointer to the glsl canvas for looking up scene information
    glcanvas.glslcanvas = glslcanvas;
    glcanvas.vertexShader = null;
    glcanvas.fragmentShader = null;

    /**
     * A function that sends over information about the camera,
     * lights, and materials
     */
    glcanvas.updateUniforms = function() {
        let shader = glcanvas.shader;
        let gl = glcanvas.gl;
        gl.uniform1f(shader.u_canvas_width, glcanvas.clientWidth);
        gl.uniform1f(shader.u_canvas_height, glcanvas.clientHeight);
        let showLights = 0;
        if (glcanvas.glslcanvas.showLights) {
            showLights = 1;
        }
        gl.uniform1i(shader.u_showLights, showLights);
        gl.uniform1f(shader.u_beaconRadius, BEACON_SIZE);
        let orthographic = 0;
        if (glcanvas.orthographic) {
            orthographic = 1;
        }
        gl.uniform1i(shader.u_orthographic, orthographic);
        let camera = glcanvas.glslcanvas.camera;
        if (!(camera === null)) {
            gl.uniform3fv(shader.u_eye, camera.pos);
            gl.uniform3fv(shader.u_right, camera.right);
            gl.uniform3fv(shader.u_up, camera.up);
            gl.uniform1f(shader.u_fovx, camera.fovx);
            gl.uniform1f(shader.u_fovy, camera.fovy);
        }
        let scene = glcanvas.glslcanvas.scene;
        if (!(scene === null)) {
            if (scene.lights === null) {
                console.log("Warning: No lights declared in scene");
            }
            else {
                let numLights = Math.min(MAX_LIGHTS, scene.lights.length);
                gl.uniform1i(shader.u_numLights, numLights);
                for (let i = 0; i < numLights; i++) {
                    gl.uniform3fv(shader.u_lights[i].pos, scene.lights[i].camera.pos);
                    gl.uniform3fv(shader.u_lights[i].color, scene.lights[i].color);
                    gl.uniform3fv(shader.u_lights[i].atten, scene.lights[i].atten);
                    let towards = glMatrix.vec3.create();
                    glMatrix.vec3.cross(towards, scene.lights[i].camera.up, scene.lights[i].camera.right);
                    glMatrix.vec3.normalize(towards, towards);
                    gl.uniform3fv(shader.u_lights[i].towards, towards);
                    gl.uniform1f(shader.u_lights[i].angle, scene.lights[i].angle);
                }                
            }
            if (scene.materialsArr === null) {
                console.log("Warning: No materials declared in scene");
            }
            else {
                let numMaterials = Math.min(MAX_MATERIALS, scene.materialsArr.length);
                gl.uniform1i(shader.u_numMaterials, numMaterials);
                for (i = 0; i < numMaterials; i++) {
                    gl.uniform3fv(shader.u_materials[i].kd, scene.materialsArr[i].kd);
                    gl.uniform3fv(shader.u_materials[i].ks, scene.materialsArr[i].ks);
                    gl.uniform3fv(shader.u_materials[i].ka, scene.materialsArr[i].ka);
                    gl.uniform1f(shader.u_materials[i].shininess, scene.materialsArr[i].shininess);
                    gl.uniform1f(shader.u_materials[i].refraction, scene.materialsArr[i].refraction);
                    let special = 0;
                    if (scene.materialsArr[i].special) {
                        special = 1;
                    }
                    gl.uniform1i(shader.u_materials[i].special, special);
                }
            }
        }
    }

    /**
     * Setup the vertex shader and four corners of the image
     * once at the beginning of initializing this object, 
     * since they never change
     */
    glcanvas.setupInitialBuffers = function() {
        let gl = glcanvas.gl;
        glcanvas.fragmentSrcPre = BlockLoader.loadTxt("raytracer.frag");

        glcanvas.vertexShader = getShader(gl, BASIC_VERTEXSHADER_SRC, "vertex");
    
        // Setup four corners of the image in a vertex buffer
        glcanvas.positionBuffer = gl.createBuffer();
        const positions = new Float32Array([-1.0,  1.0,
                                            1.0,  1.0,
                                            -1.0, -1.0,
                                            1.0, -1.0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, glcanvas.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
        // Setup 2 triangles connecting the vertices so that there
        // are solid shaded regions
        glcanvas.indexBuffer = gl.createBuffer();
        glcanvas.indexBuffer.itemSize = 1;
        glcanvas.indexBuffer.numItems = 6;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glcanvas.indexBuffer);
        const tris = new Uint16Array([0, 1, 2, 1, 2, 3]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tris, gl.STATIC_DRAW);
    }

    /**
     * A function to compile together the vertex shader and the fragment shader
     * setup from the scene, and to get pointers to all of the uniforms
     * 
     * @param {string} rayIntersectSceneStr The code that defines the rayIntersectScene string
     * @param {boolean} verbose Whether to print the final shader code to the console
     */
    glcanvas.setupShaders = function(rayIntersectSceneStr, verbose) {
        if (rayIntersectSceneStr === undefined) {
            rayIntersectSceneStr = DEFAULT_RAY_INTERSECT_SCENE_SRC;
        }
        if (verbose === undefined) {
            verbose = false;
        }
        let gl = glcanvas.gl;
        if (!(glcanvas.fragmentShader === null)) {
            gl.deleteShader(glcanvas.fragmentShader);
        }
        if (rayIntersectSceneStr === undefined) {
            rayIntersectSceneStr = "";
        }
        let tic = performance.now();
        let s = glcanvas.fragmentSrcPre.replace(DEFAULT_RAY_INTERSECT_SCENE_SRC, rayIntersectSceneStr);
        if (verbose) {
            console.log(s);
        }
        glcanvas.fragmentShader = getShader(gl, s, "fragment");

        glcanvas.shader = gl.createProgram();
        let shader = glcanvas.shader;
        gl.attachShader(shader, glcanvas.vertexShader);
        gl.attachShader(shader, glcanvas.fragmentShader);
        gl.linkProgram(shader);
        if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
            alert("Could not initialize raytracing shader");
        }
        shader.name = "raytracer";
        console.log("Elapsed Time Ray Shader Compilation: " + (performance.now()-tic) + " milliseconds");

        shader.positionLocation = gl.getAttribLocation(shader, "a_position");
        gl.enableVertexAttribArray(shader.positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, glcanvas.positionBuffer);
        gl.vertexAttribPointer(shader.positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Setup uniforms
        shader.u_canvas_width = gl.getUniformLocation(shader, "canvas_width");
        shader.u_canvas_height = gl.getUniformLocation(shader, "canvas_height");
        shader.u_numObjects = gl.getUniformLocation(shader, "numObjects");
        shader.u_numLights = gl.getUniformLocation(shader, "numLights");
        shader.u_numMaterials = gl.getUniformLocation(shader, "numMaterials");
        shader.u_showLights = gl.getUniformLocation(shader, "showLights");
        shader.u_beaconRadius = gl.getUniformLocation(shader, "beaconRadius");
        shader.u_orthographic = gl.getUniformLocation(shader, "orthographic");
        shader.u_eye = gl.getUniformLocation(shader, "eye");
        shader.u_right = gl.getUniformLocation(shader, "right");
        shader.u_up = gl.getUniformLocation(shader, "up");
        shader.u_fovx = gl.getUniformLocation(shader, "fovx");
        shader.u_fovy = gl.getUniformLocation(shader, "fovy");
        shader.u_lights = [];
        for (let i = 0; i < MAX_LIGHTS; i++) {
            let light = {
                pos: gl.getUniformLocation(shader, "lights["+i+"].pos"),
                color: gl.getUniformLocation(shader, "lights["+i+"].color"),
                atten: gl.getUniformLocation(shader, "lights["+i+"].atten"),
                towards: gl.getUniformLocation(shader, "lights["+i+"].towards"),
                angle: gl.getUniformLocation(shader, "lights["+i+"].angle")
            };
            shader.u_lights.push(light);
        }
        shader.u_materials = [];
        for (let i = 0; i < MAX_MATERIALS; i++) {
            let material = {
                kd: gl.getUniformLocation(shader, "materials["+i+"].kd"),
                ks: gl.getUniformLocation(shader, "materials["+i+"].ks"),
                ka: gl.getUniformLocation(shader, "materials["+i+"].ka"),
                shininess: gl.getUniformLocation(shader, "materials["+i+"].shininess"),
                refraction: gl.getUniformLocation(shader, "materials["+i+"].refraction"),
                special: gl.getUniformLocation(shader, "materials["+i+"].special")
            }
            shader.u_materials.push(material);
        }
    }

    /**
     * A recursive function for adding shapes to the scene by adding
     * code to the fragment shader
     * 
     * @param {object} node The current node in the scene
     * @param {glMatrix.mat4} transform The accumulated transform up to this point
     * @param {int} k The number of floating point digits to output to the shader
     *                for each floating point number
     */
    glcanvas.updateSceneRec = function(node, transform, k) {
        if (k === undefined) {
            k = 5;
        }
        let nextTransform = glMatrix.mat4.create();
        glMatrix.mat4.mul(nextTransform, transform, node.transform);
        let N = glMatrix.mat3.create();
        glMatrix.mat3.normalFromMat4(N, nextTransform);
        let MInv = glMatrix.mat4.create();
        glMatrix.mat4.invert(MInv, nextTransform);
        let retStr = "";
        node.shapes.forEach(function(shape) {
            if (!('material' in shape)) {
                console.log("Error: Material not specified for node");
            }
            else {
                let mIdx = shape.material.i;
                if (shape.type == "box") {
                    retStr += "\ttCurr = rayIntersectBox("
                    let width = 1.0;
                    let height = 1.0;
                    let length = 1.0;
                    let center = glMatrix.vec3.create();
                    if ('width' in shape) {
                        width = shape.width;
                    }
                    if ('height' in shape) {
                        height = shape.height;
                    }
                    if ('length' in shape) {
                        length = shape.length;
                    }
                    if ('center' in shape) {
                        center = shape.center;
                    }
                    retStr += "ray, " + width.toFixed(k) + ", " + 
                              height.toFixed(k) + ", " + length.toFixed(k);
                    retStr += ", " + vec3ToGLSLStr(center) + ", " + mIdx;
                    retStr += ", " + matToGLSLStr(MInv)
                    retStr += ", " + matToGLSLStr(N)
                    retStr += ", intersectCurr);\n";
                    retStr += CHECK_NEAREST_INTERSECTION_SRC;
                }
                else if (shape.type == "sphere") {
                    retStr += "\ttCurr = rayIntersectSphere("
                    let radius = 1.0;
                    let center = glMatrix.vec3.create();
                    if ('radius' in shape) {
                        radius = shape.radius;
                    }
                    if ('center' in shape) {
                        center = shape.center;
                    }
                    retStr += "ray, " +  vec3ToGLSLStr(center)
                    retStr += ", " + radius.toFixed(k) + ", " + mIdx;
                    retStr += ", " + matToGLSLStr(MInv)
                    retStr += ", " + matToGLSLStr(N)
                    retStr += ", intersectCurr);\n";
                    retStr += CHECK_NEAREST_INTERSECTION_SRC;
                }
                else if (shape.type == "cylinder") {
                    retStr += "\ttCurr = rayIntersectCylinder("
                    let radius = 1.0;
                    let height = 1.0;
                    let center = glMatrix.vec3.create();
                    if ('radius' in shape) {
                        radius = shape.radius;
                    }
                    if ('height' in shape) {
                        height = shape.height;
                    }
                    if ('center' in shape) {
                        center = shape.center;
                    }
                    retStr += "ray, " +  vec3ToGLSLStr(center)
                    retStr += ", " + radius.toFixed(k) 
                    retStr += ", " + height.toFixed(k) + ", " + mIdx;
                    retStr += ", " + matToGLSLStr(MInv)
                    retStr += ", " + matToGLSLStr(N)
                    retStr += ", intersectCurr);\n";
                    retStr += CHECK_NEAREST_INTERSECTION_SRC;
                }
                else if (shape.type == "cone") {
                    retStr += "\ttCurr = rayIntersectCone("
                    let radius = 1.0;
                    let height = 1.0;
                    let center = glMatrix.vec3.create();
                    if ('radius' in shape) {
                        radius = shape.radius;
                    }
                    if ('height' in shape) {
                        height = shape.height;
                    }
                    if ('center' in shape) {
                        center = shape.center;
                    }
                    retStr += "ray, " +  vec3ToGLSLStr(center)
                    retStr += ", " + radius.toFixed(k) 
                    retStr += ", " + height.toFixed(k) + ", " + mIdx;
                    retStr += ", " + matToGLSLStr(MInv)
                    retStr += ", " + matToGLSLStr(N)
                    retStr += ", intersectCurr);\n";
                    retStr += CHECK_NEAREST_INTERSECTION_SRC;
                }
                else if (shape.type == "mesh") {
                    if (shape.mesh === null) {
                        console.log("ERROR: No mesh specified for mesh shape. Not loading into shader");
                    }
                    else {
                        let mesh = shape.mesh;
                        // Step 1: Copy mesh vertices over if they haven't been copied already
                        if (!('prefix' in mesh)) {
                            mesh.prefix = "m" + glcanvas.meshIdx;
                            glcanvas.meshIdx += 1;
                            //First copy over all vertices into their own variables
                            for (let i = 0; i < mesh.vertices.length; i++) {
                                retStr += "\tvec3 " + mesh.prefix + "_" + "v" + i;
                                retStr += " = " + vec3ToGLSLStr(mesh.vertices[i].pos) + ";\n";
                            }
                        }
                        // Step 2: Check each face
                        let vertPrefix = mesh.prefix + "_" + "v";
                        for (let i = 0; i < mesh.faces.length; i++) {
                            let verts = mesh.faces[i].getVertices();
                            // Go through each triangle in CCW order in a triangle fan
                            for (let t = 0; t < verts.length-2; t++) {
                                retStr += "\ttCurr = rayIntersectTriangle(ray";
                                retStr += ", " + vertPrefix + verts[0].ID;
                                for (let k = 1; k < 3; k++) {
                                    retStr += ", " + vertPrefix + verts[(t+k)%verts.length].ID;
                                }
                                retStr += ", " + mIdx;
                                retStr += ", " + matToGLSLStr(MInv)
                                retStr += ", " + matToGLSLStr(N)
                                retStr += ", intersectCurr);\n";
                                retStr += CHECK_NEAREST_INTERSECTION_SRC;
                            }
                        }
                    }
                }
            }
        });
        if ('children' in node) {
            for (let i = 0; i < node.children.length; i++) {
                retStr += glcanvas.updateSceneRec(node.children[i], nextTransform) + "\n";
            }
        }
        return retStr;
    }

    /**
     * Setup and compile a new fragment shader based on objects in the scene
     */
    glcanvas.updateScene = function() {
        let c = glcanvas.glslcanvas;

        let scene = c.scene;
        if (scene === null) {
            console.log("Warning: Trying to add shapes to ray tracing fragment shader, but scene is null");
            return;
        }

        // Pull the materials out into an array, and store an index into
        // that array for each material
        scene.materialsArr = [];
        let i = 0;
        for (let name in scene.materials) {
            if (Object.prototype.hasOwnProperty.call(scene.materials, name)) {
                scene.materialsArr.push(scene.materials[name]);
                scene.materials[name].i = i;
                i += 1;
            }
        }

        // Step 1: Setup handlers for menus that will repaint
        // when light, camera, and material properties are changed, 
        // assuming this canvas is active
        [c.lightMenus, c.cameraMenus, c.materialMenus].forEach(function(menu) {
            if (!(menu === undefined)) {
                menu.forEach(function(m) {
                    m.__controllers.forEach(function(controller) {
                        // Still call the handler that was there before
                        // but add on a handler that repaints this canvas
                        // if it is active
                        let otherHandler = controller.__onChange;
                        controller.onChange(function(v) {
                            otherHandler(v);
                            if (glcanvas.active) {
                                requestAnimFrame(glcanvas.repaint);
                            }
                        });
                    });
                });
            }
        });

        // Step 2: Setup fragment shader to hardcode in scene
        let rayIntersectSceneStr = "\n\n" +
          "float rayIntersectScene(Ray ray, out Intersection intersect) {\n" +
          "\tfloat tMin = INF;\n" +
          "\tIntersection intersectCurr;\n" + 
          "\tfloat tCurr = INF;\n";
        
        let m = glMatrix.mat4.create();
        glcanvas.meshIdx = 0;
        scene.children.forEach(function(node) {
            rayIntersectSceneStr += glcanvas.updateSceneRec(node, m) + "\n";
        });

        rayIntersectSceneStr += "\treturn tMin;\n}";
        glcanvas.setupShaders(rayIntersectSceneStr, true);
    }

    glcanvas.repaint = function() {
        let camera = glcanvas.glslcanvas.camera;
        let shader = glcanvas.shader;
        let gl = glcanvas.gl;
        gl.useProgram(shader);
        glcanvas.updateUniforms();

        // Draw two triangles to fill in all the pixels
        gl.drawElements(gl.TRIANGLES, glcanvas.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

        // Redraw if walking
        let thisTime = (new Date()).getTime();
        let dt = (thisTime - glcanvas.lastTime)/1000.0;
        glcanvas.lastTime = thisTime;
        if (glcanvas.movelr != 0 || glcanvas.moveud != 0 || glcanvas.movefb != 0) {
            camera.translate(0, 0, glcanvas.movefb, glcanvas.glslcanvas.walkspeed*dt);
            camera.translate(0, glcanvas.moveud, 0, glcanvas.glslcanvas.walkspeed*dt);
            camera.translate(glcanvas.movelr, 0, 0, glcanvas.glslcanvas.walkspeed*dt);
            camera.position = vecToStr(camera.pos);
            requestAnimFrame(glcanvas.repaint);
        }

    }

    /**
     * A function to move the camera associated to the glsl canvas
     */
    glcanvas.clickerDraggedSync = function(evt) {
        evt.preventDefault();
        let mousePos = this.getMousePos(evt);
        let dX = mousePos.X - this.lastX;
        let dY = mousePos.Y - this.lastY;
        this.lastX = mousePos.X;
        this.lastY = mousePos.Y;
        let camera = glcanvas.glslcanvas.camera;
        if (!(camera === null)) {
            if (glcanvas.dragging) {
                //Rotate camera by mouse dragging
                camera.rotateLeftRight(-dX);
                camera.rotateUpDown(-dY);
                requestAnimFrame(glcanvas.repaint);
            }
        }
        return false;
    }
    glcanvas.removeEventListener('mousemove', glcanvas.clickerDragged);
    glcanvas.addEventListener('mousemove', glcanvas.clickerDraggedSync);
    glcanvas.removeEventListener('touchmove', glcanvas.clickerDragged);
    glcanvas.addEventListener('touchmove', glcanvas.clickerDraggedSync);

    glcanvas.rayMenu = glcanvas.glslcanvas.gui.addFolder('Ray Tracing Options');
    glcanvas.orthographic = false;
    glcanvas.rayMenu.add(glcanvas, 'orthographic').onChange(function() {
        requestAnimFrame(glcanvas.repaint);
    });


    glcanvas.setupInitialBuffers();
    glcanvas.setupShaders();
}
