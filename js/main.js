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
		
		var posFloats = model.geometries[0].data.vertices;
		var normalFloats = model.geometries[0].data.normals;
		
		var indices = model.geometries[0].data.faces;
		
		var tIndices = [];
		//convert from QUADS to TRIANGLES format
		for(var i = 0; i < indices.length;)
		{
			var type = indices[i++];
			
			var isQuad = type & 1;
			
			if (isQuad) {
				var a = indices[i++];
				var b = indices[i++];
				var c = indices[i++];
				var d = indices[i++];
				
				tIndices.push(a);
				tIndices.push(b);
				tIndices.push(d);
				
				tIndices.push(d);
				tIndices.push(b);
				tIndices.push(c);
			} else {
				var a = indices[i++];
				var b = indices[i++];
				var c = indices[i++];
				
				tIndices.push(a);
				tIndices.push(b);
				tIndices.push(c);
			}
			
			
			if(type & 2) {
				i++;//skip face material id
			}
			
			if(type & 4) {
				i++;//skip face uv
			}
			
			if(type & 8) {
				//skip face vertex uvs
				if (isQuad) {
					i++;i++;i++;i++;
				} else {
					i++;i++;i++;
				}
			}
			
			if(type & 16) {
				i++;//skip face normal
			}
			
			if(type & 32)
			{
				if (isQuad) {
					var nA = indices[i++];
					var nB = indices[i++];
					var nC = indices[i++];
					var nD = indices[i++];
					
					//tIndices.push(a);
					//tIndices.push(b);
					//tIndices.push(d);
					
					//tIndices.push(d);
					//tIndices.push(b);
					//tIndices.push(c);
				} else {
					var a = indices[i++];
					var b = indices[i++];
					var c = indices[i++];
					
					//tIndices.push(a);
					//tIndices.push(b);
					//tIndices.push(c);
				}
			}
			
			if(type & 64) {
				i++;//skip face color
			}
			
			if(type & 128) {
				//skip face vertex color
				if (isQuad) {
					i++;i++;i++;i++;
				} else {
					i++;i++;i++;
				}
			}
		}
		indices = tIndices;
		
		var interleavedBuffer = [];
		//convert seperate buffers into interleaved buffer
		var j = 0;
		var i = 0;
		for(; i < posFloats.length;) {
			interleavedBuffer.push(posFloats[i++]);
			interleavedBuffer.push(posFloats[i++]);
			interleavedBuffer.push(posFloats[i++]);
			interleavedBuffer.push(normalFloats[j++]);
			interleavedBuffer.push(normalFloats[j++]);
			interleavedBuffer.push(normalFloats[j++]);
			interleavedBuffer.push(0.0);
			interleavedBuffer.push(0.0);
			interleavedBuffer.push(0.0);
		}
		
		var vb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vb);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(interleavedBuffer), gl.STATIC_DRAW);
		
		var ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
		
		success({
			vb: vb,
			ib: ib,
			indexCount: indices.length
		});
	});
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

function render(context) {
	
	resizeCanvas();
	
	
	gl.viewport(0, 0, canvas.width, canvas.height);
	
	gl.useProgram(context.program);
	
	var projMat = new Perspective(Math.PI * 0.35, canvas.width / canvas.height, 0.1, 1000.0);
	var projMatLocation = gl.getUniformLocation(context.program, "proj");
	gl.uniformMatrix4fv(projMatLocation, false, projMat.vals);
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	bindModel(context.model);
	gl.drawElements(gl.TRIANGLES, context.model.indexCount, gl.UNSIGNED_SHORT, 0);
	//gl.drawArrays(gl.TRIANGLES, 0, 3);
	
	
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
}

init();