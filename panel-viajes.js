import { db } from "./firebase-config.js";
import {
collection,
onSnapshot,
doc,
updateDoc,
getDocs,
query,
where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const col = {
solicitado: document.getElementById("solicitado"),
aceptado: document.getElementById("aceptado"),
en_viaje: document.getElementById("en_viaje"),
finalizado: document.getElementById("finalizado"),
cancelado: document.getElementById("cancelado")
};

const viajesRef = collection(db,"viajes");
const conductoresRef = collection(db,"conductores");

function limpiar(){
Object.values(col).forEach(c=>c.innerHTML="");
}

async function conductorDisponible(){
const q=query(conductoresRef,where("estado","==","disponible"));
const snap=await getDocs(q);
if(snap.empty) return null;
return {id:snap.docs[0].id,...snap.docs[0].data()};
}

async function aceptar(v){
const c=await conductorDisponible();
if(!c){alert("Sin conductores disponibles");return;}
await updateDoc(doc(db,"viajes",v.id),{
estado:"aceptado",
conductorId:c.id,
conductorNombre:c.nombre
});
await updateDoc(doc(db,"conductores",c.id),{estado:"ocupado"});
}

async function iniciar(v){
await updateDoc(doc(db,"viajes",v.id),{estado:"en_viaje"});
}

async function finalizar(v){
await updateDoc(doc(db,"viajes",v.id),{estado:"finalizado"});
if(v.conductorId){
await updateDoc(doc(db,"conductores",v.conductorId),{estado:"disponible"});
}
}

async function cancelar(v){
await updateDoc(doc(db,"viajes",v.id),{estado:"cancelado"});
if(v.conductorId){
await updateDoc(doc(db,"conductores",v.conductorId),{estado:"disponible"});
}
}

function card(v){
const d=document.createElement("div");
d.className="card "+v.estado;
d.innerHTML=`
<b>${v.origen} → ${v.destino}</b>
<div class="dato">Pasajero: ${v.pasajeroNombre||"-"}</div>
<div class="dato">Conductor: ${v.conductorNombre||"Sin asignar"}</div>
<div class="dato">Pago: ${v.metodoPago||"-"}</div>
<div class="dato">Precio: $${v.precio||0}</div>
`;

const acc=document.createElement("div");
acc.className="acciones";

if(v.estado==="solicitado"){
const b=document.createElement("button");
b.textContent="Aceptar";
b.className="aceptar";
b.onclick=()=>aceptar(v);
acc.appendChild(b);

const c=document.createElement("button");
c.textContent="Cancelar";
c.className="cancelar";
c.onclick=()=>cancelar(v);
acc.appendChild(c);
}

if(v.estado==="aceptado"){
const b=document.createElement("button");
b.textContent="Iniciar";
b.className="iniciar";
b.onclick=()=>iniciar(v);
acc.appendChild(b);
}

if(v.estado==="en_viaje"){
const b=document.createElement("button");
b.textContent="Finalizar";
b.className="finalizar";
b.onclick=()=>finalizar(v);
acc.appendChild(b);
}

if(acc.children.length>0)d.appendChild(acc);

return d;
}

onSnapshot(viajesRef,(snap)=>{
limpiar();
snap.docs.forEach(docu=>{
const v={id:docu.id,...docu.data()};
const c=col[v.estado||"solicitado"];
if(c)c.appendChild(card(v));
});
});
