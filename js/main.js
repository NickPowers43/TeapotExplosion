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

	
	//load shaders
		
		var program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			return;
		}
		
		success(program);
	});});
}


loadText("models/utah-teapot.json", function(data) {
	
	var model = JSON.parse(data);
	
	var program = createProgram(gl, "shaders/test.vs", "shaders/test.fs", function (program){
		alert("program created successfully");
	});
	
});


