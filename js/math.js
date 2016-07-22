
function Mat4(){
	this.vals = new Float32Array(16);
	this.set = function(row, col, val) {
		this.vals[(col * 4) + row] = val;
	}
	if(arguments.length==1) {
		for(var i = 0; i < 4; i++) {
			this.set(i, i, arguments[0]);
		}
	} else {
		for(var i = 0; i < 4; i++) {
			this.set(i, i, 1.0);
		}
	}
	
}

function Perspective(fieldOfViewYInRadians, aspect, zNear, zFar) {
	var output = new Mat4();
	
	var scale = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
    var rangeInv = 1.0 / (zNear - zFar);
	
	//diagonal
	output.set(0,0, scale / aspect);
	output.set(1,1, scale);
	output.set(2,2, (zNear * zFar) * rangeInv);
	output.set(3,3, 0.0);
	
	output.set(3,2, -1.0);
	output.set(2,3, zNear * zFar * rangeInv * 2.0);
	
	return output;
}