//main.js

//Get GL context
var canvas = document.getElementById("canvas")
var gl = canvas.getContext("webgl");

var SHADER_TYPE_NAME_MAP = {};
SHADER_TYPE_NAME_MAP[gl.VERTEX_SHADER] = "vertex";
SHADER_TYPE_NAME_MAP[gl.FRAGMENT_SHADER] = "fragment";

var ATTRIB_POS_LOCATION = 0;
var ATTRIB_NORMAL_LOCATION = 1;
var ATTRIB_TNORMAL_LOCATION = 2;

function resizeCanvas() {
	var width  = canvas.clientWidth;
	var height = canvas.clientHeight;

	if (canvas.width  != width || canvas.height != height) {
		
		canvas.width  = width;
		canvas.height = height;
	}
}

function loadText(path, loadSuccess) {
	$.ajax({
		url : path,
		dataType: "text",
		success : loadSuccess
	});
}

//load and compile shader
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
* 	indexCount : Integer, 	//number of indices
* 	vb : WebGLBuffer, 		//array of components for vertices [posX, posY, posZ, normalX, normalY, normalZ, tNormalX, tNormalY, tNormalZ, ...]
* 	ib : WebGLBuffer, 		//array of indices (TRIANGLES)
* }
*/
function loadModel(gl, path, success) {

	loadText(path, function(data) {
		
		var model = JSON.parse(data);
		
		console.log(model);
		
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
		
		success({
			indices: indices,
			posFloats: posFloats,
			normalFloats: normalFloats2,
			indexCount: indices.length
		});
	});
}

function addFaceNormals(model) {
	
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
	}
	
	model.faceNormals = faceNormals;
	model.drawArray = true;
}

function createModelBufferArrays(model, success) {
	
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
		
		model.ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);
	}
	
	model.vb = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vb);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(interleavedBuffer), gl.STATIC_DRAW);
	
	success(model);
}

function bindModel(model) {
	
	gl.bindBuffer(gl.ARRAY_BUFFER, model.vb);
	gl.enableVertexAttribArray(ATTRIB_POS_LOCATION);
	gl.enableVertexAttribArray(ATTRIB_NORMAL_LOCATION);
	gl.enableVertexAttribArray(ATTRIB_TNORMAL_LOCATION);
	gl.vertexAttribPointer(ATTRIB_POS_LOCATION, 3, gl.FLOAT, false, 36, 0);
	gl.vertexAttribPointer(ATTRIB_NORMAL_LOCATION, 3, gl.FLOAT, false, 36, 12);
	gl.vertexAttribPointer(ATTRIB_TNORMAL_LOCATION, 3, gl.FLOAT, false, 36, 24);
	
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

var tpColorBase = vec3.create();
vec3.set(tpColorBase, 0.5, 0.5, 0.5);
var tpColorHot = vec3.create();
vec3.set(tpColorHot, 255.0 / 255.0, 251.0 / 255.0, 140.0 / 255.0);

var minusLightDir = vec3.create();
vec3.set(minusLightDir, 0.0, 1.0, 0.0);

function render(context) {
	
	resizeCanvas();
	
	
	gl.viewport(0, 0, canvas.width, canvas.height);
	
	gl.useProgram(context.program);
	
	var projMatLocation = gl.getUniformLocation(context.program, "proj");
	//var viewMatLocation = gl.getUniformLocation(context.program, "view");
	var modelMatLocation = gl.getUniformLocation(context.program, "model");
	var timeFloatLocation = gl.getUniformLocation(context.program, "time");
	var colorVecLocation = gl.getUniformLocation(context.program, "color");
	var minusLightDirVecLocation = gl.getUniformLocation(context.program, "minusLightDir");
	
	var projMat = mat4.create();// = new Perspective(Math.PI * 0.35, canvas.width / canvas.height, 0.1, 1000.0);
	mat4.perspective(projMat, Math.PI * 0.35, canvas.width / canvas.height, 0.1, 1000.0);
	
	var tpColor = vec3.create();
	vec3.lerp(tpColor, tpColorBase, tpColorHot, 0.5);
	
	var camPos = vec3.create();
	camPos[0] = Math.cos(angle) * 100.0;
	camPos[1] = 0.0;
	camPos[2] = Math.sin(angle) * 100.0;
	var up = vec3.create();
	up[1] = 1.0;
	var zero = vec3.create();
	
	var viewMat = mat4.create();
	
	var modelPos = vec3.create();
	modelPos[2] = -50.0;
	modelPos[1] = -15.0;
	var modelMat = mat4.create();
	var tempMat = mat4.create();
	
	mat4.translate(tempMat, mat4.create(), modelPos);
	mat4.rotate(modelMat, tempMat, angle, up);
	
	gl.uniformMatrix4fv(projMatLocation, false, projMat);
	//gl.uniformMatrix4fv(viewMatLocation, false, viewMat);
	gl.uniformMatrix4fv(modelMatLocation, false, modelMat);
	gl.uniform1f(timeFloatLocation, time);
	gl.uniform3fv(colorVecLocation, tpColor);
	gl.uniform3fv(minusLightDirVecLocation, tpColor);
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	bindModel(context.model);
	drawModel(context.model);
	
	//angle += 0.005;
	//time += 0.016;
	if(time > 4.0){
		time = 0.0;
	}
	
	//callback for next frame
	window.setTimeout(function (){
		render(context);
	}, 1000 / 60);
}

function init() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
	gl.disable(gl.CULL_FACE);
	
	loadModel(gl, "models/utah-teapot.json", function(model) {
		
		addFaceNormals(model);
		createModelBufferArrays(model, function(model) {
			
			createProgram(gl, "shaders/test.vs", "shaders/test.fs", function (program){
				
				//set locations of vertex attributes
				gl.bindAttribLocation(program, ATTRIB_POS_LOCATION, "position");
				gl.bindAttribLocation(program, ATTRIB_NORMAL_LOCATION, "normal");
				gl.bindAttribLocation(program, ATTRIB_TNORMAL_LOCATION, "tNormal");
				
				var context = {
					program: program,
					model: model
				};
				
				render(context);
			});
			
		});
	});
}

init();