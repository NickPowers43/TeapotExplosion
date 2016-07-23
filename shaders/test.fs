precision mediump float;

uniform vec3 color;
uniform vec3 minusLightDir;

varying vec3 normal_;

void main() {
	float lightIntensity = max(dot(normal_, minusLightDir), 0.0);
    gl_FragColor = vec4(color * lightIntensity, 1.0);
}
