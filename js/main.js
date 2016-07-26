//main.js

//Get GL context
var canvas = document.getElementById("canvas")
var gl = canvas.getContext("webgl");

var stats = new Stats();
document.body.appendChild(stats.domElement);

var controller = {
  tesselation: 1,
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
function importModel(threeJSModelObject, modelOut) {

  var model = threeJSModelObject;
  
  var threeJSGeometry = model.geometries[0];
  
  var vertexCount = threeJSGeometry.data.metadata.vertices;
  var posFloats = threeJSGeometry.data.vertices;
  var normalFloats = threeJSGeometry.data.normals;
  var indices = threeJSGeometry.data.faces;
  var normalFloats2 = [];
  
  //swap z and y values
  if(true) {
    for(var i = 0; i < posFloats.length;i++) {
      i++;
      var temp = posFloats[i];
      posFloats[i] = posFloats[i+1];
      i++;
      posFloats[i] = temp;
    }
    for(var i = 0; i < normalFloats.length;i++) {
      i++;
      var temp = normalFloats[i];
      normalFloats[i] = normalFloats[i+1];
      i++;
      normalFloats[i] = temp;
    }
  }
  
  //maps position indices to correct normal indices
  var posNormalMap = [];
  
  var tIndices = [];
  //convert from QUADS to TRIANGLES format
  for(var i = 0; i < indices.length;)
  {
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
        
        var dstI = posI[j] * 3;
        var srcI = indices[i++] * 3;
        
        for(var k = 0; k < 3; k++) {
          normalFloats2[dstI++] = normalFloats[srcI++];
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
  indices = tIndices;
  
  modelOut.indices = indices;
  modelOut.posFloats = posFloats;
  modelOut.normalFloats = normalFloats2;
  modelOut.indexCount = indices.length;
}

/*
* Calculate normals for each triangle face and store them in "model.faceNormals"
*/
function addFaceNormals(model) {
	
	var randomMag = 0.1;
	var halfVector = vec3.create();
	vec3.set(halfVector, 0.5, 0.5, 0.5);
	
	//calculate face normals for each group of three indices
	var faceNormals = [];
	for(var i = 0; i < model.indices.length;) {
		
		//array of points that make up this triangle. 0 = A, 1 = B, 2 = C
		var pos = [];
		for(var j = 0; j < 3;j++) {
			var vertexID = model.indices[i++];
			
			faceNormals[vertexID] = faceNormal;
			
			pos.push(vec3.create());
			var floatI = vertexID * 3;
			for(var k = 0; k < 3; k++) {
				pos[j][k] = model.posFloats[floatI++];
			}
		}
		
		var faceNormal = vec3.create();
		faceNormals.push(faceNormal);
		
		
		//vectors that represent two edges of the triangle
		var vAB = vec3.create();
		var vAC = vec3.create();
		vec3.subtract(vAB, pos[1], pos[0]);
		vec3.normalize(vAB, vAB);
		vec3.subtract(vAC, pos[2], pos[0]);
		vec3.normalize(vAC, vAC);
		
		vec3.cross(faceNormal, vAB, vAC);
		vec3.normalize(faceNormal, faceNormal);
		
		//since the face normals are being used to calculate the triangles trajectory during the explosion
		//we can add some randomness to this normal vector to get a less uniform explosion effect.
		var ranV = vec3.create();
		vec3.set(ranV, Math.random(), Math.random(), Math.random());
		vec3.subtract(ranV, ranV, halfVector);
		vec3.scale(ranV, ranV, 2.0 * randomMag);
		
		vec3.add(faceNormal, faceNormal, ranV);
		//vec3.normalize(faceNormal, faceNormal);
	}
	
	model.faceNormals = faceNormals;
	model.drawArray = true;
}

/*
* Tesselates the triangles of the model's mesh using controller.tesselation
*/
function tesselateModel(model) {
  
  var posFloatsOut = model.posFloats;
  //posFloatsOut.concat(model.posFloats);
  var indicesOut = [];
  var normalFloatsOut = model.normalFloats;
  //normalFloatsOut.concat(model.normalFloats);
  
  function appendVertex(pos, normal) {
    posFloatsOut.push(pos[0], pos[1], pos[2]);
    normalFloatsOut.push(normal[0], normal[1], normal[2]);
  }
  
  function getVec3(fArray, index) {
    var offset = index * 3;
    var output = vec3.create();
    vec3.set(output, fArray[offset], fArray[offset+1], fArray[offset+2]);
    return output;
  }
  
  //amount > 0
  function subdivideTriangle(indices, amount) {
    
    var positions = [];
    var normals = [];
    for(var i = 0; i < 3;i++) {
      positions.push(getVec3(posFloatsOut, indices[i]));
      normals.push(getVec3(normalFloatsOut, indices[i]));
    }
    
    var interpolatedPositions = [];
    var interpolatedNormals = [];
    for(var i = 0; i < 3;i++) {
      //interpolate positions
      interpolatedPositions.push(vec3.create());
      vec3.subtract(interpolatedPositions[i], positions[i], positions[(i+1)%3]);
      vec3.scale(interpolatedPositions[i], interpolatedPositions[i], 0.5);
      vec3.add(interpolatedPositions[i], interpolatedPositions[i], positions[i]);
      //average and normalize normals
      interpolatedNormals.push(vec3.create());
      vec3.add(interpolatedNormals[i], normals[i], normals[(i+1)%3]);
      vec3.scale(interpolatedNormals[i], interpolatedPositions[i], 0.5);
      vec3.normalize(interpolatedNormals[i], interpolatedNormals[i]);
    }
    var offset = posFloatsOut.length / 3;
    //push our newly created vertices
    for(var i = 0; i < 3; i++) {
      appendVertex(interpolatedPositions[i], interpolatedNormals[i]);
    }
    
    function subTriangle(a, b, c, amount) {
      
      if(amount < 1){
        indicesOut.push(a, b, c);
      } else {
        subdivideTriangle([a, b, c], amount-1);
      }
    }
    
    //reference our newly created vertices
    subTriangle(indices[0], offset, offset+2, amount-1);
    subTriangle(offset, indices[1],offset+1, amount-1);
    subTriangle(offset+2, offset+1, indices[2], amount-1);
    subTriangle(offset, offset+1, offset+2, amount-1);
  }
  
  controller.tesselation = controller.tesselation|0;//make sure it is an integer
  if(controller.tesselation > 0) {
    for(var i = 0; i < model.indices.length;) {
      
      var indices = [];
      indices.push(model.indices[i++]);
      indices.push(model.indices[i++]);
      indices.push(model.indices[i++]);
      
      subdivideTriangle(indices, controller.tesselation);
    }
  } else {
    //do nothing
    indicesOut = model.indices;
  }
  
  model.indices = indicesOut;
  model.normalFloats = normalFloatsOut;
  model.posFloats = posFloatsOut;
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
	if(model.drawArray) {
		//convert seperate buffers into interleaved buffer
		for(var triangleI = 0; triangleI < model.faceNormals.length; triangleI++) {
			for(var j = 0; j < 3; j++) {
				
				var vertexID = model.indices[(triangleI * 3) + j];
				
				var posFloatI = vertexID * 3;
				var normalFloatI = vertexID * 3;//posNormalMap[vertexID] * 3;
				
				//append position
				interleavedBuffer.push(model.posFloats[posFloatI++]);
				interleavedBuffer.push(model.posFloats[posFloatI++]);
				interleavedBuffer.push(model.posFloats[posFloatI++]);
				//append per vertex normal
				interleavedBuffer.push(model.normalFloats[normalFloatI++]);
				interleavedBuffer.push(model.normalFloats[normalFloatI++]);
				interleavedBuffer.push(model.normalFloats[normalFloatI++]);
				//append face normal
				interleavedBuffer.push(model.faceNormals[triangleI][0]);
				interleavedBuffer.push(model.faceNormals[triangleI][1]);
				interleavedBuffer.push(model.faceNormals[triangleI][2]);
				
			}
		}
		
		model.vertexCount = model.faceNormals.length * 3;
		
	} else {
		//we dont handle this case
		return;
		
    if(!model.ib) {
      model.ib = gl.createBuffer();
    }
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);
	}
	
  if(!model.vb) {
    model.vb = gl.createBuffer();
  }
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vb);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(interleavedBuffer), gl.STATIC_DRAW);
	
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
	
  //render array of teapots arranged in a circle
  var objRot = 0.0;
  var objRotInc = Math.PI * 2.0 / (controller.instances|0);
  for(var i = 0; i < (controller.instances|0); i++) {
    
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
  importModel(threeJSModel, model);
  tesselateModel(model, controller.tesselation);
  addFaceNormals(model);
  createModelBufferArrays(model);
  
  
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
    gui.add(controller, "tesselation", 1, 4).onChange(resetScene);
    gui.add(controller, "instances", 1, 100).onChange(resetScene);
    gui.add(controller, "explode");

    init();
    resetScene();
    render();
  });
});

