precision mediump float;

varying vec3 normal_;

void main() {
    gl_FragColor = vec4(normal_, 1.0);
}
