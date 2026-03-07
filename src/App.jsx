import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";

export default function App() {
  const [conductores, setConductores] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [filtroServicio, setFiltroServicio] = useState("todos");

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

  const [viajeForm, setViajeForm] = useState({
    pasajero: "",
    origen: "",
    destino: "",
    tipoServicio: "auto",
    metodoPago: "Efectivo",
    conductor: "Sin asignar"
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

  async function actualizarEstadoConductorPorNombre(nombreConductor, nuevoEstado) {
    if (!nombreConductor || nombreConductor === "Sin asignar") return;

    const conductorEncontrado = conductores.find((c) => c.nombre === nombreConductor);
    if (!conductorEncontrado) return;

    const ref = doc(db, "conductores", conductorEncontrado.id);
    await updateDoc(ref, { estado: nuevoEstado });
  }

  async function cambiarEstadoViaje(viaje, nuevoEstado) {
    try {
      const ref = doc(db, "viajes", viaje.id);
      await updateDoc(ref, { estado: nuevoEstado });

      if (nuevoEstado === "aceptado" || nuevoEstado === "en_viaje") {
        await actualizarEstadoConductorPorNombre(viaje.conductor, "ocupado");
      }

      if (nuevoEstado === "finalizado" || nuevoEstado === "cancelado") {
        await actualizarEstadoConductorPorNombre(viaje.conductor, "aprobado");
      }

      await cargarDatos();
    } catch (error) {
      console.error("Error actualizando viaje:", error);
      alert("No se pudo actualizar el estado del viaje");
    }
  }

  function obtenerServicioLabel(tipoServicio) {
    if (tipoServicio === "moto") return "🏍 Moto";
    if (tipoServicio === "mensajeria") return "📦 Mensajería";
    return "🚗 Auto";
  }

  function obtenerPrecioServicio(tipoServicio) {
    if (tipoServicio === "moto") return 900;
    if (tipoServicio === "mensajeria") return 1200;
    return 1500;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleViajeChange(e) {
    const { name, value } = e.target;
    setViajeForm((prev) => ({
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

  async function crearViajeRapido(e) {
    e.preventDefault();

    if (!viajeForm.pasajero || !viajeForm.origen || !viajeForm.destino) {
      alert("Completá pasajero, origen y destino.");
      return;
    }

    const precio = obtenerPrecioServicio(viajeForm.tipoServicio);
    const ahora = new Date();

    try {
      await addDoc(collection(db, "viajes"), {
        pasajero: viajeForm.pasajero,
        origen: viajeForm.origen,
        destino: viajeForm.destino,
        conductor: viajeForm.conductor || "Sin asignar",
        metodoPago: viajeForm.metodoPago,
        tipoServicio: viajeForm.tipoServicio,
        precio,
        estado: "solicitado",
        hora: ahora.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit"
        }),
        fecha: Timestamp.fromDate(ahora)
      });

      alert("Viaje creado correctamente");

      setViajeForm({
        pasajero: "",
        origen: "",
        destino: "",
        tipoServicio: "auto",
        metodoPago: "Efectivo",
        conductor: "Sin asignar"
      });

      await cargarDatos();
    } catch (error) {
      console.error("Error creando viaje:", error);
      alert("No se pudo crear el viaje");
    }
  }

  function ordenarPorFechaDesc(lista) {
    return [...lista].sort((a, b) => {
      const fechaA = a.fecha?.seconds ? a.fecha.seconds : 0;
      const fechaB = b.fecha?.seconds ? b.fecha.seconds : 0;
      return fechaB - fechaA;
    });
  }

  function pasaFiltroServicio(v) {
    if (filtroServicio === "todos") return true;
    return v.tipoServicio === filtroServicio;
  }

  const conductoresDisponibles = conductores.filter((c) => c.estado === "aprobado");
  const conductoresOcupados = conductores.filter((c) => c.estado === "ocupado");
  const conductoresPendientes = conductores.filter((c) => c.estado === "pendiente");
  const conductoresRechazados = conductores.filter((c) => c.estado === "rechazado");

  const conductoresAprobados = conductoresDisponibles;

  const viajesSolicitados = ordenarPorFechaDesc(
    viajes.filter((v) => v.estado === "solicitado" && pasaFiltroServicio(v))
  );
  const viajesEnCurso = ordenarPorFechaDesc(
    viajes.filter((v) => (v.estado === "aceptado" || v.estado === "en_viaje") && pasaFiltroServicio(v))
  );
  const viajesFinalizados = ordenarPorFechaDesc(
    viajes.filter((v) => v.estado === "finalizado" && pasaFiltroServicio(v))
  );
  const viajesCancelados = ordenarPorFechaDesc(
    viajes.filter((v) => v.estado === "cancelado" && pasaFiltroServicio(v))
  );

  function renderViaje(v) {
    return (
      <div key={v.id} style={cardStyle}>
        <strong>{v.origen} → {v.destino}</strong><br />
        Pasajero: {v.pasajero}<br />
        Conductor: {v.conductor}<br />
        Servicio: {obtenerServicioLabel(v.tipoServicio)}<br />
        Estado: {v.estado}<br />
        Pago: {v.metodoPago}<br />
        Precio: ${Number(v.precio || 0).toLocaleString("es-AR")}
        {v.hora ? (
          <>
            <br />
            Hora: {v.hora}
          </>
        ) : null}

        <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {v.estado === "solicitado" && (
            <>
              <button onClick={() => cambiarEstadoViaje(v, "aceptado")} style={approveBtn}>
                Aceptar
              </button>
              <button onClick={() => cambiarEstadoViaje(v, "cancelado")} style={rejectBtn}>
                Cancelar
              </button>
            </>
          )}

          {v.estado === "aceptado" && (
            <>
              <button onClick={() => cambiarEstadoViaje(v, "en_viaje")} style={startBtn}>
                Iniciar viaje
              </button>
              <button onClick={() => cambiarEstadoViaje(v, "cancelado")} style={rejectBtn}>
                Cancelar
              </button>
            </>
          )}

          {v.estado === "en_viaje" && (
            <button onClick={() => cambiarEstadoViaje(v, "finalizado")} style={finishBtn}>
              Finalizar
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderConductor(c, tipo) {
    return (
      <div key={c.id} style={cardStyle}>
        <strong>{c.nombre}</strong><br />
        Teléfono: {c.telefono}<br />
        Vehículo: {c.vehiculo}<br />
        Patente: {c.patente}<br />
        Estado: {tipo}
      </div>
    );
  }

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

      <h2>Crear viaje rápido</h2>
      <form onSubmit={crearViajeRapido} style={formStyle}>
        <input
          name="pasajero"
          placeholder="Pasajero"
          value={viajeForm.pasajero}
          onChange={handleViajeChange}
          style={inputStyle}
        />
        <input
          name="origen"
          placeholder="Origen"
          value={viajeForm.origen}
          onChange={handleViajeChange}
          style={inputStyle}
        />
        <input
          name="destino"
          placeholder="Destino"
          value={viajeForm.destino}
          onChange={handleViajeChange}
          style={inputStyle}
        />

        <select
          name="tipoServicio"
          value={viajeForm.tipoServicio}
          onChange={handleViajeChange}
          style={inputStyle}
        >
          <option value="auto">🚗 Auto</option>
          <option value="moto">🏍 Moto</option>
          <option value="mensajeria">📦 Mensajería</option>
        </select>

        <select
          name="metodoPago"
          value={viajeForm.metodoPago}
          onChange={handleViajeChange}
          style={inputStyle}
        >
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Tarjeta">Tarjeta</option>
        </select>

        <select
          name="conductor"
          value={viajeForm.conductor}
          onChange={handleViajeChange}
          style={inputStyle}
        >
          <option value="Sin asignar">Sin asignar</option>
          {conductoresAprobados.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>

        <div style={priceBoxStyle}>
          Precio automático: <strong>${obtenerPrecioServicio(viajeForm.tipoServicio).toLocaleString("es-AR")}</strong>
        </div>

        <button type="submit" style={saveBtn}>
          Crear viaje
        </button>
      </form>

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

      <h2 style={sectionTitleAvailable}>🟢 Conductores disponibles</h2>
      {conductoresDisponibles.length === 0 ? (
        <p>No hay conductores disponibles.</p>
      ) : (
        conductoresDisponibles.map((c) => renderConductor(c, "Disponible"))
      )}

      <h2 style={sectionTitleBusy}>🔵 Conductores ocupados</h2>
      {conductoresOcupados.length === 0 ? (
        <p>No hay conductores ocupados.</p>
      ) : (
        conductoresOcupados.map((c) => renderConductor(c, "Ocupado"))
      )}

      <h2 style={sectionTitlePending}>🟡 Conductores pendientes</h2>
      {conductoresPendientes.length === 0 ? (
        <p>No hay conductores pendientes.</p>
      ) : (
        conductoresPendientes.map((c) => (
          <div key={c.id} style={cardStyle}>
            <strong>{c.nombre}</strong><br />
            Teléfono: {c.telefono}<br />
            Vehículo: {c.vehiculo}<br />
            Patente: {c.patente}<br />
            Estado: Pendiente<br /><br />

            <button onClick={() => cambiarEstadoConductor(c.id, "aprobado")} style={approveBtn}>
              Aprobar
            </button>

            <button onClick={() => cambiarEstadoConductor(c.id, "rechazado")} style={rejectBtn}>
              Rechazar
            </button>
          </div>
        ))
      )}

      <h2 style={sectionTitleRejected}>🔴 Conductores rechazados</h2>
      {conductoresRechazados.length === 0 ? (
        <p>No hay conductores rechazados.</p>
      ) : (
        conductoresRechazados.map((c) => renderConductor(c, "Rechazado"))
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

      <div style={filterBarStyle}>
        <span style={{ fontWeight: "bold" }}>Mostrar:</span>

        <button
          type="button"
          style={filtroServicio === "todos" ? activeFilterBtn : filterBtn}
          onClick={() => setFiltroServicio("todos")}
        >
          Todos
        </button>

        <button
          type="button"
          style={filtroServicio === "auto" ? activeFilterBtn : filterBtn}
          onClick={() => setFiltroServicio("auto")}
        >
          🚗 Auto
        </button>

        <button
          type="button"
          style={filtroServicio === "moto" ? activeFilterBtn : filterBtn}
          onClick={() => setFiltroServicio("moto")}
        >
          🏍 Moto
        </button>

        <button
          type="button"
          style={filtroServicio === "mensajeria" ? activeFilterBtn : filterBtn}
          onClick={() => setFiltroServicio("mensajeria")}
        >
          📦 Mensajería
        </button>
      </div>

      <h2 style={sectionTitleYellow}>🟡 Viajes solicitados</h2>
      {viajesSolicitados.length === 0 ? (
        <p>No hay viajes solicitados.</p>
      ) : (
        viajesSolicitados.map(renderViaje)
      )}

      <h2 style={sectionTitleBlue}>🔵 Viajes en curso</h2>
      {viajesEnCurso.length === 0 ? (
        <p>No hay viajes en curso.</p>
      ) : (
        viajesEnCurso.map(renderViaje)
      )}

      <h2 style={sectionTitleGreen}>🟢 Viajes finalizados</h2>
      {viajesFinalizados.length === 0 ? (
        <p>No hay viajes finalizados.</p>
      ) : (
        viajesFinalizados.map(renderViaje)
      )}

      <h2 style={sectionTitleRed}>🔴 Viajes cancelados</h2>
      {viajesCancelados.length === 0 ? (
        <p>No hay viajes cancelados.</p>
      ) : (
        viajesCancelados.map(renderViaje)
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

const priceBoxStyle = {
  gridColumn: "1 / -1",
  padding: "12px",
  borderRadius: "8px",
  background: "#e0f2fe",
  border: "1px solid #bae6fd"
};

const filterBarStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
  marginTop: "24px",
  marginBottom: "16px"
};

const filterBtn = {
  background: "#f3f4f6",
  color: "#111827",
  border: "1px solid #d1d5db",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer"
};

const activeFilterBtn = {
  background: "#2563eb",
  color: "#fff",
  border: "1px solid #2563eb",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer"
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

const startBtn = {
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer"
};

const finishBtn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer"
};

const sectionTitleYellow = {
  background: "#fef3c7",
  padding: "10px 14px",
  borderRadius: "10px"
};

const sectionTitleBlue = {
  background: "#dbeafe",
  padding: "10px 14px",
  borderRadius: "10px"
};

const sectionTitleGreen = {
  background: "#dcfce7",
  padding: "10px 14px",
  borderRadius: "10px"
};

const sectionTitleRed = {
  background: "#fee2e2",
  padding: "10px 14px",
  borderRadius: "10px"
};

const sectionTitleAvailable = {
  background: "#dcfce7",
  padding: "10px 14px",
  borderRadius: "10px"
};

const sectionTitleBusy = {
  background: "#dbeafe",
  padding: "10px 14px",
  borderRadius: "10px"
};

const sectionTitlePending = {
  background: "#fef3c7",
  padding: "10px 14px",
  borderRadius: "10px"
};

const sectionTitleRejected = {
  background: "#fee2e2",
  padding: "10px 14px",
  borderRadius: "10px"
};