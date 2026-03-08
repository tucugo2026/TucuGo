# Modelos iniciales

## usuarios
```json
{
  "id": "uid",
  "nombre": "Marcelo",
  "apellido": "Palavecino",
  "telefono": "+549...",
  "email": "",
  "rol": "pasajero|conductor|admin",
  "estado": "activo|bloqueado|pendiente",
  "creadoEn": "timestamp"
}
```

## conductores
```json
{
  "userId": "uid",
  "dni": "",
  "licenciaNumero": "",
  "licenciaVencimiento": "",
  "seguro": "",
  "cedula": "",
  "patente": "",
  "marca": "",
  "modelo": "",
  "color": "",
  "estadoValidacion": "pendiente|aprobado|rechazado",
  "observacionesAdmin": ""
}
```

## viajes
```json
{
  "pasajeroId": "",
  "conductorId": "",
  "origenTexto": "",
  "destinoTexto": "",
  "estado": "solicitado|aceptado|en_camino|iniciado|finalizado|cancelado",
  "costoEstimado": 0,
  "costoFinal": 0,
  "metodoPago": "efectivo|transferencia|tarjeta",
  "fechaHora": "timestamp"
}
```
