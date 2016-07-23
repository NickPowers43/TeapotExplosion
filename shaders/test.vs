
uniform mat4 proj;
//uniform mat4 view;
uniform mat4 model;

uniform float time;

attribute vec3 position;
attribute vec3 normal;
attribute vec3 tNormal;

varying vec3 normal_;

void main() {
	
	normal_ = normal;
	
	vec3 worldPos = vec3(model * vec4(position, 1.0));
	
	worldPos = worldPos + (tNormal * time * 50.0);
	
	worldPos.y += -9.81 * time * time;
	
    gl_Position = proj * vec4(worldPos, 1.0);
}  
