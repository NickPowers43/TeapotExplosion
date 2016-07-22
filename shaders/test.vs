
uniform mat4 proj;

attribute vec3 position;
attribute vec3 normal;
attribute vec3 tNormal;

varying vec3 normal_;

void main() {
	
	normal_ = normal;
	
	vec3 posFinal = position + (tNormal * 0.00001);
	
    gl_Position = vec4(posFinal + vec3(0.0, 0.0, -200.0), 1.0) * proj;
}  
