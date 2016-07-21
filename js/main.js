//main.js

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
		
		createSuccess(shader);
	}
	
	loadText(sourcePath, loadSuccess);
}