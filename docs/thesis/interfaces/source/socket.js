const handlers=new Map();
function create(){return {connected:true,id:'illustration',sendBuffer:[],receiveBuffer:[],on(event,fn){handlers.set(event,fn);return this},once(){return this},off(){return this},emit(){return this},timeout(){return this},connect(){return this},disconnect(){return this},removeAllListeners(){return this},io:{on(){},off(){},opts:{}},auth:{}}}
export const io=create;
export default create;
