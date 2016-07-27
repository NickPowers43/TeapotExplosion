//main.js

//Get GL context
var canvas = document.getElementById("canvas")
var gl = canvas.getContext("webgl");

var stats = new Stats();
document.body.appendChild(stats.domElement);

var controller = {
  tessellation: 0,
  instances: 3,
}

var gui;
var mainProgram;

var SHADER_TYPE_NAME_MAP = {};
SHADER_TYPE_NAME_MAP[gl.VERTEX_SHADER] = "vertex";
SHADER_TYPE_NAME_MAP[gl.FRAGMENT_SHADER] = "fragment";

var ATTRIB_POS_LOCATION = 0;
var ATTRIB_NORMAL_LOCATION = 1;
var ATTRIB_TRAJECTORY_LOCATION = 2;

/*
* Resize canvas buffer to fit its current size on the screen
*/
function resizeCanvas() {
	var width  = canvas.clientWidth;
	var height = canvas.clientHeight;

	if (canvas.width  != width || canvas.height != height) {
		
		canvas.width  = width;
		canvas.height = height;
	}
}

/*
* Loads a file in a text format from the given url
*/
function loadText(url, loadSuccess) {
	$.ajax({
		url : url,
		dataType: "text",
		success : loadSuccess
	});
}

/*
* Load and compile a shader program from source files at the following urls
*/
function createShader(gl, type, sourcePath, createSuccess) {
	
	function loadSuccess(source) {
		
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert("Failed to compile " + SHADER_TYPE_NAME_MAP[type] + " shader:\n" + gl.getShaderInfoLog(shader));
			return;
		}
		
		createSuccess(shader);
	}
	
	loadText(sourcePath, loadSuccess);
}

/*
* Creates, compiles, and links an OpenGL program
*/
function createProgram(gl, vSourcePath, fSourcePath, success) {
	
	//load shaders
	createShader(gl, gl.VERTEX_SHADER, vSourcePath, function (vs) {
	createShader(gl, gl.FRAGMENT_SHADER, fSourcePath, function (fs){
		
		var program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			alert("Failed to link program:\n" + vSourcePath + "\n" + fSourcePath + "\n" + gl.getProgramInfoLog(program));
			return;
		}
		
		success(program);
	});});
}

/*
* Imports a Three.js model in the following format
* {
* 	indices: [ Integer, ...],
*	  posFloats: [ Float, ...],
*	  normalFloats: [ Float, ...],
*	  indexCount: indices.length
* }
*/
function importModel(threeJSModelObject) {

  var model = threeJSModelObject;
  
  var threeJSGeometry = model.geometries[0];
  
  var vertexCount = threeJSGeometry.data.metadata.vertices;
  var posFloats = threeJSGeometry.data.vertices;
  var normalFloats = threeJSGeometry.data.normals;
  var indices = threeJSGeometry.data.faces;
  
  //swap z and y values
  if(true) {
    for(var i = 0; i < posFloats.length;i++) {
      i++;
      var temp = posFloats[i];
      posFloats[i] = posFloats[i+1];
      i++;
      posFloats[i] = temp;
    }
  }
  
  //maps position indices to correct normal indices
  var posNormalMap = [];
  
  var tIndices = [];
  //convert from QUADS to TRIANGLES format
  for(var i = 0; i < indices.length;) {
    var type = indices[i++];
    
    var isQuad = type & 1;
    var vPerFace = (isQuad) ? 4 : 3;
    
    var posI = []
    for(var j = 0; j < vPerFace; j++){
      posI.push(indices[i++]);
    }
    
    if (isQuad) {
      tIndices.push(posI[0]);
      tIndices.push(posI[1]);
      tIndices.push(posI[3]);
      
      tIndices.push(posI[3]);
      tIndices.push(posI[1]);
      tIndices.push(posI[2]);
    } else {
      for(var j = 0; j < vPerFace; j++){
        tIndices.push(i);
      }
    }
    
    if(type & 2) {
      i++;//skip face material id
    }
    
    if(type & 4) {
      i++;//skip face uv
    }
    
    if(type & 8) {
      //skip face vertex uvs
      for(var j = 0; j < vPerFace; j++){
        i++;
      }
    }
    
    if(type & 16) {
      i++;//skip face normal
    }
    
    if(type & 32)
    {
      //skip normal indices
      for(var j = 0; j < vPerFace; j++){
        
        var normalI = indices[i++];
        if(typeof posNormalMap[posI[j]] === 'undefined') {
          posNormalMap[posI[j]] = normalI;
        } else if (posNormalMap[posI[j]] != normalI) {
          console.log("mismatch");
        }
      }
    }
    
    if(type & 64) {
      i++;//skip face color
    }
    
    if(type & 128) {
      //skip face vertex color
      for(var j = 0; j < vPerFace; j++){
        i++;
      }
    }
  }
  
  var normalFloats2 = [];
  for(var i = 0; i < posNormalMap.length;i++) {
    var fIndex = posNormalMap[i] * 3;
    //swap y and z values
    normalFloats2.push(normalFloats[fIndex]);
    normalFloats2.push(normalFloats[fIndex+2]);
    normalFloats2.push(normalFloats[fIndex+1]);
  }
  normalFloats = normalFloats2;
  
  indices = tIndices;
  
  return {
    indices : indices,
    posFloats : posFloats,
    normalFloats : normalFloats,
    indexCount : indices.length,
  }
}

var randomMag = 0.1;
var halfVector = vec3.create();
vec3.set(halfVector, 0.5, 0.5, 0.5);
/*
* Calculate normals for each triangle face and store them in "model.faceNormals"
*/
function calculateFaceNormal(a, b, c) {
  var faceNormal = vec3.create();
  
  //vectors that represent two edges of the triangle
  var vAB = vec3.create();
  var vAC = vec3.create();
  vec3.subtract(vAB, b, a);
  vec3.normalize(vAB, vAB);
  vec3.subtract(vAC, c, a);
  vec3.normalize(vAC, vAC);
  
  //take the cross product of the edge vectors and normalize the result
  vec3.cross(faceNormal, vAC, vAB);
  vec3.normalize(faceNormal, faceNormal);
  
  //since the face normals are being used to calculate the triangles trajectory during the explosion
  //we can add some randomness to this normal vector to get a less uniform explosion effect.
  var ranV = vec3.create();
  vec3.set(ranV, Math.random(), Math.random(), Math.random());
  vec3.subtract(ranV, ranV, halfVector);
  vec3.scale(ranV, ranV, 2.0 * randomMag);
  
  vec3.add(faceNormal, faceNormal, ranV);
  
  return faceNormal;
}

/*
* Creates the necessary vertex and index buffers for the given model
* {
* 	indexCount : Integer, 	//number of indices
* 	vb : WebGLBuffer, 		//vertex buffer containing [posX, posY, posZ, normalX, normalY, normalZ, tNormalX, tNormalY, tNormalZ, ...]
* 	ib : WebGLBuffer, 		//index buffer containing triangle indices
* }
*/
function createModelBufferArrays(model) {
	
	var interleavedBuffer = [];
  
  //Append a vertex with the following attributes to the interleavedBuffer array
  function appendVertex(position, normal, trajectory) {
    //append position
    interleavedBuffer.push(position[0]);
    interleavedBuffer.push(position[1]);
    interleavedBuffer.push(position[2]);
    //append normal
    interleavedBuffer.push(normal[0]);
    interleavedBuffer.push(normal[1]);
    interleavedBuffer.push(normal[2]);
    //append face normal
    interleavedBuffer.push(trajectory[0]);
    interleavedBuffer.push(trajectory[1]);
    interleavedBuffer.push(trajectory[2]);
  }
  
  //gets a vector3 at index "index"
  function getVec3(fArray, index) {
    var offset = index * 3;
    var output = vec3.create();
    vec3.set(output, fArray[offset], fArray[offset+1], fArray[offset+2]);
    return output;
  }
  
  /*
  * Recursive function that either subdivides itself and calls itself on
  * the resulting triangles or appends a triangle to the vertex array.
  */
  function processTriangle(a, b, c, tessellate) {
    if(tessellate < 1){
      faceNormal = calculateFaceNormal(a.position, b.position, c.position);
      appendVertex(a.position, a.normal, faceNormal);
      appendVertex(b.position, b.normal, faceNormal);
      appendVertex(c.position, c.normal, faceNormal);
    } else {
      var vertices = [a, b, c];
      var interpolatedVertices = [];
      for(var i = 0; i < 3;i++) {
        var iPosition = vec3.create();
        var iNormal = vec3.create();
        
        //interpolate positions
        vec3.subtract(iPosition, vertices[(i+1)%3].position, vertices[i].position);
        vec3.scale(iPosition, iPosition, 0.5);
        vec3.add(iPosition, iPosition, vertices[i].position);
        //average and normalize normals
        vec3.add(iNormal, vertices[i].normal, vertices[(i+1)%3].normal);
        vec3.scale(iNormal, iNormal, 0.5);
        vec3.normalize(iNormal, iNormal);
        
        interpolatedVertices.push({
          position: iPosition,
          normal: iNormal,
        });
      }
      
      //reference our newly created vertices
      processTriangle(vertices[0], interpolatedVertices[0], interpolatedVertices[2], tessellate-1);
      processTriangle(interpolatedVertices[0], vertices[1],interpolatedVertices[1], tessellate-1);
      processTriangle(interpolatedVertices[2], interpolatedVertices[1], vertices[2], tessellate-1);
      processTriangle(interpolatedVertices[0], interpolatedVertices[1], interpolatedVertices[2], tessellate-1);
    }
  }
  
  //run processTriangle on each triangle within model
  for(var indexI = 0; indexI < model.indices.length;) {
    var tVertices = [];
    for(var i = 0; i < 3;i++) {
      tVertices.push({
        position: getVec3(model.posFloats, model.indices[indexI]),
        normal: getVec3(model.normalFloats, model.indices[indexI]),
      });
      indexI++;
    }
    processTriangle(tVertices[0], tVertices[1], tVertices[2], controller.tessellation);
  }
  
  model.vertexCount = interleavedBuffer.length / 9;
  model.polygons = model.vertexCount / 3;
	
  if(!model.vb) {
    model.vb = gl.createBuffer();
  }
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vb);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(interleavedBuffer), gl.STATIC_DRAW);
	
	model.drawArray = true;
}

function bindModel(model) {
	
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vb);
	
	gl.enableVertexAttribArray(ATTRIB_POS_LOCATION);
	gl.enableVertexAttribArray(ATTRIB_NORMAL_LOCATION);
	gl.enableVertexAttribArray(ATTRIB_TRAJECTORY_LOCATION);
	
	gl.vertexAttribPointer(ATTRIB_POS_LOCATION, 3, gl.FLOAT, false, 36, 0);
	gl.vertexAttribPointer(ATTRIB_NORMAL_LOCATION, 3, gl.FLOAT, false, 36, 12);
	gl.vertexAttribPointer(ATTRIB_TRAJECTORY_LOCATION, 3, gl.FLOAT, false, 36, 24);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.ib);
}
function drawModel(model) {
	
	if(model.drawArray) {
		gl.drawArrays(gl.TRIANGLES, 0, model.vertexCount);
	} else {
		gl.drawElements(gl.TRIANGLES, model.indexCount, gl.UNSIGNED_SHORT, 0);
	}
	
}

var angle = 0.0;
var time = 0.0;
var explode = false;

controller.explode = function() {
  explode = !explode;
}

var tpColorBase = vec3.create();
vec3.set(tpColorBase, 0.5, 0.5, 0.5);
var tpColorHot = vec3.create();
vec3.set(tpColorHot, 255.0 / 255.0, 251.0 / 255.0, 140.0 / 255.0);

var minusLightDir = vec3.create();
vec3.set(minusLightDir, 0.0, 1.0, 0.0);

var model = {};

function render(context) {
	
	resizeCanvas();
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	gl.useProgram(mainProgram);
	
	var projMatLocation = gl.getUniformLocation(mainProgram, "proj");
	//var viewMatLocation = gl.getUniformLocation(mainProgram, "view");
	var modelMatLocation = gl.getUniformLocation(mainProgram, "model");
	var timeFloatLocation = gl.getUniformLocation(mainProgram, "time");
	var colorVecLocation = gl.getUniformLocation(mainProgram, "color");
	var minusLightDirVecLocation = gl.getUniformLocation(mainProgram, "minusLightDir");
	
	var projMat = mat4.create();// = new Perspective(Math.PI * 0.35, canvas.width / canvas.height, 0.1, 1000.0);
	mat4.perspective(projMat, Math.PI * 0.35, canvas.width / canvas.height, 0.1, 1000.0);
	
	var tpColor = vec3.create();
	vec3.lerp(tpColor, tpColorBase, tpColorHot, 0.5);
	
	var camPos = vec3.create();
	camPos[0] = Math.cos(angle) * 100.0;
	camPos[1] = 0.0;
	camPos[2] = Math.sin(angle) * 100.0;
	var up = vec3.create();
  vec3.set(up, 0.0, 1.0, 0.0);
  var right = vec3.create();
  vec3.set(right, 1.0, 0.0, 0.0);
  
	var zero = vec3.create();
	
	var viewMat = mat4.create();
  //gl.uniformMatrix4fv(viewMatLocation, false, viewMat);
	
	var modelPos = vec3.create();
  vec3.set(modelPos, 0.0, -15.0, -200.0);
  
	var modelMat = mat4.create();
	var tempMat = mat4.create();
	
  controller.instances |= 0;
  
  //render array of teapots arranged in a circle
  var objRot = 0.0;
  var objRotInc = Math.PI * 2.0 / controller.instances;
  for(var i = 0; i < controller.instances; i++) {
    
    mat4.translate(tempMat, mat4.create(), modelPos);
    mat4.rotate(tempMat, tempMat, Math.PI / 4.0, right);
    mat4.rotate(tempMat, tempMat, objRot, up);
    mat4.translate(modelMat, tempMat, modelPos);
    
    gl.uniformMatrix4fv(projMatLocation, false, projMat);
    gl.uniformMatrix4fv(modelMatLocation, false, modelMat);
    gl.uniform1f(timeFloatLocation, time);
    gl.uniform3fv(colorVecLocation, tpColor);
    gl.uniform3fv(minusLightDirVecLocation, tpColor);
    
    bindModel(model);
    drawModel(model);
    
    objRot += objRotInc;
  }
  
	angle += 0.005;
  
	if(time > 4.0){
    explode = false;
		time = 0.0;
	} else if (explode) {
    time += 0.016;
  } else {
    time = 0.0;
  }
  
  stats.update();
	
	//callback for next frame
	window.setTimeout(function (){
		render(context);
	}, 1000 / 60);
}

var threeJSModel;

function resetScene() {
  if(model) {
    if(model.ib) {
      gl.deleteBuffer(model.ib);
    }
    if(model.vb) {
      gl.deleteBuffer(model.vb);
    }
  }
  model = importModel(threeJSModel);
  createModelBufferArrays(model);
  $("#polyCountLabel").html("Polycount: " + model.polygons);
}

function init() {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.CULL_FACE);
}

loadText("models/utah-teapot.json", function(data) {
  threeJSModel = JSON.parse(data);
  createProgram(gl, "shaders/test.vs", "shaders/test.fs", function success(program){
    mainProgram = program;
    //set locations of vertex attributes
    gl.bindAttribLocation(program, ATTRIB_POS_LOCATION, "position");
    gl.bindAttribLocation(program, ATTRIB_NORMAL_LOCATION, "normal");
    gl.bindAttribLocation(program, ATTRIB_TRAJECTORY_LOCATION, "trajectory");

    gui = new dat.GUI();
    gui.add(controller, "tessellation", 0, 4).onChange(resetScene);
    gui.add(controller, "instances", 1, 100);
    gui.add(controller, "explode");

    init();
    resetScene();
    render();
  });
});

