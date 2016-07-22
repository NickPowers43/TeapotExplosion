//main.js

//Get GL context
var canvas = document.getElementById("canvas")
var gl = canvas.getContext("webgl");

var SHADER_TYPE_NAME_MAP = {};
SHADER_TYPE_NAME_MAP[gl.VERTEX_SHADER] = "vertex";
SHADER_TYPE_NAME_MAP[gl.FRAGMENT_SHADER] = "fragment";

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

//
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
* Loads a model in a format 
*/
function loadModel(gl, path, success) {

	loadText(path, function(data) {
		
		var model = JSON.parse(data);
		
		var customModel = {
			vertices: model.geometries[0].data.vertices,
			indices: model.geometries[0].data.faces
		}
		
		customModel.vb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, customModel.vb);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(customModel.vertices), gl.STATIC_DRAW);
		
		customModel.ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, customModel.ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(customModel.vertices), gl.STATIC_DRAW);
		
		customModel.bind = function() {
			gl.bindBuffer(gl.ARRAY_BUFFER, self.vb);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.ib);
		};
		
		success(customModel);
	});
}

loadModel(gl, "models/utah-teapot.json", function(model) {

	var program = createProgram(gl, "shaders/test.vs", "shaders/test.fs", function (program){
		
		gl.useProgram(program);
		
		alert("program created successfully");
	});
	
	
	
});

init = function() {=
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
};

init();