export const vertexShader = `attribute float size;varying vec3 vColor;varying float vTw;uniform float time;void main(){vColor=color;vec3 pos=position;pos.z+=time*8.;if(pos.z>25000.)pos.z-=50000.;vec4 mv=modelViewMatrix*vec4(pos,1.);float tw=sin(time*2.+position.x*.1+position.y*.2)*.4+.9;vTw=tw;gl_PointSize=size*tw*(1200./-mv.z);gl_Position=projectionMatrix*mv;}`;

export const fragmentShader = `varying vec3 vColor;void main(){vec2 c=2.*gl_PointCoord-1.;float r=dot(c,c);if(r>1.)discard;gl_FragColor=vec4(vColor,exp(-r*2.)*1.4);}`;
