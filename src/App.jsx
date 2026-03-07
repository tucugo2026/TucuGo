import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc
} from "firebase/firestore";
import { db } from "./firebase";

function formatearServicio(tipo) {
  const valor = String(tipo || "auto").toLowerCase();

  if (valor === "moto") return "🏍 Moto";
  if (valor === "mensajeria") return "📦 Mensajería";
  return "🚗 Auto";
}

export default function App() {
  const [conductores, setConductores] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    dni: "",
    licencia: "",
    vehiculo: "",
    patente: "",
    marca: "",
    modelo: "",
    color: "",
    anio: ""
  });

  async function cargarDatos() {
    const conductoresSnap = await getDocs(collection(db, "conductores"));
    const usuariosSnap = await getDocs(collection(db, "usuarios"));
    const viajesSnap = await getDocs(collection(db, "viajes"));
    const vehiculosSnap = await getDocs(collection(db, "vehiculos"));

    setConductores(conductoresSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setUsuarios(usuariosSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setViajes(viajesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setVehiculos(vehiculosSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cambiarEstadoConductor(id, nuevoEstado) {
    try {
      const ref = doc(db, "conductores", id);
      await updateDoc(ref, { estado: nuevoEstado });
      await cargarDatos();
    } catch (error) {
      console.error("Error actualizando conductor:", error);
      alert("No se pudo actualizar el conductor");
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function registrarConductor(e) {
    e.preventDefault();

    if (
      !form.nombre ||
      !form.telefono ||
      !form.dni ||
      !form.licencia ||
      !form.vehiculo ||
      !form.patente
    ) {
      alert("Completá al menos nombre, teléfono, DNI, licencia, vehículo y patente.");
      return;
    }

    try {
      await addDoc(collection(db, "conductores"), {
        nombre: form.nombre,
        telefono: form.telefono,
        dni: form.dni,
        licencia: form.licencia,
        vehiculo: form.vehiculo,
        patente: form.patente,
        estado: "pendiente",
        fecharegistro: new Date().toISOString().slice(0, 10)
      });

      await addDoc(collection(db, "vehiculos"), {
        conductoresnombre: form.nombre,
        patente: form.patente,
        marca: form.marca || "",
        modelo: form.modelo || "",
        color: form.color || "",
        anio: form.anio || "",
        estado: "activo",
        fecharegistro: new Date().toISOString().slice(0, 10)
      });

      alert("Conductor registrado correctamente");

      setForm({
        nombre: "",
        telefono: "",
        dni: "",
        licencia: "",
        vehiculo: "",
        patente: "",
        marca: "",
        modelo: "",
        color: "",
        anio: ""
      });

      await cargarDatos();
    } catch (error) {
      console.error("Error registrando conductor:", error);
      alert("No se pudo registrar el conductor");
    }
  }

  const pendientes = conductores.filter((c) => c.estado === "pendiente");
  const aprobados = conductores.filter((c) => c.estado === "aprobado");
  const rechazados = conductores.filter((c) => c.estado === "rechazado");

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1>TucuGo Admin</h1>
      <p>TucuGo, tu viaje cerca de vos</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        <div style={boxStyle}>
          <h3>Conductores</h3>
          <p>{conductores.length}</p>
        </div>
        <div style={boxStyle}>
          <h3>Usuarios</h3>
          <p>{usuarios.length}</p>
        </div>
        <div style={boxStyle}>
          <h3>Vehículos</h3>
          <p>{vehiculos.length}</p>
        </div>
        <div style={boxStyle}>
          <h3>Viajes</h3>
          <p>{viajes.length}</p>
        </div>
      </div>

      <h2>Registrar conductor</h2>
      <form onSubmit={registrarConductor} style={formStyle}>
        <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} style={inputStyle} />
        <input name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} style={inputStyle} />
        <input name="dni" placeholder="DNI" value={form.dni} onChange={handleChange} style={inputStyle} />
        <input name="licencia" placeholder="Licencia" value={form.licencia} onChange={handleChange} style={inputStyle} />
        <input name="vehiculo" placeholder="Vehículo" value={form.vehiculo} onChange={handleChange} style={inputStyle} />
        <input name="patente" placeholder="Patente" value={form.patente} onChange={handleChange} style={inputStyle} />
        <input name="marca" placeholder="Marca" value={form.marca} onChange={handleChange} style={inputStyle} />
        <input name="modelo" placeholder="Modelo" value={form.modelo} onChange={handleChange} style={inputStyle} />
        <input name="color" placeholder="Color" value={form.color} onChange={handleChange} style={inputStyle} />
        <input name="anio" placeholder="Año" value={form.anio} onChange={handleChange} style={inputStyle} />

        <button type="submit" style={saveBtn}>
          Guardar conductor
        </button>
      </form>

      <h2>Conductores pendientes</h2>
      {pendientes.length === 0 ? (
        <p>No hay conductores pendientes.</p>
      ) : (
        pendientes.map((c) => (
          <div key={c.id} style={cardStyle}>
            <strong>{c.nombre}</strong><br />
            Teléfono: {c.telefono}<br />
            Estado: {c.estado}<br />
            Vehículo: {c.vehiculo}<br />
            Patente: {c.patente}<br /><br />

            <button onClick={() => cambiarEstadoConductor(c.id, "aprobado")} style={approveBtn}>
              Aprobar
            </button>

            <button onClick={() => cambiarEstadoConductor(c.id, "rechazado")} style={rejectBtn}>
              Rechazar
            </button>
          </div>
        ))
      )}

      <h2>Conductores aprobados</h2>
      {aprobados.length === 0 ? (
        <p>No hay conductores aprobados.</p>
      ) : (
        aprobados.map((c) => (
          <div key={c.id} style={cardStyle}>
            <strong>{c.nombre}</strong><br />
            Teléfono: {c.telefono}<br />
            Estado: {c.estado}<br />
            Vehículo: {c.vehiculo}<br />
            Patente: {c.patente}
          </div>
        ))
      )}

      <h2>Conductores rechazados</h2>
      {rechazados.length === 0 ? (
        <p>No hay conductores rechazados.</p>
      ) : (
        rechazados.map((c) => (
          <div key={c.id} style={cardStyle}>
            <strong>{c.nombre}</strong><br />
            Teléfono: {c.telefono}<br />
            Estado: {c.estado}<br />
            Vehículo: {c.vehiculo}<br />
            Patente: {c.patente}
          </div>
        ))
      )}

      <h2>Usuarios</h2>
      {usuarios.map((u) => (
        <div key={u.id} style={cardStyle}>
          <strong>{u.nombre}</strong><br />
          Email: {u.email}<br />
          Rol: {u.rol}<br />
          Estado: {u.estado}
        </div>
      ))}

      <h2>Vehículos</h2>
      {vehiculos.length === 0 ? (
        <p>No hay vehículos cargados.</p>
      ) : (
        vehiculos.map((v) => (
          <div key={v.id} style={cardStyle}>
            <strong>{v.marca} {v.modelo}</strong><br />
            Patente: {v.patente}<br />
            Color: {v.color}<br />
            Año: {v.anio}<br />
            Estado: {v.estado}
          </div>
        ))
      )}

      <h2>Viajes</h2>
      {viajes.length === 0 ? (
        <p>No hay viajes cargados.</p>
      ) : (
        viajes.map((v) => (
          <div key={v.id} style={cardStyle}>
            <strong>{v.origen} → {v.destino}</strong><br />
            Pasajero: {v.pasajero}<br />
            Conductor: {v.conductor}<br />
            Servicio: {formatearServicio(v.tipoServicio)}<br />
            Estado: {v.estado}<br />
            Pago: {v.metodoPago}<br />
            Precio: ${v.precio}
          </div>
        ))
      )}
    </div>
  );
}

const boxStyle = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "16px",
  background: "#f8fafc",
  textAlign: "center"
};

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "12px",
  marginBottom: "10px",
  background: "#fff"
};

const formStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "10px",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "24px",
  background: "#f8fafc"
};

const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc"
};

const saveBtn = {
  gridColumn: "1 / -1",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "12px 16px",
  borderRadius: "8px",
  cursor: "pointer"
};

const approveBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  marginRight: "8px"
};

const rejectBtn = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer"
};
